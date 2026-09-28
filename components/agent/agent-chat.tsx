"use client";

import { FormEvent, useState } from "react";
import { Bot, CheckCircle2, LoaderCircle, Send, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ChatMessage = { role: "user" | "agent"; content: string };

const starters = [
  "Wie steht es aktuell um Umsatz, Ausgaben und offene Forderungen?",
  "Welche drei nächsten Schritte sind für unser Unternehmen am wichtigsten?",
  "Wo sehe ich bei unseren Ausgaben das grösste Sparpotenzial?",
];

function Answer({ content }: { content: string }) {
  return <div className="whitespace-pre-wrap text-sm leading-7">{content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</div>;
}

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const message = (preset ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }) });
      const result = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Der Agent konnte nicht antworten.");
      setMessages((current) => [...current, { role: "agent", content: result.answer || "Keine Antwort erhalten." }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Agent konnte nicht antworten.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="grid min-h-[calc(100vh-10rem)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
    <div className="border-b border-[var(--line)] px-5 py-5 sm:px-7"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--primary)]"><Bot size={21}/></span><div><p className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">Wendico Agent <span className="rounded-full bg-[#d1fadf] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#05603a]">Lokal</span></p><p className="mt-1 text-xs text-[var(--muted)]">Analysiert deine Wendico-Daten und hilft bei den nächsten Schritten.</p></div></div></div>
    <div className="overflow-y-auto px-5 py-6 sm:px-7">
      {!messages.length && <div className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center sm:py-14"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]"><Sparkles size={25}/></span><h1 className="mt-5 text-2xl font-semibold text-[var(--ink)]">Was soll ich für dich analysieren?</h1><p className="mt-2 max-w-lg text-sm text-[var(--muted)]">Ich kann Kennzahlen auswerten, Auffälligkeiten erklären und konkrete nächste Schritte vorschlagen.</p><div className="mt-8 grid w-full gap-2 text-left sm:grid-cols-3">{starters.map((starter) => <button key={starter} onClick={() => void sendMessage(undefined, starter)} className="rounded-lg border border-[var(--line)] p-3 text-left text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-soft)]">{starter}</button>)}</div></div>}
      <div className="mx-auto max-w-3xl space-y-5">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><span className={`mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-md ${message.role === "user" ? "bg-[var(--accent)] text-[var(--primary)]" : "bg-[#d1fadf] text-[#05603a]"}`}>{message.role === "user" ? <UserRound size={14}/> : <Bot size={14}/>}</span><div className={`max-w-[min(85%,42rem)] rounded-xl px-4 py-3 ${message.role === "user" ? "bg-[var(--accent)] text-[var(--ink)]" : "bg-[var(--surface-soft)] text-[var(--ink)]"}`}>{message.role === "agent" ? <Answer content={message.content}/> : <p className="text-sm leading-6">{message.content}</p>}</div></div>)}{loading && <div className="flex items-center gap-3 text-sm text-[var(--muted)]"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#d1fadf] text-[#05603a]"><Bot size={14}/></span><span className="flex items-center gap-2">Analysiert <LoaderCircle size={15} className="animate-spin"/></span></div>}</div>
    </div>
    <div className="border-t border-[var(--line)] px-5 py-4 sm:px-7"><div className="mx-auto max-w-3xl">{error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-[#fda29b] bg-[#fee4e2] px-3 py-2 text-xs text-[#b42318]"><CheckCircle2 size={15} className="mt-0.5 rotate-45"/>{error}</div>}<form onSubmit={sendMessage} className="flex items-end gap-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Frage zu deinen Daten oder: Erstelle eine Aufgabe: ..." rows={2} maxLength={4000} className="field min-h-12 resize-none"/><button type="submit" disabled={loading || !input.trim()} aria-label="Nachricht senden" title="Nachricht senden" className="primary h-12 w-12 flex-none p-0 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17}/></button></form><p className="mt-2 text-[11px] text-[var(--muted)]">Enter senden · Shift + Enter für eine neue Zeile · Antworten werden lokal mit Ollama erstellt.</p></div></div>
  </section>;
}