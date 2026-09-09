export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export const primaryNav: NavLink[] = [
  { label: "Fragrances", href: "/fragrances" },
  { label: "Collections", href: "/fragrances?view=collections" },
  { label: "The Maison", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All fragrances", href: "/fragrances" },
      { label: "Lumière — signatures", href: "/fragrances?collection=lumiere" },
      { label: "Nocturne — after dark", href: "/fragrances?collection=nocturne" },
      { label: "Jardin Clos", href: "/fragrances?collection=jardin" },
      { label: "Archive editions", href: "/fragrances?collection=archive" },
      { label: "Discovery sets", href: "/fragrances?family=floral" },
    ],
  },
  {
    title: "The Maison",
    links: [
      { label: "Our craft", href: "/about" },
      { label: "The fields", href: "/about#fields" },
      { label: "Sustainability", href: "/about#values" },
      { label: "Journal", href: "/about" },
      { label: "Contact & visits", href: "/contact" },
    ],
  },
  {
    title: "Client care",
    links: [
      { label: "My account", href: "/account" },
      { label: "Orders & tracking", href: "/account/orders" },
      { label: "Shipping & returns", href: "/contact" },
      { label: "Refill programme", href: "/contact" },
      { label: "FAQ", href: "/contact" },
    ],
  },
];

export const accountNav: NavLink[] = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Settings", href: "/account/settings" },
];

export const adminNav: { label: string; href: string; icon: string }[] = [
  { label: "Overview", href: "/admin", icon: "gauge" },
  { label: "Products", href: "/admin/products", icon: "flask" },
  { label: "Categories", href: "/admin/categories", icon: "layers" },
  { label: "Fragrance notes", href: "/admin/notes", icon: "sparkles" },
  { label: "Media", href: "/admin/media", icon: "image" },
  { label: "Orders", href: "/admin/orders", icon: "receipt" },
  { label: "Coupons", href: "/admin/coupons", icon: "tag" },
  { label: "Customers", href: "/admin/customers", icon: "users" },
  { label: "Content", href: "/admin/content", icon: "text" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];
