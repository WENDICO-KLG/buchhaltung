import { all, create } from "mathjs";
import type { FunctionNode } from "mathjs";

const math = create(all, {});
const functions = new Set(["sqrt", "abs", "sin", "cos", "tan", "asin", "acos", "atan", "log", "log10", "exp", "round", "floor", "ceil", "factorial"]);

export function calculateExpression(input: string): number {
  if (!input.trim() || input.length > 300) throw new Error("Bitte einen gültigen Ausdruck eingeben (maximal 300 Zeichen).");
  const normalized = input.replace(/[’']/g, "").replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  const node = math.parse(normalized);
  node.traverse((child) => {
    if (!["OperatorNode", "ConstantNode", "ParenthesisNode", "FunctionNode", "SymbolNode"].includes(child.type)) throw new Error("Dieser Ausdruck ist nicht erlaubt.");
    if (child.type === "SymbolNode" && !functions.has(child.toString()) && !["pi", "e"].includes(child.toString())) throw new Error("Unbekannte Funktion.");
    if (child.type === "FunctionNode" && !functions.has((child as FunctionNode).fn.name ?? "")) throw new Error("Unbekannte Funktion.");
    if (child.type === "OperatorNode" && !["+", "-", "*", "/", "^", "%", "!"].includes(child.toString().match(/[+*/^%!\-]/)?.[0] ?? "")) throw new Error("Unbekannte Operation.");
  });
  const result: unknown = node.compile().evaluate();
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("Das Ergebnis ist keine endliche reelle Zahl.");
  return result;
}

export type CommissionInput = { customer_id: string; member_id?: string | null; amount: number | string; payment_date?: string | null };
export function commissionBreakdown(customers: CommissionInput[], from: string, to: string, member = "all") {
  const closes = new Map<string, number>();
  for (const customer of customers) {
    if (customer.member_id && customer.payment_date && Number(customer.amount) > 0) {
      const key = `${customer.member_id}:${customer.payment_date.slice(0, 7)}`;
      closes.set(key, (closes.get(key) ?? 0) + 1);
    }
  }
  return customers.filter((customer) => customer.payment_date && customer.payment_date >= from && customer.payment_date <= to && (member === "all" || customer.member_id === member)).map((customer) => {
    const count = closes.get(`${customer.member_id}:${customer.payment_date!.slice(0, 7)}`) ?? 0;
    const base = customer.member_id ? Math.round(Number(customer.amount) * 10) / 100 : 0;
    const bonus = count >= 3 ? Math.round(base * 50) / 100 : 0;
    return { ...customer, closes: count, base, bonus, total: Math.round((base + bonus) * 100) / 100 };
  });
}