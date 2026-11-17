import type { Category } from "./types";

export function defaultCategories(): Category[] {
  const mk = (name: string, icon: Category["icon"], limit: number, sort: number): Category => ({
    id: crypto.randomUUID(),
    name,
    icon,
    limitCents: limit * 100,
    sort,
  });
  return [
    mk("Mercado e alimentação", "cart", 600, 0),
    mk("Restaurantes e delivery", "utensils", 300, 1),
    mk("Transporte", "car", 250, 2),
    mk("Lazer e compras", "gift", 200, 3),
    mk("Saúde e imprevistos", "heart", 150, 4),
    mk("Moradia", "home", 0, 5),
    mk("Assinaturas", "phone", 0, 6),
    mk("Outros", "dots", 0, 7),
  ];
}
