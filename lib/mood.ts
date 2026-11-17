import type { Summary } from "./calc";
import { brl } from "./money";

export type Mood = "neutral" | "happy" | "sad" | "angry" | "surprised" | "sleepy";

const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

export function moodFor(s: Summary, seed: number): { mood: Mood; text: string } {
  if (s.budget <= 0) {
    return { mood: "neutral", text: "Defina seus limites em Ajustes e eu começo a te vigiar." };
  }
  if (s.pace === "over") {
    const over = brl(s.spentTotal - s.budget);
    return {
      mood: "sad",
      text: pick([
        `Estourou ${over}. Vou fingir que não vi. Mentira, vi sim.`,
        `${over} acima do teto. Respira, a gente se recupera no mês que vem.`,
        `Teto furado em ${over}. Eu avisei. Quer dizer, pensei.`,
      ], seed),
    };
  }
  if (s.anyCatOver) {
    const c = s.byCat.filter((x) => x.over).sort((a, b) => b.spent - b.limit - (a.spent - a.limit))[0];
    return {
      mood: "angry",
      text: pick([
        `${c.cat.name} estourou. Eu ia falar, mas você foi mais rápido.`,
        `${c.cat.name} passou ${brl(c.spent - c.limit)} do limite. Hmpf.`,
      ], seed),
    };
  }
  if (s.pace === "empty") {
    return {
      mood: "neutral",
      text: pick([
        `Mês novo, limite cheio: ${brl(s.budget)}. Respira antes de abrir o iFood.`,
        `Nenhum gasto ainda. Eu podia viver assim pra sempre.`,
        `Página em branco. Bora não estragar logo de cara?`,
      ], seed),
    };
  }
  if (s.pace === "fast") {
    return {
      mood: "surprised",
      text: pick([
        `Opa, tá gastando mais rápido que o mês anda. Ainda sobram ${brl(s.remaining)}.`,
        `Calma! ${brl(s.remaining)} pra ${s.daysLeft} dias. Dá, mas pisa no freio.`,
      ], seed),
    };
  }
  return {
    mood: "happy",
    text: pick([
      `No ritmo! Dá pra gastar até ${brl(s.perDay)} por dia.`,
      `Tá indo bem. Sobram ${brl(s.remaining)}. Não me faça mudar de ideia.`,
      `Orgulho de você. Só hoje, ok? Amanhã eu te julgo de novo.`,
    ], seed),
  };
}

/** Reação imediata depois de lançar um gasto */
export function reactionFor(amountCents: number, s: Summary, catOverNow: boolean): { mood: Mood; text: string } {
  if (s.budget > 0 && amountCents >= s.budget * 0.15) {
    return { mood: "surprised", text: `${brl(amountCents)}?! De uma vez só?` };
  }
  if (catOverNow) return { mood: "angry", text: "Essa categoria acabou de estourar. Anotei." };
  if (s.pace === "over") return { mood: "sad", text: "Anotado. O teto do mês foi pro espaço." };
  return { mood: "happy", text: "Anotado! Eu vi tudo, tá?" };
}
