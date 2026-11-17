import type { Category, Data, Tx } from "./types";
import { daysInMonth, monthKey } from "./dates";

export interface CatSummary {
  cat: Category;
  spent: number;
  limit: number;
  pct: number; // 0..n (1 = 100%)
  over: boolean;
}

export interface Summary {
  month: string;
  txs: Tx[];
  budget: number;
  spentTotal: number;
  income: number;
  remaining: number;
  daysLeft: number;
  perDay: number;
  elapsed: number; // 0..1
  pace: "empty" | "ok" | "fast" | "over";
  byCat: CatSummary[];
  anyCatOver: boolean;
}

export function summarize(data: Data, month: string, now = new Date()): Summary {
  const txs = data.transactions
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const dim = daysInMonth(month);
  const cur = monthKey(now);
  let elapsed = 1;
  let daysLeft = 0;
  if (month === cur) {
    elapsed = now.getDate() / dim;
    daysLeft = dim - now.getDate() + 1;
  } else if (month > cur) {
    elapsed = 0;
    daysLeft = dim;
  }

  const spentBy = new Map<string, number>();
  let spentTotal = 0;
  let income = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amountCents;
    else {
      spentTotal += t.amountCents;
      if (t.categoryId) spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amountCents);
    }
  }

  const cats = [...data.categories].sort((a, b) => a.sort - b.sort);
  const byCat: CatSummary[] = cats.map((cat) => {
    const spent = spentBy.get(cat.id) ?? 0;
    const limit = cat.limitCents;
    return { cat, spent, limit, pct: limit > 0 ? spent / limit : 0, over: limit > 0 && spent > limit };
  });

  const limited = byCat.filter((c) => c.limit > 0);
  const budget = limited.reduce((s, c) => s + c.limit, 0);
  // todo gasto desconta do total, tenha a categoria limite ou não
  const remaining = budget - spentTotal;
  const perDay = daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0;

  let pace: Summary["pace"] = "ok";
  if (budget > 0) {
    if (spentTotal <= 0) pace = "empty";
    else if (spentTotal > budget) pace = "over";
    else if (spentTotal > budget * elapsed * 1.15 + budget * 0.03) pace = "fast";
  } else if (spentTotal === 0) pace = "empty";

  return {
    month, txs, budget, spentTotal, income, remaining, daysLeft, perDay, elapsed,
    pace, byCat, anyCatOver: byCat.some((c) => c.over),
  };
}
