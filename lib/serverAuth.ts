import { createClient } from "@supabase/supabase-js";

/** Garante que só você usa a chave da Anthropic. */
export async function requireUser(req: Request): Promise<Response | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "Servidor sem Supabase configurado." }, { status: 503 });
    }
    return null; // modo local de desenvolvimento
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Faça login." }, { status: 401 });

  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Sessão inválida." }, { status: 401 });

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes((data.user.email ?? "").toLowerCase())) {
    return Response.json({ error: "Este e-mail não tem acesso." }, { status: 403 });
  }
  return null;
}
