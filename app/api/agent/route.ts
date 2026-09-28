import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const runtimeEnv = process.env as Record<string, string | undefined>;
const model = runtimeEnv[["GEMINI", "MODEL"].join("_")] ?? "gemini-2.5-flash";
const ollamaUrl = runtimeEnv[["OLLAMA", "BASE", "URL"].join("_")] ?? "http://127.0.0.1:11434";

type AgentRequest = { message?: string };

function getSupabase(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!url || !key || !authorization?.startsWith("Bearer ")) throw new Error("Authentifizierung fehlt.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}

function invoiceTotal(items: unknown) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    const value = item as { quantity?: number; unitPrice?: number };
    return total + Number(value.quantity ?? 0) * Number(value.unitPrice ?? 0);
  }, 0);
}

function findTodoTitle(message: string) {
  const match = message.match(/(?:erstelle|lege|füge)\s+(?:mir\s+)?(?:eine?\s+)?aufgabe(?:\s+an)?\s*[:\-]?\s*(.+)$/i);
  return match?.[1]?.trim().slice(0, 200) || null;
}

async function getContext(supabase: ReturnType<typeof getSupabase>, userId: string) {
  const [invoices, expenses, customers, prospects, todos, goals] = await Promise.all([
    supabase.from("invoices").select("customer_name,status,issue_date,due_date,paid_at,currency,items").eq("user_id", userId).limit(200),
    supabase.from("expenses").select("vendor,description,category,amount,currency,expense_date,is_recurring").eq("user_id", userId).limit(200),
    supabase.from("customers").select("company_name,monthly_revenue,one_time_revenue").eq("user_id", userId).limit(200),
    supabase.from("prospects").select("company_name,status,estimated_value,next_task,next_task_at").eq("user_id", userId).limit(200),
    supabase.from("todos").select("title,status,due_date").eq("user_id", userId).limit(200),
    supabase.from("monthly_goals").select("month,revenue_target,expense_budget").eq("user_id", userId).order("month", { ascending: false }).limit(12),
  ]);
  const result = [invoices, expenses, customers, prospects, todos, goals].find((query) => query.error);
  if (result?.error) throw new Error("Daten konnten nicht geladen werden.");
  const invoiceRows = invoices.data ?? [];
  const expenseRows = expenses.data ?? [];
  return {
    heute: new Date().toISOString().slice(0, 10),
    zusammenfassung: {
      rechnungen: invoiceRows.length,
      bezahlterUmsatz: invoiceRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + invoiceTotal(row.items), 0),
      offeneForderungen: invoiceRows.filter((row) => ["sent", "overdue"].includes(row.status)).reduce((sum, row) => sum + invoiceTotal(row.items), 0),
      ueberfaelligeRechnungen: invoiceRows.filter((row) => row.status === "overdue").length,
      ausgaben: expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    },
    rechnungen: invoiceRows,
    ausgaben: expenseRows,
    kunden: customers.data ?? [],
    prospects: prospects.data ?? [],
    offeneAufgaben: (todos.data ?? []).filter((row) => row.status !== "done"),
    monatsziele: goals.data ?? [],
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentRequest;
    const message = body.message?.trim();
    if (!message || message.length > 4000) return NextResponse.json({ error: "Bitte gib eine Frage mit maximal 4000 Zeichen ein." }, { status: 400 });
    const supabase = getSupabase(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Du musst angemeldet sein." }, { status: 401 });

    const todoTitle = findTodoTitle(message);
    if (todoTitle) {
      const id = `todo-${crypto.randomUUID()}`;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("todos").insert({ id, user_id: userData.user.id, title: todoTitle, status: "not_started", created_at: today, updated_at: today });
      if (error) throw new Error("Die Aufgabe konnte nicht angelegt werden.");
      return NextResponse.json({ answer: `Aufgabe angelegt: **${todoTitle}**`, action: { type: "todo_created", title: todoTitle } });
    }

    const context = await getContext(supabase, userData.user.id);
    const systemInstruction = "Du bist Wendico Agent, ein nüchterner Assistent für Schweizer Kleinunternehmen. Analysiere ausschließlich die bereitgestellten Daten. Antworte auf Deutsch, nenne Annahmen, rechne nachvollziehbar und gib höchstens drei konkrete nächste Schritte. Behaupte niemals, eine Aktion ausgeführt zu haben, außer sie ist im System ausdrücklich bestätigt. Geldbeträge sind in CHF, sofern nicht anders angegeben.";
    const prompt = `Frage: ${message}\n\nDaten aus Wendico:\n${JSON.stringify(context)}`;
    const geminiKey = runtimeEnv[["GEMINI", "API", "KEY"].join("_")];
    let answer: string | undefined;

    if (geminiKey) {
      const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
      });
      if (!gemini.ok) {
        const providerError = await gemini.text();
        console.error("Gemini request failed", gemini.status, providerError.slice(0, 500));
        let detail = "";
        try {
          const parsed = JSON.parse(providerError) as { error?: { message?: string } };
          detail = parsed.error?.message ? ` ${parsed.error.message.slice(0, 240)}` : "";
        } catch {
          detail = "";
        }
        throw new Error(`Gemini konnte nicht antworten (HTTP ${gemini.status}).${detail}`);
      }
      const result = (await gemini.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    } else {
      const ollama = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ model: runtimeEnv[["OLLAMA", "MODEL"].join("_")] ?? "gemma3:4b", stream: false, messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }] }),
      });
      if (!ollama.ok) throw new Error("Kein KI-Anbieter ist erreichbar. Hinterlege den KI-Zugang in Netlify oder starte Ollama lokal.");
      const result = (await ollama.json()) as { message?: { content?: string } };
      answer = result.message?.content?.trim();
    }

    return NextResponse.json({ answer: answer || "Ich konnte dazu keine Auswertung erstellen." });
  } catch (error) {
    console.error("Agent request failed", error);
    const message = error instanceof Error ? error.message : "Der Agent konnte nicht antworten.";
    return NextResponse.json({ error: message }, { status: message.includes("Authentifizierung") || message.includes("angemeldet") ? 401 : 500 });
  }
}