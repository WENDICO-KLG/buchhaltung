import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("inline-flex items-center rounded-md bg-[var(--emerald-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--emerald)]", className)} {...props} />; }
