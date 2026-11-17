import { supabase } from "./supabase";
import { defaultCategories } from "./defaults";
import type { Category, Data, Tx, IconName } from "./types";

export interface Backend {
  load(): Promise<Data>;
  upsertCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addTx(t: Tx[]): Promise<void>;
  removeTx(id: string): Promise<void>;
}

const LS_KEY = "tostao:v1";

export function localBackend(): Backend {
  const read = (): Data => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as Data;
    } catch {}
    return { categories: defaultCategories(), transactions: [] };
  };
  const write = (d: Data) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
  };
  return {
    async load() {
      const d = read();
      write(d);
      return d;
    },
    async upsertCategory(c) {
      const d = read();
      const i = d.categories.findIndex((x) => x.id === c.id);
      if (i >= 0) d.categories[i] = c; else d.categories.push(c);
      write(d);
    },
    async deleteCategory(id) {
      const d = read();
      d.categories = d.categories.filter((c) => c.id !== id);
      d.transactions = d.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t));
      write(d);
    },
    async addTx(t) {
      const d = read();
      d.transactions.push(...t);
      write(d);
    },
    async removeTx(id) {
      const d = read();
      d.transactions = d.transactions.filter((t) => t.id !== id);
      write(d);
    },
  };
}

interface CatRow { id: string; name: string; icon: string; limit_cents: number; sort: number }
interface TxRow {
  id: string; type: "expense" | "income"; amount_cents: number; category_id: string | null;
  note: string | null; date: string; source: "manual" | "print";
}

export function cloudBackend(): Backend {
  const sb = supabase!;
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };
  return {
    async load() {
      const [c, t] = await Promise.all([
        sb.from("categories").select("*").order("sort"),
        sb.from("transactions").select("*").order("date", { ascending: false }).limit(5000),
      ]);
      fail(c.error); fail(t.error);
      let categories: Category[] = ((c.data ?? []) as CatRow[]).map((r) => ({
        id: r.id, name: r.name, icon: r.icon as IconName, limitCents: r.limit_cents, sort: r.sort,
      }));
      if (categories.length === 0) {
        categories = defaultCategories();
        const ins = await sb.from("categories").insert(
          categories.map((x) => ({ id: x.id, name: x.name, icon: x.icon, limit_cents: x.limitCents, sort: x.sort })),
        );
        fail(ins.error);
      }
      const transactions: Tx[] = ((t.data ?? []) as TxRow[]).map((r) => ({
        id: r.id, type: r.type, amountCents: r.amount_cents, categoryId: r.category_id,
        note: r.note ?? "", date: r.date, source: r.source,
      }));
      return { categories, transactions };
    },
    async upsertCategory(c) {
      const { error } = await sb.from("categories").upsert({
        id: c.id, name: c.name, icon: c.icon, limit_cents: c.limitCents, sort: c.sort,
      });
      fail(error);
    },
    async deleteCategory(id) {
      const { error } = await sb.from("categories").delete().eq("id", id);
      fail(error);
    },
    async addTx(list) {
      const { error } = await sb.from("transactions").insert(
        list.map((x) => ({
          id: x.id, type: x.type, amount_cents: x.amountCents, category_id: x.categoryId,
          note: x.note, date: x.date, source: x.source,
        })),
      );
      fail(error);
    },
    async removeTx(id) {
      const { error } = await sb.from("transactions").delete().eq("id", id);
      fail(error);
    },
  };
}
