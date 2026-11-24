import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "primary",
  secondary: "action",
  ghost: "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-[var(--ink)]",
  danger: "bg-[var(--coral-soft)] text-[var(--coral)] hover:brightness-110",
};

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 min-h-11 rounded-[.7rem] px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], className)} {...props} />;
}
