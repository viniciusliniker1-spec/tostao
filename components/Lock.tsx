"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";
import { unlockBio } from "@/lib/biometric";

export function Lock({ onUnlock, onSignOut }: { onUnlock: () => void; onSignOut: () => void }) {
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  const go = async () => {
    setBusy(true); setFail(false);
    const ok = await unlockBio();
    setBusy(false);
    if (ok) onUnlock(); else setFail(true);
  };

  // tenta abrir o prompt sozinho; se o navegador exigir um toque, o botão resolve
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="login">
      <Mascot mood={fail ? "sad" : "sleepy"} size={130} />
      <h1 className="brand">tostão</h1>
      <p className="muted center">{fail ? "Não consegui confirmar. Tente de novo." : "Confirme com sua digital ou Face ID."}</p>
      <div className="stack" style={{ width: "100%", marginTop: 8 }}>
        <button className="primary" onClick={go} disabled={busy}>{busy ? "Aguardando…" : "Desbloquear"}</button>
        <button className="ghost" onClick={onSignOut}>Sair da conta</button>
      </div>
    </main>
  );
}
