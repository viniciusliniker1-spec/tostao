import type { Data } from "./types";
import { summarize, type Summary } from "./calc";
import { brl } from "./money";
import { monthKey, shiftMonth } from "./dates";

export interface Tip {
  title: string;
  body: string;
  tone: "alert" | "info" | "good";
}

/** Dicas rápidas calculadas no aparelho, sem IA. */
export function localTips(data: Data, s: Summary): Tip[] {
  const tips: Tip[] = [];
  if (s.budget <= 0) {
    return [{ title: "Defina seus limites", body: "Sem limite por categoria eu não consigo te avisar de nada. Vá em Ajustes e coloque um valor nas categorias que mais pesam.", tone: "info" }];
  }
  for (const c of s.byCat.filter((x) => x.over)) {
    tips.push({
      title: `${c.cat.name} estourou`,
      body: `Você passou ${brl(c.spent - c.limit)} do limite de ${brl(c.limit)}. Se isso se repete todo mês, talvez o limite esteja irreal, ou o hábito precise mudar.`,
      tone: "alert",
    });
  }
  for (const c of s.byCat.filter((x) => !x.over && x.limit > 0 && x.pct >= 0.8)) {
    tips.push({
      title: `${c.cat.name} quase no limite`,
      body: `Já foram ${Math.round(c.pct * 100)}%. Sobram só ${brl(c.limit - c.spent)} até o fim do mês.`,
      tone: "alert",
    });
  }
  if (s.pace === "fast") {
    tips.push({
      title: "Ritmo acelerado",
      body: `Você já usou ${Math.round((s.spentLimited / s.budget) * 100)}% do teto e o mês passou ${Math.round(s.elapsed * 100)}%. Para fechar no azul, o limite por dia agora é ${brl(s.perDay)}.`,
      tone: "alert",
    });
  }
  const prev = summarize(data, shiftMonth(s.month, -1));
  if (s.month === monthKey() && prev.spentTotal > 0 && s.elapsed >= 0.4) {
    const projected = s.spentTotal / s.elapsed;
    if (projected > prev.spentTotal * 1.1) {
      tips.push({
        title: "Caminho pra gastar mais que mês passado",
        body: `No ritmo atual você fecha perto de ${brl(Math.round(projected))}, contra ${brl(prev.spentTotal)} no mês anterior.`,
        tone: "alert",
      });
    }
  }
  const top = [...s.byCat].sort((a, b) => b.spent - a.spent)[0];
  if (top && s.spentTotal > 0 && top.spent / s.spentTotal >= 0.4) {
    tips.push({
      title: `${top.cat.name} é o seu maior gasto`,
      body: `Ela sozinha leva ${Math.round((top.spent / s.spentTotal) * 100)}% do que você gastou. É onde um pequeno corte rende mais.`,
      tone: "info",
    });
  }
  if (s.income > 0 && s.spentTotal > 0) {
    const saved = s.income - s.spentTotal;
    tips.push(saved >= 0
      ? { title: "Você está no positivo", body: `Entrou ${brl(s.income)}, saiu ${brl(s.spentTotal)}. Separar uns ${brl(Math.round(saved * 0.5))} assim que sobrar evita gastar sem perceber.`, tone: "good" }
      : { title: "Saiu mais do que entrou", body: `Entrou ${brl(s.income)} e saiu ${brl(s.spentTotal)}. Segure os gastos variáveis até equilibrar.`, tone: "alert" });
  }
  if (tips.length === 0) {
    tips.push({ title: "Tudo sob controle", body: s.pace === "empty" ? "Ainda sem gastos neste mês. Lance os primeiros e eu começo a analisar." : "Nenhum alerta por enquanto. Continue assim e confira de novo em uma semana.", tone: "good" });
  }
  return tips;
}

/** Resumo enxuto enviado para a análise com Claude (sem dados pessoais além de valores e categorias). */
export function buildAiSummary(data: Data, month: string) {
  const months = [0, -1, -2].map((d) => summarize(data, shiftMonth(month, d)));
  const cur = months[0];
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));
  const notes = new Map<string, number>();
  for (const t of cur.txs) {
    if (t.type !== "expense" || !t.note) continue;
    const k = t.note.toLowerCase().slice(0, 40);
    notes.set(k, (notes.get(k) ?? 0) + t.amountCents);
  }
  return {
    mes: month,
    diasDecorridosPct: Math.round(cur.elapsed * 100),
    entradas: cur.income / 100,
    tetoTotal: cur.budget / 100,
    gastoTotal: cur.spentTotal / 100,
    categorias: cur.byCat.map((c) => ({ nome: c.cat.name, gasto: c.spent / 100, limite: c.limit / 100 })),
    maioresGastos: cur.txs.filter((t) => t.type === "expense").sort((a, b) => b.amountCents - a.amountCents).slice(0, 8)
      .map((t) => ({ valor: t.amountCents / 100, onde: t.note, categoria: t.categoryId ? catName.get(t.categoryId) ?? "" : "", data: t.date })),
    estabelecimentosMaisFrequentes: [...notes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => ({ onde: n, total: v / 100 })),
    mesesAnteriores: months.slice(1).map((m) => ({ mes: m.month, entradas: m.income / 100, gastoTotal: m.spentTotal / 100 })),
  };
}
