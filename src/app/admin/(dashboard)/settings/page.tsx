import { getSiteContent, getCommerceSettings } from "@/lib/cms";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";

export default async function AdminSettingsPage() {
  const [site, commerce] = await Promise.all([getSiteContent(), getCommerceSettings()]);
  return <StoreSettingsForm site={site} commerce={commerce} />;
}
