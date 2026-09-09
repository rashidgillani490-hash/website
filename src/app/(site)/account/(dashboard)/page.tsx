import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
import { getMyOrders } from "@/lib/customer/orders";
import { ORDER_STATUS_LABELS } from "@/lib/admin/records";
import { Price } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";

export default async function AccountOverviewPage() {
  const session = await requireCustomer();
  const orders = await getMyOrders(session.userId);
  const recent = orders.slice(0, 3);
  const openOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;
  const lifetimeSpend = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + o.total_cents, 0);

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-4 sm:grid-cols-3">
        {(
          [
            { label: "Open orders", value: String(openOrders), amount: undefined },
            { label: "Total orders", value: String(orders.length), amount: undefined },
            { label: "Lifetime spend", value: "", amount: lifetimeSpend },
          ] satisfies { label: string; value: string; amount: number | undefined }[]
        ).map((s) => (
          <div key={s.label} className="border border-bone/10 bg-bone/[0.02] p-6">
            {s.amount !== undefined ? (
              <Price amount={s.amount} className="font-serif text-3xl text-gold" />
            ) : (
              <p className="font-serif text-3xl text-gold">{s.value}</p>
            )}
            <p className="mt-1 text-[11px] uppercase tracking-wide2 text-bone/40">
              {s.label}
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Recent orders</h2>
          {orders.length > 0 ? (
            <Link href="/account/orders" className="text-xs text-gold link-underline">
              View all
            </Link>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Your placed orders will appear here."
            action={
              <Button href="/fragrances" size="md">
                Explore fragrances
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-bone/10 border-y border-bone/10">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <Link href={`/account/orders/${o.id}`} className="flex flex-col hover:text-gold">
                  <span className="text-sm text-bone/80">{o.order_number}</span>
                  <span className="text-xs text-bone/40">
                    {new Date(o.placed_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </Link>
                <span className="text-[11px] uppercase tracking-wide2 text-gold">
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
                <Price amount={o.total_cents} className="text-sm" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
