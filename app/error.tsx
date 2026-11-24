"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application error", error); }, [error]);
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div className="panel w-full max-w-md rounded-2xl p-8 text-center"><AlertTriangle size={26} strokeWidth={1.5} aria-hidden className="mx-auto text-[var(--coral)]" /><h1 className="mt-4 text-xl text-[var(--ink)]">Etwas ist schiefgegangen</h1><p className="mt-3 text-sm text-[var(--muted)]">Die Buchhaltungsansicht konnte nicht geladen werden. Deine Daten wurden nicht verändert.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={() => reset()} className="primary"><RotateCcw size={16} />Erneut versuchen</button><Link href="/dashboard" className="action">Übersicht</Link></div></div></main>;
}
