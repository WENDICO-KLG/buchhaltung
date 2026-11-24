import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, text, action, className }: { icon: LucideIcon; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}><span aria-hidden className="user-avatar !h-12 !w-12 !text-[var(--muted)]"><Icon size={20} strokeWidth={1.6} /></span><p className="mt-4 text-base font-semibold text-[var(--ink)]">{title}</p>{text && <p className="mt-1.5 max-w-sm text-sm text-[var(--muted)]">{text}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
