import type { Prospect } from "@/types";

const fold = (value: string) => value.normalize("NFC").toLocaleLowerCase("de-CH");
/** 079 …, +41 79 … and 0041 79 … are the same number. */
const phoneDigits = (value: string) => value.replace(/\D/g, "").replace(/^(0041|41|0)/, "");
// Marked digits, so that ordinary word searches never hit the bare number.
const markDigits = (digits: string) => digits.replace(/\d/g, "\u0000$&");

export const hasMessage = (prospect: Pick<Prospect, "message">) => Boolean(prospect.message?.trim());

/** Everything the search looks at, prepared once per prospect. */
export function prospectSearchText({ companyName, contactName, email, phone, message }: Prospect) {
  return fold([companyName, contactName, email, phone, phone && markDigits(phoneDigits(phone)), message].filter(Boolean).join("\n"));
}

/** All words must occur; a phone number also matches regardless of its notation. */
export function prospectMatcher(query: string) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const digits = /^[\d\s+()/.-]+$/.test(query.trim()) ? phoneDigits(query) : "";
  return (text: string) => terms.every((term) => text.includes(term)) || (digits.length >= 5 && text.includes(markDigits(digits)));
}
