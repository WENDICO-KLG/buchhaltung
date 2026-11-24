import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "primary",
  secondary: "action",
  ghost: "text-[var(--muted)] hover:text-[var(--ink)]",
  danger: "action !text-[var(--coral)]",
};

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50", variants[variant], className)} {...props} />;
}
