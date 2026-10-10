import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { readAgentBody } from "@/lib/agent-security";

const runtimeEnv = process.env as Record<string, string | undefined>;
const model = runtimeEnv[["GEMINI", "MODEL"].join("_")] ?? "gemini-3.8-flash";
const ollamaUrl = runtimeEnv[["OLLAMA", "BASE", "URL"].join("_")] ?? "http://127.0.0.1:11434";

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
    datenbasis: "Maximal 200 Datensätze je Bereich; möglicherweise unvollständig. Keine personenbezogenen Detaildaten.",
    waehrungen: [...new Set([...invoiceRows, ...expenseRows].map((row) => row.currency))],
    kunden: { anzahl: customers.data?.length ?? 0, wiederkehrenderUmsatz: (customers.data ?? []).reduce((sum, row) => sum + Number(row.monthly_revenue ?? 0), 0) },
    prospects: { anzahl: prospects.data?.length ?? 0, geschaetzterWert: (prospects.data ?? []).reduce((sum, row) => sum + Number(row.estimated_value ?? 0), 0) },
    offeneAufgaben: (todos.data ?? []).filter((row) => row.status !== "done").length,
    monatsziele: goals.data ?? [],
  };
}

export async function POST(request: Request) {
  let limiter: ReturnType<typeof getSupabase> | undefined;
  let lease: string | undefined;
  try {
    const supabase = getSupabase(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Du musst angemeldet sein." }, { status: 401 });
    let body: Awaited<ReturnType<typeof readAgentBody>>;
    try { body = await readAgentBody(request); }
    catch (error) { return NextResponse.json({ error: "Ungültige Anfrage. Maximal 4000 Zeichen und 20 KB JSON." }, { status: error instanceof Error && error.message === "body_too_large" ? 413 : 400 }); }
    const message = body.message;

    const { data: companies, error: companyError } = await supabase.rpc("my_companies");
    if (companyError) throw new Error("Die Firmen konnten nicht geladen werden. Bitte pruefe die Firmen-Migration.");
    const memberships = (companies ?? []) as Array<{ company_id: string; role: string }>;
    const company = body.companyId ? memberships.find((membership) => membership.company_id === body.companyId) : memberships[0];
    if (!company) return NextResponse.json({ error: "Kein Zugriff auf diese Firma." }, { status: 403 });

    const serviceKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Der AI-Dienst ist noch nicht sicher konfiguriert." }, { status: 503 });
    limiter = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: reservation, error: limitError } = await limiter.rpc("acquire_agent_request", { company: company.company_id, actor: userData.user.id });
    if (limitError) return NextResponse.json({ error: "Die Sicherheitskonfiguration des AI-Dienstes ist nicht verfügbar." }, { status: 503 });
    if (!reservation) return NextResponse.json({ error: "Anfragenlimit erreicht. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": "60" } });
    lease = reservation as string;

    const todoTitle = findTodoTitle(message);
    if (todoTitle) {
      if (company.role === "viewer") return NextResponse.json({ error: "Du hast nur Leserechte in dieser Firma." }, { status: 403 });
      const id = `todo-${crypto.randomUUID()}`;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("todos").insert({ id, user_id: company.company_id, title: todoTitle, status: "not_started", created_at: today, updated_at: today });
      if (error) throw new Error("Die Aufgabe konnte nicht angelegt werden.");
      return NextResponse.json({ answer: `Aufgabe angelegt: **${todoTitle}**`, action: { type: "todo_created", title: todoTitle } });
    }

    const approvedCompanies = (runtimeEnv.AI_APPROVED_COMPANY_IDS ?? "").split(",").map((id) => id.trim());
    if (!approvedCompanies.includes(company.company_id)) return NextResponse.json({ error: "AI-Auswertungen sind für diese Firma noch nicht freigegeben." }, { status: 403 });
    const context = await getContext(supabase, company.company_id);
    const systemInstruction = "Du bist Wendico Agent, ein nüchterner Assistent für Schweizer Kleinunternehmen. Analysiere ausschließlich die bereitgestellten Daten. Antworte auf Deutsch, nenne Annahmen, rechne nachvollziehbar und gib höchstens drei konkrete nächste Schritte. Behaupte niemals, eine Aktion ausgeführt zu haben, außer sie ist im System ausdrücklich bestätigt. Geldbeträge sind in CHF, sofern nicht anders angegeben.";
    const prompt = `Frage: ${message}\n\nDaten aus Wendico:\n${JSON.stringify(context)}`;
    const geminiKey = runtimeEnv[["GEMINI", "API", "KEY"].join("_")];
    const groqKey = runtimeEnv[["GROQ", "API", "KEY"].join("_")];
    let answer: string | undefined;

    if (geminiKey && !groqKey) {
      const requestBody = JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      });
      let gemini = new Response(null, { status: 500 });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
          signal: AbortSignal.timeout(45000),
          body: requestBody,
        });
        if (![429, 500, 502, 503, 504].includes(gemini.status) || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
      if (!gemini.ok) {
        console.error("Gemini request failed", gemini.status);
        if ([429, 500, 502, 503, 504].includes(gemini.status) && groqKey) {
          const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
              model: runtimeEnv[["GROQ", "MODEL"].join("_")] ?? "llama-3.3-70b-versatile",
              temperature: 0.2,
              max_tokens: 1200,
              messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
            }),
          });
          if (groq.ok) {
            const result = (await groq.json()) as { choices?: Array<{ message?: { content?: string } }> };
            answer = result.choices?.[0]?.message?.content?.trim();
          } else {
            console.error("Groq fallback failed", groq.status);
          }
        }
        if (answer) return NextResponse.json({ answer });
        throw new Error(`Gemini konnte nicht antworten (HTTP ${gemini.status}).`);
      }
      const result = (await gemini.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    } else if (groqKey) {
      const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: runtimeEnv[["GROQ", "MODEL"].join("_")] ?? "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 1200,
          messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
        }),
      });
      if (!groq.ok) {
        console.error("Groq request failed", groq.status);
        throw new Error(`Der alternative KI-Anbieter konnte nicht antworten (HTTP ${groq.status}). Prüfe den Groq-Key und das Modell in Netlify.`);
      }
      const result = (await groq.json()) as { choices?: Array<{ message?: { content?: string } }> };
      answer = result.choices?.[0]?.message?.content?.trim();
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
    const unauthorized = error instanceof Error && error.message.includes("Authentifizierung");
    console.error("Agent request failed", unauthorized ? "unauthorized" : "request_failed");
    return NextResponse.json({ error: unauthorized ? "Du musst angemeldet sein." : "Der Agent konnte nicht antworten. Bitte später erneut versuchen." }, { status: unauthorized ? 401 : 500 });
  } finally {
    if (limiter && lease) {
      try { await limiter.rpc("release_agent_request", { lease }); } catch { console.error("Agent lease release failed"); }
    }
  }
}