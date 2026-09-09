/** The authenticated shopper, regardless of which backend proved it. */
export interface CustomerSession {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingOptIn: boolean;
  mode: "supabase" | "local";
}
