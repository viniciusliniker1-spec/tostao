"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { summarize } from "@/lib/calc";
import { moodFor, reactionFor, type Mood } from "@/lib/mood";
import { brlParts } from "@/lib/money";
import { monthKey, monthLabel, shiftMonth } from "@/lib/dates";
import type { Tx, TxType } from "@/lib/types";
import { Gauge } from "./Gauge";
import { Icon } from "./Icon";
import { AddSheet } from "./AddSheet";
import { ScanSheet } from "./ScanSheet";
import { Login } from "./Login";
import { CategoryList, ListView, RecentList, SettingsView, TipsView } from "./Views";

type Tab = "home" | "list" | "tips" | "settings";

export function Shell() {
  const store = useStore();
  const { data, ready, mode, session } = store;
  const [tab, setTab] = useState<Tab>("home");
  const [month, setMonth] = useState(monthKey());
  const [sheet, setSheet] = useState<null | { kind: "add"; type: TxType } | { kind: "scan" }>(null);
  const [react, setReact] = useState<{ mood: Mood; text: string } | null>(null);
  const [bump, setBump] = useState(0);
  const [idle, setIdle] = useState(false);
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const s = useMemo(() => summarize(data, month), [data, month]);
  const cats = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const seed = useMemo(() => Math.floor(Date.now() / 3_600_000) + s.txs.length, [s.txs.length]);
  const base = useMemo(() => moodFor(s, seed), [s, seed]);

  // sonolento depois de um tempo parado
  useEffect(() => {
    let t = setTimeout(() => setIdle(true), 30_000);
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 30_000); };
    window.addEventListener("pointerdown", wake);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", wake); };
  }, []);

  const flash = useCallback((r: { mood: Mood; text: string }) => {
    setReact(r);
    setBump((b) => b + 1);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = setTimeout(() => setReact(null), 5000);
  }, []);

  const add = useCallback(async (list: Omit<Tx, "id">[]) => {
    const before = summarize(data, month);
    const added = await store.addTx(list);
    const after = summarize({ ...data, transactions: [...data.transactions, ...added] }, month);
    const expenses = added.filter((t) => t.type === "expense");
    if (expenses.length === 0) { flash({ mood: "happy", text: "Receita anotada! Isso eu gosto." }); return; }
    const total = expenses.reduce((a, t) => a + t.amountCents, 0);
    const newlyOver = after.byCat.some((c) => c.over && !before.byCat.find((b) => b.cat.id === c.cat.id)?.over);
    flash(reactionFor(total, after, newlyOver));
  }, [data, month, store, flash]);

  if (!ready) return <div className="splash"><span className="muted">Carregando…</span></div>;
  if (mode === "cloud" && !session) return <Login />;

  const mood: Mood = react?.mood ?? (idle ? "sleepy" : base.mood);
  const text = react?.text ?? (idle ? "Zzz… me acorda quando for gastar." : base.text);
  const { int, dec } = brlParts(s.remaining);
  const over = s.budget > 0 && s.remaining < 0;
  const paceLabel = { empty: "Mês limpo", ok: "No ritmo", fast: "Acelerado", over: "Acima do teto" }[s.pace];
  const monthNav = (
    <header className="topbar">
      <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="left" size={18} /></button>
      <span className="month">{monthLabel(month)}</span>
      <button className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="right" size={18} /></button>
    </header>
  );

  return (
    <div className="app">
      {tab !== "settings" && monthNav}
      {tab === "settings" && <header className="topbar"><span className="month">Ajustes</span></header>}

      <main className="content">
        {tab === "home" && (
          <>
            <div className="bubble" key={text}>{text}</div>
            <Gauge remaining={s.budget > 0 ? s.remaining / s.budget : 1} over={over} mood={mood} bump={bump} />
            <div className="hero">
              <span className="muted small">{over ? "Passou do teto" : "Pode gastar"}</span>
              <div className="big"><span>{int}</span><small>{dec}</small></div>
              {s.budget > 0 && (
                <p className="muted small">de {brlParts(s.budget).int} · {s.daysLeft} {s.daysLeft === 1 ? "dia" : "dias"}{s.daysLeft > 0 && !over ? ` · ${brlParts(Math.round(s.perDay)).int}/dia` : ""}</p>
              )}
              <span className={`pill ${s.pace}`}>{s.pace === "ok" || s.pace === "empty" ? <Icon name="check" size={13} /> : null}{paceLabel}</span>
            </div>
            <div className="actions">
              <button onClick={() => setSheet({ kind: "add", type: "expense" })}><span><Icon name="minus" /></span>Gasto</button>
              <button onClick={() => setSheet({ kind: "add", type: "income" })}><span><Icon name="plus" /></span>Receita</button>
              <button onClick={() => setSheet({ kind: "scan" })}><span className="hl"><Icon name="camera" /></span>Print</button>
              <button onClick={() => setTab("settings")}><span><Icon name="sliders" /></span>Limites</button>
            </div>
            <div className="stack">
              <CategoryList s={s} />
              <RecentList s={s} cats={cats} onAll={() => setTab("list")} />
            </div>
          </>
        )}
        {tab === "list" && <ListView s={s} cats={cats} onRemove={(id) => void store.removeTx(id)} />}
        {tab === "tips" && <TipsView data={data} s={s} getToken={store.getToken} mood={base.mood} mode={mode} />}
        {tab === "settings" && (
          <SettingsView cats={data.categories} onSave={store.saveCategory} onDelete={store.deleteCategory}
            onSignOut={() => void store.signOut()} email={session?.user.email ?? null} mode={mode} error={store.error} />
        )}
      </main>

      <nav className="nav">
        <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")} aria-label="Início"><Icon name="home" /></button>
        <button className={tab === "list" ? "on" : ""} onClick={() => setTab("list")} aria-label="Lançamentos"><Icon name="list" /></button>
        <button className="fab" onClick={() => setSheet({ kind: "add", type: "expense" })} aria-label="Novo lançamento"><Icon name="plus" size={24} /></button>
        <button className={tab === "tips" ? "on" : ""} onClick={() => setTab("tips")} aria-label="Dicas"><Icon name="bulb" /></button>
        <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")} aria-label="Ajustes"><Icon name="sliders" /></button>
      </nav>

      {sheet?.kind === "add" && (
        <AddSheet categories={[...data.categories].sort((a, b) => a.sort - b.sort)} initialType={sheet.type}
          onSave={(t) => add([t])} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "scan" && (
        <ScanSheet categories={[...data.categories].sort((a, b) => a.sort - b.sort)} existing={data.transactions}
          getToken={store.getToken} onSave={add} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
