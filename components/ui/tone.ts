export type Tone = "neutral" | "info" | "gold" | "positive" | "negative";

/** Text-safe colour per tone (AA on plates in both themes). */
export const toneColor: Record<Tone, string> = {
  neutral: "var(--muted)",
  info: "var(--ink)",
  gold: "var(--gold)",
  positive: "var(--emerald)",
  negative: "var(--coral)",
};
