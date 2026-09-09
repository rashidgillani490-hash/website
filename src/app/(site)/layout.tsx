import { getSiteContent, getCommerceSettings } from "@/lib/cms";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { CommerceSettingsSync } from "@/components/layout/CommerceSettingsSync";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, commerce] = await Promise.all([getSiteContent(), getCommerceSettings()]);

  return (
    <>
      <CommerceSettingsSync settings={commerce} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-bone focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <AnnouncementBar message={site.announcement} />
      <Navbar brandName={site.brandName} logoUrl={site.logoUrl} />
      <main id="main">{children}</main>
      <Footer site={site} />
      <CartDrawer />
    </>
  );
}
