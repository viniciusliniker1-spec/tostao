"use client";

import { useState } from "react";
import { brl, parseToCents } from "@/lib/money";
import { Icon } from "./Icon";

export function EditBudgetSheet({
  remaining, spent, onSave, onClose,
}: {
  remaining: number;
  spent: number;
  onSave: (remainingCents: number) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState(remaining > 0 ? (remaining / 100).toFixed(2).replace(".", ",") : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cents = parseToCents(text);
  const newTotal = spent + cents;

  const save = async () => {
    if (newTotal <= 0) { setErr("Informe um valor maior que zero."); return; }
    setBusy(true); setErr(null);
    try { await onSave(cents); onClose(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <button className="sheet-bg" aria-label="Fechar" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <h2>Quanto você pode gastar?</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
        </div>
        <label className="field">
          <span>Saldo restante do mês</span>
          <input autoFocus inputMode="decimal" value={text} placeholder="0,00"
            onChange={(e) => setText(e.target.value.replace(/[^\d,.]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
        </label>
        <p className="muted small">
          Você já gastou {brl(spent)}, então o teto do mês vira <b>{brl(Math.max(0, newTotal))}</b>.
          Os limites das categorias são ajustados na mesma proporção e valem também para os outros meses.
        </p>
        {err && <p className="err">{err}</p>}
        <div className="row-btns">
          <button className="ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={busy} onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
