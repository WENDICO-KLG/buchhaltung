import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-[#328dff] to-[#55c9ff] text-[#061022] shadow-[0_0_24px_rgba(76,166,255,.18)] hover:brightness-110",
  secondary: "border border-white/10 bg-white/[.06] text-[#dcecff] hover:bg-white/[.1]",
  ghost: "text-[#8292ae] hover:bg-white/[.06] hover:text-white",
  danger: "border border-[#6e3340] bg-[#24131e] text-[#ffaaa0] hover:bg-[#3a1b29]",
};

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], className)} {...props} />;
}
