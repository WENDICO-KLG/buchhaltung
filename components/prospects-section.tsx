import Link from "next/link";
import { ContactRound, FileSpreadsheet, GraduationCap, Lightbulb, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs = [
  { href: "/prospects", label: "Pipeline", icon: ContactRound },
  { href: "/prospects/training", label: "Training", icon: GraduationCap },
  { href: "/prospects/script", label: "Spickzettel", icon: ScrollText },
  { href: "/prospects/sheet", label: "Tabelle", icon: FileSpreadsheet },
] as const;

export function ProspectsTabs({ current }: { current: (typeof tabs)[number]["href"] }) {
  return <nav aria-label="Bereiche im Vertrieb" className="pill-track mb-7 w-fit md:mb-9">
    {tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined} className={`${href === current ? "filter-active" : "filter"} focus-visible:outline-offset-[-2px] max-sm:px-3`}><Icon aria-hidden size={15} strokeWidth={1.6} className="hidden sm:block"/>{label}</Link>)}
  </nav>;
}

export function Callout({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flex items-start gap-4">
    <span aria-hidden className="user-avatar"><Icon size={18} strokeWidth={1.6} className="text-[var(--muted)]"/></span>
    <div className="min-w-0 pt-0.5"><p className="text-base font-semibold leading-snug">{title}</p><p className="mt-1 max-w-prose text-sm text-[var(--muted)]">{text}</p></div>
  </div>;
}

export function Tip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`flex gap-2 text-sm text-[var(--muted)] ${className}`}><Lightbulb aria-hidden size={15} strokeWidth={1.6} className="mt-0.5 shrink-0"/><span><strong className="font-medium text-[var(--ink)]">Tipp:</strong> {children}</span></p>;
}
