const nf = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function brl(cents: number): string {
  return "R$ " + nf.format(cents / 100);
}

export function brlParts(cents: number): { int: string; dec: string } {
  const v = nf.format(Math.abs(cents) / 100);
  const [int, dec] = v.split(",");
  return { int: (cents < 0 ? "-" : "") + "R$ " + int, dec: "," + dec };
}

/** "12,50" | "12.50" | "1.234,56" -> centavos */
export function parseToCents(input: string): number {
  const s = input.trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let norm = s;
  if (lastComma > lastDot) norm = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) norm = s.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
