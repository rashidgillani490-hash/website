import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

// A real, working asset for link-preview cards (Slack, X, iMessage, …) when a
// page doesn't set its own `openGraph.images` — one of the demo hero shots,
// cropped to the 1200×630 ratio those cards expect.
const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?auto=format&fit=crop&w=1200&h=630&q=80";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Maison Lumière — Perfumes composed in light",
    template: "%s · Maison Lumière",
  },
  description:
    "A perfume house that grows, distills and composes its own materials in Grasse since 1976. Luminous, skin-close fragrances.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Maison Lumière",
    description: "Perfumes composed in light — Grasse, since 1976.",
    type: "website",
    siteName: "Maison Lumière",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "Maison Lumière" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maison Lumière",
    description: "Perfumes composed in light — Grasse, since 1976.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-ink text-bone/85">{children}</body>
    </html>
  );
}
