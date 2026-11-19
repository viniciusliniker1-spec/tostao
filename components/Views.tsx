"use client";

import { useMemo, useState } from "react";
import type { Category, Data, IconName, Tx } from "@/lib/types";
import type { Summary } from "@/lib/calc";
import { brl, parseToCents } from "@/lib/money";
import { dayLabel } from "@/lib/dates";
import { buildAiSummary, localTips, type Tip } from "@/lib/tips";
import { Icon, CATEGORY_ICONS } from "./Icon";
import { Mascot } from "./Mascot";
import type { Mood } from "@/lib/mood";

export function CategoryList({ s }: { s: Summary }) {
  const rows = s.byCat.filter((c) => c.limit > 0 || c.spent > 0);
  if (rows.length === 0) return null;
  return (
    <section className="card">
      <h3>Limites do mês</h3>
      <ul className="cats">
        {rows.map(({ cat, spent, limit, pct, over }) => (
          <li key={cat.id}>
            <span className="c-i"><Icon name={cat.icon} size={18} /></span>
            <div className="c-main">
              <div className="c-row">
                <b>{cat.name}</b>
                <span className={over ? "neg" : ""}>{limit > 0 ? `${brl(spent)} de ${brl(limit)}` : brl(spent)}</span>
              </div>
              {limit > 0 && (
                <div className="bar"><i className={over ? "over" : pct > 0.8 ? "warn" : ""} style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TxRow({ t, cats, onRemove }: { t: Tx; cats: Map<string, Category>; onRemove?: (id: string) => void }) {
  const c = t.categoryId ? cats.get(t.categoryId) : undefined;
  return (
    <li className="tx">
      <span className="c-i"><Icon name={t.type === "income" ? "plus" : c?.icon ?? "dots"} size={18} /></span>
      <div className="tx-main">
        <b>{t.note || c?.name || (t.type === "income" ? "Receita" : "Gasto")}</b>
        <span className="muted small">{c?.name ?? (t.type === "income" ? "Receita" : "Sem categoria")}{t.source === "print" ? " · print" : ""}</span>
      </div>
      <span className={t.type === "income" ? "pos" : ""}>{t.type === "income" ? "+" : "-"}{brl(t.amountCents)}</span>
      {onRemove && <button className="icon-btn" aria-label="Apagar" onClick={() => onRemove(t.id)}><Icon name="trash" size={16} /></button>}
    </li>
  );
}

export function RecentList({ s, cats, onAll }: { s: Summary; cats: Map<string, Category>; onAll: () => void }) {
  if (s.txs.length === 0) return null;
  return (
    <section className="card">
      <div className="c-row"><h3>Últimos lançamentos</h3><button className="link" onClick={onAll}>Ver todos</button></div>
      <ul className="txs">{s.txs.slice(0, 5).map((t) => <TxRow key={t.id} t={t} cats={cats} />)}</ul>
    </section>
  );
}

export function ListView({ s, cats, onRemove }: { s: Summary; cats: Map<string, Category>; onRemove: (id: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of s.txs) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return [...m.entries()];
  }, [s.txs]);
  if (groups.length === 0) return <p className="muted center pad">Nenhum lançamento neste mês.</p>;
  return (
    <div className="stack">
      {groups.map(([d, list]) => (
        <section key={d} className="card">
          <h3>{dayLabel(d)}</h3>
          <ul className="txs">{list.map((t) => <TxRow key={t.id} t={t} cats={cats} onRemove={onRemove} />)}</ul>
        </section>
      ))}
    </div>
  );
}

export function TipsView({
  data, s, getToken, mood, mode,
}: { data: Data; s: Summary; getToken: () => Promise<string | null>; mood: Mood; mode: "cloud" | "local" }) {
  const local = useMemo(() => localTips(data, s), [data, s]);
  const [ai, setAi] = useState<{ line: string; tips: Tip[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ask = async () => {
    setBusy(true); setErr(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ summary: buildAiSummary(data, s.month) }),
      });
      const j = (await res.json()) as { line?: string; tips?: Tip[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Erro ${res.status}`);
      setAi({ line: j.line ?? "", tips: j.tips ?? [] });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const Card = ({ t }: { t: Tip }) => (
    <li className={`tip ${t.tone}`}><b>{t.title}</b><p>{t.body}</p></li>
  );

  return (
    <div className="stack">
      <div className="tips-head">
        <Mascot mood={ai ? "happy" : mood} size={96} />
        <div className="bubble">{ai?.line || "Olhei seus números. Segue o que eu faria no seu lugar."}</div>
      </div>

      <section className="card">
        <h3>Análise do Claude</h3>
        {ai ? (
          <ul className="tips">{ai.tips.map((t, i) => <Card key={i} t={t} />)}</ul>
        ) : (
          <p className="muted small">Uma análise mais profunda, com base nos seus últimos meses, maiores gastos e estabelecimentos.</p>
        )}
        {err && <p className="err">{err}</p>}
        <button className="primary" disabled={busy || s.txs.length === 0} onClick={ask}>
          <Icon name="sparkle" size={16} /> {busy ? "Analisando…" : ai ? "Analisar de novo" : "Pedir análise"}
        </button>
        {s.txs.length === 0 && <p className="muted small">Lance alguns gastos primeiro.</p>}
        {mode === "local" && <p className="muted small">Modo local: a análise só funciona com a chave da API no servidor.</p>}
      </section>

      <section className="card">
        <h3>Alertas rápidos</h3>
        <ul className="tips">{local.map((t, i) => <Card key={i} t={t} />)}</ul>
      </section>
    </div>
  );
}

export function SettingsView({
  cats, onSave, onDelete, onSignOut, email, mode, error, bio,
}: {
  cats: Category[]; onSave: (c: Category) => Promise<void>; onDelete: (id: string) => Promise<void>;
  onSignOut: () => void; email: string | null; mode: "cloud" | "local"; error: string | null;
  bio: { on: boolean; enable: () => Promise<void>; disable: () => void } | null;
}) {
  const [name, setName] = useState("");
  const sorted = [...cats].sort((a, b) => a.sort - b.sort);
  const add = async () => {
    if (!name.trim()) return;
    await onSave({ id: crypto.randomUUID(), name: name.trim(), icon: "dots", limitCents: 0, sort: sorted.length });
    setName("");
  };
  return (
    <div className="stack">
      <section className="card">
        <h3>Limites por categoria</h3>
        <p className="muted small">O "pode gastar" é a soma dos limites menos tudo o que você gastou, inclusive nas categorias sem limite (deixe 0 nelas).</p>
        <ul className="set">
          {sorted.map((c) => <CatEditor key={c.id} c={c} onSave={onSave} onDelete={onDelete} />)}
        </ul>
        <div className="add-cat">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" maxLength={40} />
          <button className="primary sm" onClick={add}>Adicionar</button>
        </div>
      </section>
      <section className="card">
        <h3>Conta</h3>
        <p className="muted small">
          {mode === "cloud" ? `Conectado como ${email ?? "—"}. Seus dados ficam na nuvem.` : "Modo local: os dados ficam só neste aparelho (sem login)."}
        </p>
        {error && <p className="err">{error}</p>}
        {bio && (
          <div className="bio-row">
            <div><b>Digital / Face ID</b><p className="muted small">Pede a biometria ao abrir o app e depois de 1 minuto fora dele.</p></div>
            <button className={`switch ${bio.on ? "on" : ""}`} role="switch" aria-checked={bio.on} aria-label="Digital ou Face ID"
              onClick={() => (bio.on ? bio.disable() : void bio.enable())}><i /></button>
          </div>
        )}
        {mode === "cloud" && <button className="ghost" onClick={onSignOut}>Sair</button>}
      </section>
    </div>
  );
}

function CatEditor({ c, onSave, onDelete }: { c: Category; onSave: (c: Category) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [limit, setLimit] = useState(c.limitCents ? (c.limitCents / 100).toFixed(2).replace(".", ",").replace(/,00$/, "") : "");
  const [name, setName] = useState(c.name);
  const [open, setOpen] = useState(false);
  const commit = (p: Partial<Category>) => void onSave({ ...c, ...p });
  return (
    <li>
      <div className="set-row">
        <button className="c-i" onClick={() => setOpen(!open)} aria-label="Ícone"><Icon name={c.icon} size={18} /></button>
        <input className="set-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== c.name && commit({ name: name.trim() })} />
        <span className="rs">R$</span>
        <input className="set-lim" inputMode="decimal" value={limit} placeholder="0" onChange={(e) => setLimit(e.target.value.replace(/[^\d,.]/g, ""))}
          onBlur={() => {
            const v = parseToCents(limit);
            if (v !== c.limitCents) commit({ limitCents: v });
          }} />
        <button className="icon-btn" aria-label="Remover categoria" onClick={() => { if (confirm(`Remover "${c.name}"? Os lançamentos ficam sem categoria.`)) void onDelete(c.id); }}>
          <Icon name="trash" size={16} />
        </button>
      </div>
      {open && (
        <div className="icons">
          {CATEGORY_ICONS.map((ic: IconName) => (
            <button key={ic} className={ic === c.icon ? "on" : ""} onClick={() => { commit({ icon: ic }); setOpen(false); }}><Icon name={ic} size={18} /></button>
          ))}
        </div>
      )}
    </li>
  );
}
