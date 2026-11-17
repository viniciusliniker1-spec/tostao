export type TxType = "expense" | "income";

export type IconName =
  | "cart" | "utensils" | "car" | "gift" | "heart" | "home" | "phone" | "book" | "dots";

export interface Category {
  id: string;
  name: string;
  icon: IconName;
  /** 0 = sem limite (não entra no "pode gastar") */
  limitCents: number;
  sort: number;
}

export interface Tx {
  id: string;
  type: TxType;
  amountCents: number;
  categoryId: string | null;
  note: string;
  /** YYYY-MM-DD (data local) */
  date: string;
  source: "manual" | "print";
}

export interface Data {
  categories: Category[];
  transactions: Tx[];
}
