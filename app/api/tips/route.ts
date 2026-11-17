import { anthropic, MODEL } from "@/lib/claude";
import { requireUser } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;

  const ai = anthropic();
  if (!ai) return Response.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 503 });

  let summary: unknown;
  try { summary = ((await req.json()) as { summary?: unknown }).summary; } catch { /* noop */ }
  const text = JSON.stringify(summary ?? null);
  if (!summary || text.length > 20_000) return Response.json({ error: "Resumo inválido." }, { status: 400 });

  try {
    const res = await ai.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        "Você é o mascote de um app de controle financeiro pessoal: um bichinho preto, simpático, com humor seco e leve ironia, mas sem julgar de verdade. " +
        "Analise os números do mês e dê dicas práticas e específicas em português do Brasil. " +
        "Use sempre valores concretos do resumo (R$, %, categorias). Não recomende produtos de investimento específicos nem prometa retorno. " +
        "Se faltarem dados (poucos lançamentos, mês começando), diga isso e dê dicas de hábito. Responda chamando a ferramenta dicas.",
      tools: [{
        name: "dicas",
        description: "Devolve de 3 a 5 dicas ordenadas por impacto.",
        input_schema: {
          type: "object",
          properties: {
            frase: { type: "string", description: "Uma frase curta do mascote resumindo o mês (máx. 120 caracteres)." },
            dicas: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string", description: "Até 6 palavras." },
                  texto: { type: "string", description: "Até 2 frases, com números." },
                  tom: { type: "string", enum: ["alerta", "info", "bom"] },
                },
                required: ["titulo", "texto", "tom"],
              },
            },
          },
          required: ["frase", "dicas"],
        },
      }],
      tool_choice: { type: "tool", name: "dicas" },
      messages: [{ role: "user", content: `Resumo financeiro (valores em reais):\n${text}` }],
    });

    const block = res.content.find((b) => b.type === "tool_use");
    const input = (block && block.type === "tool_use" ? block.input : {}) as {
      frase?: string; dicas?: { titulo?: string; texto?: string; tom?: string }[];
    };
    const tips = (input.dicas ?? []).slice(0, 5).map((d) => ({
      title: String(d.titulo ?? "").slice(0, 80),
      body: String(d.texto ?? "").slice(0, 400),
      tone: d.tom === "alerta" ? "alert" : d.tom === "bom" ? "good" : "info",
    }));
    return Response.json({ line: String(input.frase ?? "").slice(0, 160), tips });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return Response.json({ error: `Falha na análise: ${msg}` }, { status: 502 });
  }
}
