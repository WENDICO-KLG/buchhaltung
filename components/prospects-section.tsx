import Link from "next/link";
import { ContactRound, FileSpreadsheet, GraduationCap, Lightbulb, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs = [
  { href: "/prospects", label: "Pipeline", icon: ContactRound },
  { href: "/prospects/training", label: "Training", icon: GraduationCap },
  { href: "/prospects/script", label: "Spickzettel", icon: ScrollText },
  { href: "/prospects/sheet", label: "Tabelle", icon: FileSpreadsheet },
] as const;

// The bottom line is an inset shadow so the active underline covers it without overflowing the scroll container.
export function ProspectsTabs({ current }: { current: (typeof tabs)[number]["href"] }) {
  return <nav aria-label="Bereiche im Vertrieb" className="mb-8 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--line)] [scrollbar-width:none] md:mb-10 [&::-webkit-scrollbar]:hidden">
    {tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-offset-[-2px] sm:px-4 ${href === current ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><Icon aria-hidden size={16} strokeWidth={1.7} className="hidden sm:block"/>{label}</Link>)}
  </nav>;
}

export function Callout({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flex items-start gap-4 border-t border-[var(--hairline)] pt-4">
    <Icon aria-hidden size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--muted)]"/>
    <div className="min-w-0"><p className="text-lg font-semibold leading-snug">{title}</p><p className="mt-1 max-w-prose text-[var(--muted)]">{text}</p></div>
  </div>;
}

export function Tip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`flex gap-2 text-sm text-[var(--muted)] ${className}`}><Lightbulb aria-hidden size={16} strokeWidth={1.7} className="mt-0.5 shrink-0"/><span><strong className="font-semibold text-[var(--ink)]">Tipp:</strong> {children}</span></p>;
}
