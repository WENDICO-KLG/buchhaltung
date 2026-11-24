import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneColor, type Tone } from "@/components/ui/tone";

export function Status({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium", className)} style={{ color: toneColor[tone] }}><span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-current" />{children}</span>;
}
