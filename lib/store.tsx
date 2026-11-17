"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { cloudBackend, localBackend, type Backend } from "./backends";
import type { Category, Data, Tx } from "./types";

interface Ctx {
  ready: boolean;
  mode: "cloud" | "local";
  session: Session | null;
  data: Data;
  error: string | null;
  addTx(list: Omit<Tx, "id">[]): Promise<Tx[]>;
  removeTx(id: string): Promise<void>;
  saveCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  getToken(): Promise<string | null>;
}

const C = createContext<Ctx | null>(null);
const EMPTY: Data = { categories: [], transactions: [] };

export function useStore(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useStore fora do provider");
  return v;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const mode: Ctx["mode"] = supabase ? "cloud" : "local";
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(mode === "local");
  const [data, setData] = useState<Data>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backend = useRef<Backend | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!authChecked) return;
    if (mode === "cloud" && !userId) {
      backend.current = null;
      setData(EMPTY);
      setReady(true);
      return;
    }
    const b = mode === "cloud" ? cloudBackend() : localBackend();
    backend.current = b;
    setReady(false);
    b.load()
      .then((d) => { setData(d); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setReady(true));
  }, [authChecked, mode, userId]);

  const run = useCallback(async (fn: (b: Backend) => Promise<void>) => {
    if (!backend.current) return;
    try {
      await fn(backend.current);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready, mode, session, data, error,
    async addTx(list) {
      const full: Tx[] = list.map((t) => ({ ...t, id: crypto.randomUUID() }));
      await run((b) => b.addTx(full));
      setData((d) => ({ ...d, transactions: [...d.transactions, ...full] }));
      return full;
    },
    async removeTx(id) {
      await run((b) => b.removeTx(id));
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    },
    async saveCategory(c) {
      await run((b) => b.upsertCategory(c));
      setData((d) => {
        const has = d.categories.some((x) => x.id === c.id);
        return { ...d, categories: has ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c] };
      });
    },
    async deleteCategory(id) {
      await run((b) => b.deleteCategory(id));
      setData((d) => ({
        categories: d.categories.filter((c) => c.id !== id),
        transactions: d.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
      }));
    },
    async signIn(email, password) {
      if (!supabase) return null;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    async signUp(email, password) {
      if (!supabase) return null;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return error.message;
      if (!data.session) return "Conta criada. Confirme o e-mail e entre.";
      return null;
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
    },
    async getToken() {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  }), [ready, mode, session, data, error, run]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
