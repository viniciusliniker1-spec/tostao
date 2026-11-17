export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const cur = new Date().getFullYear();
  return MONTHS[m - 1] + (y !== cur ? ` ${y}` : "");
}

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const t = todayISO();
  if (iso === t) return "Hoje";
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (iso === todayISO(yest)) return "Ontem";
  const wd = ["dom","seg","ter","qua","qui","sex","sáb"][dt.getDay()];
  return `${wd}, ${pad(d)}/${pad(m)}`;
}
