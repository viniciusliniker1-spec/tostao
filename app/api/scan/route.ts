import { anthropic, MODEL } from "@/lib/claude";
import { requireUser } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Media = (typeof MEDIA)[number];

interface Body {
  image?: string; // data URL
  categories?: { id: string; name: string }[];
  today?: string;
}

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;

  const ai = anthropic();
  if (!ai) return Response.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 503 });

  let body: Body;
  try { body = (await req.json()) as Body; } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }

  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(body.image ?? "");
  if (!m || !MEDIA.includes(m[1].toLowerCase() as Media)) {
    return Response.json({ error: "Envie uma imagem JPEG, PNG ou WebP." }, { status: 400 });
  }
  if (m[2].length > 6_000_000) return Response.json({ error: "Imagem grande demais." }, { status: 413 });

  const cats = (body.categories ?? []).slice(0, 40);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today ?? "") ? body.today! : new Date().toISOString().slice(0, 10);
  const catIds = new Set(cats.map((c) => c.id));

  const system =
    "Você extrai lançamentos financeiros de prints de celular (extratos, faturas, notificações, comprovantes de Pix, apps de banco, pedidos de delivery, recibos). " +
    "Responda SEMPRE chamando a ferramenta registrar_lancamentos. Não invente itens que não estejam visíveis.";

  const prompt = [
    `Hoje é ${today}. Moeda: reais (BRL).`,
    "Extraia cada transação visível no print.",
    "Regras:",
    "- amount é sempre positivo, em reais (ex.: 37.9). Use ponto decimal.",
    "- type = expense para compras, débitos, Pix/transferência enviados, boletos pagos; income para salário, Pix recebido, estornos/reembolsos.",
    "- Ignore saldo, limite disponível, totais da fatura, pontos/cashback e valores de propaganda.",
    "- Em compras parceladas use o valor da parcela mostrada e acrescente '(parcela x/y)' no merchant se aparecer.",
    "- merchant: nome limpo do estabelecimento ou descrição (ex.: 'iFood', 'Uber', 'Mercado Livre').",
    "- date: YYYY-MM-DD. Converta 'Hoje' e 'Ontem' a partir da data de hoje. Se o ano faltar, use o ano mais plausível até hoje. Se não houver data, use string vazia.",
    "- categoryId: escolha o id da categoria que melhor combina; se nenhuma servir, use string vazia.",
    "- confidence: alta se valor e descrição estão nítidos; media se houver ambiguidade; baixa se estiver chutando.",
    "- Se o print não tiver nenhuma transação, retorne items vazio e explique em notes.",
    "",
    "Categorias disponíveis:",
    ...cats.map((c) => `- ${c.id}: ${c.name}`),
  ].join("\n");

  try {
    const res = await ai.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools: [{
        name: "registrar_lancamentos",
        description: "Registra os lançamentos encontrados no print.",
        input_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              maxItems: 60,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["expense", "income"] },
                  amount: { type: "number" },
                  merchant: { type: "string" },
                  date: { type: "string" },
                  categoryId: { type: "string" },
                  confidence: { type: "string", enum: ["alta", "media", "baixa"] },
                },
                required: ["type", "amount", "merchant", "date", "categoryId", "confidence"],
              },
            },
            notes: { type: "string" },
          },
          required: ["items"],
        },
      }],
      tool_choice: { type: "tool", name: "registrar_lancamentos" },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: m[1].toLowerCase() as Media, data: m[2] } },
          { type: "text", text: prompt },
        ],
      }],
    });

    const block = res.content.find((b) => b.type === "tool_use");
    const input = (block && block.type === "tool_use" ? block.input : {}) as {
      items?: { type?: string; amount?: number; merchant?: string; date?: string; categoryId?: string; confidence?: string }[];
      notes?: string;
    };

    const items = (input.items ?? [])
      .filter((i) => typeof i.amount === "number" && Number.isFinite(i.amount) && i.amount > 0)
      .map((i) => ({
        type: i.type === "income" ? "income" : "expense",
        amountCents: Math.round(i.amount! * 100),
        merchant: String(i.merchant ?? "").slice(0, 80),
        date: /^\d{4}-\d{2}-\d{2}$/.test(i.date ?? "") ? i.date! : "",
        categoryId: i.categoryId && catIds.has(i.categoryId) ? i.categoryId : null,
        confidence: i.confidence === "alta" || i.confidence === "baixa" ? i.confidence : "media",
      }));

    return Response.json({ items, notes: input.notes ?? "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return Response.json({ error: `Falha ao ler o print: ${msg}` }, { status: 502 });
  }
}
