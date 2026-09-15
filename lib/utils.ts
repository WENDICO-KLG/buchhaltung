import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusLabels = {
  saved: "Gespeichert",
  preparing: "In Vorbereitung",
  applied: "Beworben",
  interview: "Vorstellungsgespräch",
  final_interview: "Finales Gespräch",
  offer: "Angebot",
  rejected: "Abgelehnt",
  withdrawn: "Zurückgezogen",
} as const;