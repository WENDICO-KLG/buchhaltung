import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return <header className={cn("flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", className)}>
    <div className="min-w-0"><h1 className="text-[2.125rem] leading-[1.1] text-[var(--ink)] md:text-[2.75rem]">{title}</h1>{subtitle && <p className="mt-2 max-w-prose text-base text-[var(--muted)]">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2 lg:flex-none lg:justify-end">{actions}</div>}
  </header>;
}
