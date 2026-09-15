import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("inline-flex items-center rounded-full border border-[#245d58] bg-[#0d2c32] px-2.5 py-1 text-[11px] font-semibold text-[#8de1c2]", className)} {...props} />; }
