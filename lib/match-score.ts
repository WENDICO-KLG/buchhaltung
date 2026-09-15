import type { ApplicationCategory, CVType } from "@/types";

const keywords: Record<ApplicationCategory, string[]> = {
  software: ["software", "developer", "engineer", "frontend", "backend", "typescript", "javascript", "react", "coding", "data", "tech"],
  sales: ["sales", "account", "customer", "revenue", "business development", "partnership", "commercial"],
  business: ["business", "product", "operations", "strategy", "manager", "growth", "project"],
  finance: ["finance", "financial", "analyst", "accounting", "risk", "investment", "controller"],
  banking: ["bank", "banking", "wealth", "credit", "risk", "investment", "finance"],
  consulting: ["consulting", "consultant", "strategy", "analyst", "transformation", "client"],
  other: [],
};

const cvCategories: Record<CVType, ApplicationCategory[]> = { developer: ["software"], sales: ["sales", "business", "consulting"], finance: ["finance", "banking"], other: ["other"] };

export function calculateMatchScore(input: { position: string; category: ApplicationCategory; cvType?: CVType; jobDescription?: string }) {
  const text = `${input.position} ${input.jobDescription ?? ""}`.toLowerCase();
  const categoryTerms = keywords[input.category];
  const matchedTerms = categoryTerms.filter((term) => text.includes(term)).length;
  const keywordScore = categoryTerms.length ? Math.min(35, Math.round((matchedTerms / Math.min(categoryTerms.length, 5)) * 35)) : 15;
  const categoryScore = input.cvType && cvCategories[input.cvType]?.includes(input.category) ? 30 : input.cvType ? 12 : 20;
  const detailScore = input.jobDescription?.trim().length ? 20 : 8;
  const positionScore = input.position.trim().length >= 8 ? 15 : 8;
  return Math.min(100, Math.max(0, keywordScore + categoryScore + detailScore + positionScore));
}
