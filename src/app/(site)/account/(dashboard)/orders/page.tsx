import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
import { getMyOrders } from "@/lib/customer/orders";
import { ORDER_STATUS_LABELS } from "@/lib/admin/records";
import { Price } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { OrderStatusValue } from "@/lib/admin/records";

const statusTone: Record<OrderStatusValue, string> = {
  pending: "text-bone/50",
  confirmed: "text-emerald-300",
  processing: "text-blue-300",
  shipped: "text-gold",
  out_for_delivery: "text-gold",
  delivered: "text-bone/50",
  cancelled: "text-red-400",
};

export default async function OrdersPage() {
  const session = await requireCustomer();
  const orders = await getMyOrders(session.userId);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h2 className="font-serif text-2xl">Order history</h2>
        <EmptyState
          title="No orders yet"
          description="When you place an order it will appear here, with tracking and status updates."
          action={
            <Button href="/fragrances" size="md">
              Explore fragrances
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-serif text-2xl">Order history</h2>
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/account/orders/${o.id}`}
            className="flex flex-wrap items-center justify-between gap-4 border border-bone/10 px-6 py-5 transition-colors hover:border-bone/25"
          >
            <div className="flex flex-col">
              <span className="text-sm text-bone/80">{o.order_number}</span>
              <span className="text-xs text-bone/40">
                {new Date(o.placed_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <span className="text-xs text-bone/40">
              {o.item_count} item{o.item_count === 1 ? "" : "s"}
              {o.personalised_count > 0 ? " · personalised" : ""}
            </span>
            <span
              className={cn(
                "text-[11px] uppercase tracking-wide2",
                statusTone[o.status],
              )}
            >
              {ORDER_STATUS_LABELS[o.status]}
            </span>
            {o.tracking_number ? (
              <span className="text-xs text-bone/40">Tracking: {o.tracking_number}</span>
            ) : null}
            <Price amount={o.total_cents} className="text-sm" />
          </Link>
        ))}
      </div>
    </div>
  );
}
