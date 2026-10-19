export type SocialMediaOrder = {
  id: string;
  title: string;
  postUrl: string;
  serviceDate: string;
  amount: number;
  paidAt: string | null;
};

export type SocialMediaOrderInput = Omit<SocialMediaOrder, "id" | "paidAt">;

export function validateSocialMediaOrder(input: SocialMediaOrderInput) {
  if (!input.title.trim() || input.title.trim().length > 200) throw new Error("Bitte einen Auftrag mit maximal 200 Zeichen eingeben.");
  let url: URL;
  try { url = new URL(input.postUrl); } catch { throw new Error("Bitte einen gültigen Post-Link eingeben."); }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || input.postUrl.length > 2048 || /\s/.test(input.postUrl)) throw new Error("Bitte einen gültigen HTTP- oder HTTPS-Link eingeben.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate) || input.serviceDate < "1900-01-01" || !Number.isFinite(Date.parse(input.serviceDate)) || new Date(input.serviceDate).toISOString().slice(0, 10) !== input.serviceDate) throw new Error("Bitte ein gültiges Leistungsdatum eingeben.");
  if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 9999999.99 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.000001) throw new Error("Bitte einen Preis zwischen 0 und 9'999'999.99 CHF mit maximal zwei Nachkommastellen eingeben.");
}

export function socialMediaMonthSummary(orders: SocialMediaOrder[], month: string) {
  const entries = orders.filter((order) => order.serviceDate.slice(0, 7) === month);
  const totalCents = entries.reduce((sum, order) => sum + Math.round(order.amount * 100), 0);
  const paidCents = entries.reduce((sum, order) => sum + (order.paidAt ? Math.round(order.amount * 100) : 0), 0);
  return { count: entries.length, total: totalCents / 100, paid: paidCents / 100, open: (totalCents - paidCents) / 100 };
}