// Desbloqueio com digital / Face ID via WebAuthn (autenticador do próprio aparelho).
// É uma trava local do app: o aparelho confirma a biometria; nenhum dado biométrico sai dele.

const KEY = "tostao:bio";
const DISMISS = "tostao:bio-dismissed";

const b64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const unb64 = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const rand = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

export async function bioSupported(): Promise<boolean> {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export function bioEnabled(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function bioDismissed(): boolean {
  try { return localStorage.getItem(DISMISS) === "1"; } catch { return false; }
}

export function dismissBio(): void {
  try { localStorage.setItem(DISMISS, "1"); } catch {}
}

export function disableBio(): void {
  try { localStorage.removeItem(KEY); } catch {}
}

/** Cadastra a digital/Face ID deste aparelho. Lança erro se o usuário cancelar. */
export async function enableBio(label: string): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: "Tostão" },
      user: { id: rand(16), name: label || "tostao", displayName: label || "Tostão" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      attestation: "none",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Cadastro cancelado.");
  localStorage.setItem(KEY, b64(cred.rawId));
}

/** Pede a digital/Face ID. Retorna true se o aparelho confirmou. */
export async function unlockBio(): Promise<boolean> {
  const id = localStorage.getItem(KEY);
  if (!id) return true;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        allowCredentials: [{ type: "public-key", id: unb64(id), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return !!res;
  } catch {
    return false;
  }
}
