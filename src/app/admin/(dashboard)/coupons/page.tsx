import { getAdminRepo } from "@/lib/admin/repo";
import { CouponManager } from "@/components/admin/CouponManager";

export default async function AdminCouponsPage() {
  const repo = await getAdminRepo();
  const coupons = await repo.listCoupons();

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-bone/50">
        Discount codes for checkout. Every rule here — expiry, active flag,
        minimum order value, and both the total and per-customer usage limits —
        is re-checked on the server the moment an order is placed, never taken
        from what the shopper's browser last showed. Written to{" "}
        <span className="text-bone/70">
          {repo.backend === "supabase" ? "Supabase" : "the local store"}
        </span>
        .
      </p>
      <CouponManager coupons={coupons} />
    </div>
  );
}
