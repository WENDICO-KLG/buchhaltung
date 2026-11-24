import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div className="panel w-full max-w-md rounded-2xl p-8 text-center"><p className="display text-6xl text-[var(--ink)]">404</p><h1 className="mt-4 text-xl text-[var(--ink)]">Seite nicht gefunden</h1><p className="mt-3 text-sm text-[var(--muted)]">Die Seite wurde verschoben oder der Link ist nicht mehr aktuell.</p><Link href="/dashboard" className="primary mt-7"><ArrowLeft size={16} />Zur Übersicht</Link></div></main>;
}
