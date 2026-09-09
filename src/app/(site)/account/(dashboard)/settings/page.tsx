import { requireCustomer } from "@/lib/customer/auth";
import { AccountSettingsForm } from "@/components/account/AccountSettingsForm";

export default async function SettingsPage() {
  const session = await requireCustomer();
  return <AccountSettingsForm session={session} />;
}
