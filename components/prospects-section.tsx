import Link from "next/link";
import { ContactRound, GraduationCap, Lightbulb, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs = [
  { href: "/prospects", label: "Pipeline", icon: ContactRound },
  { href: "/prospects/training", label: "Training", icon: GraduationCap },
  { href: "/prospects/script", label: "Spickzettel", icon: ScrollText },
] as const;

export function ProspectsTabs({ current }: { current: (typeof tabs)[number]["href"] }) {
  return <nav aria-label="Bereiche im Vertrieb" className="mb-7 flex gap-1 overflow-x-auto border-b border-[var(--line)]">
    {tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${href === current ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><Icon size={16} className={href === current ? "text-[var(--primary)]" : undefined}/>{label}</Link>)}
  </nav>;
}

export function Callout({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flex items-center gap-4 rounded-2xl bg-[var(--accent)] px-5 py-4">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--paper)]"><Icon size={21}/></span>
    <div className="min-w-0"><p className="font-semibold leading-snug">{title}</p><p className="mt-0.5 text-sm opacity-80">{text}</p></div>
  </div>;
}

export function Tip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`flex gap-2 text-sm text-[var(--muted)] ${className}`}><Lightbulb size={16} className="mt-0.5 shrink-0 text-[var(--primary)]"/><span><strong className="font-semibold text-[var(--ink)]">Tipp:</strong> {children}</span></p>;
}
