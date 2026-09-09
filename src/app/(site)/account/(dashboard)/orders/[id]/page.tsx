import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, Package } from "lucide-react";
import { requireCustomer } from "@/lib/customer/auth";
import { getMyOrder } from "@/lib/customer/orders";
import { getPaymentMethod } from "@/lib/payments/registry";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/admin/records";
import { Price } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCustomer();
  // `getMyOrder` returns null both when the order doesn't exist and when it
  // belongs to someone else — a 404 either way, never a hint which one it was.
  const detail = await getMyOrder(session.userId, id);
  if (!detail) notFound();

  const { order, items, statusHistory } = detail;
  const addr = order.shipping_address as Record<string, string | null>;
  const method = getPaymentMethod(order.payment_method);
  const cancelled = order.status === "cancelled";
  const currentStep = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="flex flex-col gap-10">
      <Link href="/account/orders" className="text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone">
        ← Order history
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">{order.order_number}</h2>
          <p className="mt-1 text-xs text-bone/40">
            Placed {new Date(order.placed_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide2",
            cancelled
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-gold/40 bg-gold/10 text-gold",
          )}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* --------------------------------------------------------- tracking */}
      {!cancelled ? (
        <section className="flex flex-col gap-5 border border-bone/10 bg-bone/[0.02] p-6">
          <h3 className="flex items-center gap-2 font-serif text-lg">
            <Truck size={16} className="text-gold" /> Order tracking
          </h3>
          <ol className="flex flex-wrap gap-x-6 gap-y-3">
            {ORDER_STATUS_FLOW.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    i <= currentStep ? "bg-gold" : "bg-bone/15",
                  )}
                />
                <span
                  className={cn(
                    "text-xs uppercase tracking-wide2",
                    i <= currentStep ? "text-bone/80" : "text-bone/30",
                  )}
                >
                  {ORDER_STATUS_LABELS[s]}
                </span>
              </li>
            ))}
          </ol>
          {order.tracking_number ? (
            <p className="text-sm text-bone/70">
              {order.tracking_carrier ? `${order.tracking_carrier} · ` : ""}
              Tracking number: <span className="text-bone">{order.tracking_number}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4 border border-bone/10 p-6">
          <h3 className="flex items-center gap-2 font-serif text-lg">
            <Package size={16} className="text-gold" /> Items
          </h3>
          <ul className="flex flex-col divide-y divide-bone/10">
            {items.map((it) => (
              <li key={it.id} className="flex flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="font-serif text-base text-bone">{it.product_name}</span>
                    <span className="text-xs text-bone/40">
                      {it.variant_label} · Qty {it.quantity}
                    </span>
                    {it.customization ? (
                      <span className="mt-1 text-[11px] text-gold/80">
                        {(it.customization.payload as { summary?: string }).summary}
                      </span>
                    ) : null}
                  </div>
                  <Price amount={it.total_cents} className="text-sm" />
                </div>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-1.5 border-t border-bone/10 pt-4 text-sm text-bone/55">
            <Row label="Subtotal"><Price amount={order.subtotal_cents} /></Row>
            <Row label="Shipping">
              {order.shipping_cents === 0 ? "Free" : <Price amount={order.shipping_cents} />}
            </Row>
            {order.discount_cents > 0 ? (
              <Row label="Discount">
                −<Price amount={order.discount_cents} />
              </Row>
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-bone/10 pt-3 text-bone">
              <dt className="uppercase tracking-wide2 text-bone/60">Total</dt>
              <dd className="font-serif text-lg"><Price amount={order.total_cents} /></dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 border border-bone/10 p-6">
            <h3 className="text-[11px] uppercase tracking-luxe text-bone/40">Delivery address</h3>
            <address className="not-italic text-sm leading-relaxed text-bone/75">
              <span className="block text-bone">{addr.fullName}</span>
              <span className="block">{addr.mobile}</span>
              <span className="block">{addr.address}</span>
              <span className="block">{addr.area}, {addr.city}</span>
              <span className="block">{addr.province} {addr.postalCode}</span>
              <span className="block">Pakistan</span>
            </address>
          </section>

          <section className="flex flex-col gap-3 border border-bone/10 p-6">
            <h3 className="text-[11px] uppercase tracking-luxe text-bone/40">Payment</h3>
            <p className="text-sm text-bone">{method?.label ?? order.payment_method}</p>
            <p className="text-xs text-bone/45 uppercase tracking-wide2">
              {order.payment_status}
            </p>
          </section>

          {statusHistory.length > 0 ? (
            <section className="flex flex-col gap-4 border border-bone/10 p-6">
              <h3 className="text-[11px] uppercase tracking-luxe text-bone/40">History</h3>
              <ol className="flex flex-col gap-3">
                {statusHistory.map((h) => (
                  <li key={h.id} className="flex flex-col text-xs">
                    <span className="text-bone/70">
                      {ORDER_STATUS_LABELS[h.status]}{" "}
                      <span className="text-bone/35">
                        · {new Date(h.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </span>
                    {h.note ? <span className="text-bone/40">{h.note}</span> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="text-bone/80">{children}</dd>
    </div>
  );
}
