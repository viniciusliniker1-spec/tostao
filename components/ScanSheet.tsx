"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, Tx, TxType } from "@/lib/types";
import { brl, parseToCents } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { Icon } from "./Icon";

interface Item {
  key: string;
  type: TxType;
  amount: string; // texto editável, ex "37,90"
  merchant: string;
  date: string;
  categoryId: string | null;
  confidence: "alta" | "media" | "baixa";
  include: boolean;
  dup: boolean;
}

interface ApiItem {
  type: TxType; amountCents: number; merchant: string; date: string;
  categoryId: string | null; confidence: "alta" | "media" | "baixa";
}

async function toJpeg(file: File, max = 1600): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export function ScanSheet({
  categories, existing, getToken, onSave, onClose,
}: {
  categories: Category[];
  existing: Tx[];
  getToken: () => Promise<string | null>;
  onSave: (t: Omit<Tx, "id">[]) => Promise<void>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"pick" | "loading" | "review">("pick");
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) { setErr("Escolha uma imagem (print)."); return; }
    setErr(null);
    setPhase("loading");
    const out: Item[] = [];
    const msgs: string[] = [];
    try {
      const token = await getToken();
      for (const f of imgs.slice(0, 5)) {
        const dataUrl = await toJpeg(f);
        setPreview(dataUrl);
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            image: dataUrl, today: todayISO(),
            categories: categories.map((c) => ({ id: c.id, name: c.name })),
          }),
        });
        const json = (await res.json()) as { items?: ApiItem[]; notes?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
        if (json.notes) msgs.push(json.notes);
        for (const i of json.items ?? []) {
          const date = i.date || todayISO();
          const dup = existing.some((t) => t.date === date && t.amountCents === i.amountCents && t.type === i.type)
            || out.some((o) => o.date === date && parseToCents(o.amount) === i.amountCents && o.type === i.type);
          out.push({
            key: crypto.randomUUID(), type: i.type,
            amount: (i.amountCents / 100).toFixed(2).replace(".", ","),
            merchant: i.merchant, date, categoryId: i.categoryId, confidence: i.confidence,
            include: !dup && i.confidence !== "baixa", dup,
          });
        }
      }
      setNotes(msgs.join(" "));
      setItems(out);
      setPhase("review");
    } catch (e) {
      setErr((e as Error).message);
      setPhase("pick");
    }
  }, [categories, existing, getToken]);

  // colar print (Ctrl/Cmd+V)
  useEffect(() => {
    if (phase !== "pick") return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) { e.preventDefault(); void handle(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [phase, handle]);

  const patch = (key: string, p: Partial<Item>) => setItems((l) => l.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const chosen = items.filter((i) => i.include && parseToCents(i.amount) > 0);
  const total = chosen.reduce((s, i) => s + (i.type === "expense" ? -1 : 1) * parseToCents(i.amount), 0);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(chosen.map((i) => ({
        type: i.type, amountCents: parseToCents(i.amount), categoryId: i.type === "expense" ? i.categoryId : null,
        note: i.merchant.trim(), date: i.date || todayISO(), source: "print" as const,
      })));
      onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <button className="sheet-bg" aria-label="Fechar" onClick={onClose} />
      <div className="sheet tall">
        <div className="sheet-head">
          <h2>Ler print de gastos</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
        </div>

        {phase === "pick" && (
          <>
            <div
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void handle([...e.dataTransfer.files]); }}
            >
              <Icon name="camera" size={34} />
              <p><b>Jogue o print aqui</b></p>
              <p className="muted">Extrato, fatura, Pix, comprovante ou pedido de delivery. Eu leio os valores e escolho a categoria.</p>
              <button className="primary" onClick={() => input.current?.click()}>Escolher print</button>
              <input ref={input} type="file" accept="image/*" multiple hidden
                onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; void handle(f); }} />
            </div>
            {err && <p className="err">{err}</p>}
          </>
        )}

        {phase === "loading" && (
          <div className="loading">
            {preview && <img src={preview} alt="" />}
            <p className="muted">Lendo o print…</p>
          </div>
        )}

        {phase === "review" && (
          <>
            {notes && <p className="muted small">{notes}</p>}
            {items.length === 0 ? (
              <p className="muted">Não achei nenhum lançamento nesse print.</p>
            ) : (
              <ul className="review">
                {items.map((i) => (
                  <li key={i.key} className={i.include ? "" : "off"}>
                    <div className="r-top">
                      <input type="checkbox" checked={i.include} onChange={(e) => patch(i.key, { include: e.target.checked })} aria-label="Incluir" />
                      <input className="r-merchant" value={i.merchant} onChange={(e) => patch(i.key, { merchant: e.target.value })} placeholder="Descrição" />
                      <input className="r-amount" inputMode="decimal" value={i.amount} onChange={(e) => patch(i.key, { amount: e.target.value })} aria-label="Valor" />
                    </div>
                    <div className="r-bot">
                      <select value={i.type} onChange={(e) => patch(i.key, { type: e.target.value as TxType })}>
                        <option value="expense">Gasto</option>
                        <option value="income">Receita</option>
                      </select>
                      {i.type === "expense" && (
                        <select value={i.categoryId ?? ""} onChange={(e) => patch(i.key, { categoryId: e.target.value || null })}>
                          <option value="">Sem categoria</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      <input type="date" value={i.date} onChange={(e) => patch(i.key, { date: e.target.value })} />
                    </div>
                    {(i.dup || i.confidence !== "alta") && (
                      <p className="warn">{i.dup ? "Parece já lançado (mesmo dia e valor)." : i.confidence === "baixa" ? "Não tenho certeza, confira." : "Confira este item."}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {err && <p className="err">{err}</p>}
            <div className="row-btns sticky">
              <button className="ghost" onClick={() => { setPhase("pick"); setItems([]); }}>Outro print</button>
              <button className="primary" disabled={busy || chosen.length === 0} onClick={save}>
                Lançar {chosen.length} {chosen.length === 1 ? "item" : "itens"}{chosen.length > 0 ? ` · ${brl(Math.abs(total))}` : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
