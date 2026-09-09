/**
 * Demo account data. Replaced by Supabase auth + tables in a later phase; the
 * shapes here match the intended `orders`, `addresses` and `wishlist` rows.
 */

export interface DemoOrder {
  id: string;
  date: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
  total: number;
  items: { name: string; ml: number; qty: number; image: string }[];
  tracking?: string;
}

export const demoCustomer = {
  name: "Camille Fontaine",
  email: "camille.fontaine@example.com",
  since: "2022",
  tier: "Cercle Lumière — Gold",
  points: 1840,
};

export const demoOrders: DemoOrder[] = [
  {
    id: "ML-24815",
    date: "2026-08-21",
    status: "Delivered",
    total: 41000,
    tracking: "FR928340155LU",
    items: [
      {
        name: "Blanche Heure",
        ml: 50,
        qty: 1,
        image:
          "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Rose Close",
        ml: 10,
        qty: 1,
        image:
          "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
  {
    id: "ML-25102",
    date: "2026-09-02",
    status: "Shipped",
    total: 23500,
    tracking: "FR928361902LU",
    items: [
      {
        name: "Nuit Vétiver",
        ml: 50,
        qty: 1,
        image:
          "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
  {
    id: "ML-25260",
    date: "2026-09-08",
    status: "Processing",
    total: 55800,
    items: [
      {
        name: "Cuir Centifolia",
        ml: 50,
        qty: 1,
        image:
          "https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Ambre Lumen",
        ml: 100,
        qty: 1,
        image:
          "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
];

export const demoAddresses = [
  {
    id: "a1",
    label: "Home",
    name: "Camille Fontaine",
    lines: ["24 Rue des Lices", "13200 Arles", "France"],
    default: true,
  },
  {
    id: "a2",
    label: "Studio",
    name: "Camille Fontaine",
    lines: ["9 Passage Vendôme", "75011 Paris", "France"],
    default: false,
  },
];
