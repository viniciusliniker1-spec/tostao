"use client";

import { useState } from "react";
import type { Category, Tx, TxType } from "@/lib/types";
import { brl, brlParts } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { Icon } from "./Icon";

const QUICK = [10, 20, 50, 100];

export function AddSheet({
  categories, initialType, onSave, onClose,
}: {
  categories: Category[];
  initialType: TxType;
  onSave: (t: Omit<Tx, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<TxType>(initialType);
  const [cents, setCents] = useState(0);
  const [step, setStep] = useState<"amount" | "details">("amount");
  const [catId, setCatId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const press = (k: string) => {
    if (k === "back") setCents((c) => Math.floor(c / 10));
    else if (k === "00") setCents((c) => (c * 100 > 99_999_999_99 ? c : c * 100));
    else setCents((c) => (c * 10 + Number(k) > 99_999_999_99 ? c : c * 10 + Number(k)));
  };

  const { int, dec } = brlParts(cents);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ type, amountCents: cents, categoryId: type === "expense" ? catId : null, note: note.trim(), date, source: "manual" });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <button className="sheet-bg" aria-label="Fechar" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <h2>Novo lançamento</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
        </div>

        <div className="seg">
          <button className={type === "expense" ? "on" : ""} onClick={() => setType("expense")}>Gasto</button>
          <button className={type === "income" ? "on" : ""} onClick={() => setType("income")}>Receita</button>
        </div>

        <div className="amount">
          <span className="int">{int}</span><span className="dec">{dec}</span>
        </div>

        {step === "amount" ? (
          <>
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} onClick={() => setCents((c) => c + q * 100)}>+{q}</button>
              ))}
            </div>
            <div className="keypad">
              {["1","2","3","4","5","6","7","8","9","00","0","back"].map((k) => (
                <button key={k} onClick={() => press(k)} aria-label={k === "back" ? "Apagar" : k}>
                  {k === "back" ? <Icon name="backspace" /> : k}
                </button>
              ))}
            </div>
            <button className="primary" disabled={cents <= 0} onClick={() => setStep("details")}>Continuar</button>
          </>
        ) : (
          <>
            {type === "expense" && (
              <>
                <p className="label">Categoria</p>
                <div className="chips">
                  {categories.map((c) => (
                    <button key={c.id} className={`chip ${catId === c.id ? "on" : ""}`} onClick={() => setCatId(c.id)}>
                      <span className="chip-i"><Icon name={c.icon} size={18} /></span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="field">
              <span>Nota</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Uber pro metrô" maxLength={80} />
            </label>
            <label className="field">
              <span>Data</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="row-btns">
              <button className="ghost" onClick={() => setStep("amount")}>Voltar</button>
              <button className="primary" disabled={busy || cents <= 0 || !date} onClick={save}>
                {type === "expense" ? "Lançar gasto" : "Lançar receita"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
