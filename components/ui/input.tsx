import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("w-full rounded-xl border border-white/10 bg-[#08172f] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[#526b8c] focus:border-[#4ca6ff] focus:ring-2 focus:ring-[#163a68]", className)} {...props} />; }
