import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin console",
  robots: { index: false, follow: false },
};

/**
 * Thin passthrough. The auth gate + dashboard chrome live in
 * `(dashboard)/layout.tsx`; `/admin/login` renders outside that group so it is
 * reachable without a session.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
