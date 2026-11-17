"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Mascot } from "./Mascot";

export function Login() {
  const { signIn, signUp } = useStore();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = mode === "in" ? await signIn(email, pw) : await signUp(email, pw);
    setMsg(r);
    setBusy(false);
  };

  return (
    <main className="login">
      <Mascot mood="happy" size={130} />
      <h1 className="brand">tostão</h1>
      <p className="muted center">Seu controle de gastos com um bichinho que te julga.</p>
      <form onSubmit={submit}>
        <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input type="password" required minLength={6} placeholder="Senha (mín. 6)" value={pw} onChange={(e) => setPw(e.target.value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"} />
        <button className="primary" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</button>
        <button type="button" className="ghost" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "Criar conta" : "Já tenho conta"}
        </button>
        {msg && <p className="err">{msg}</p>}
      </form>
    </main>
  );
}
