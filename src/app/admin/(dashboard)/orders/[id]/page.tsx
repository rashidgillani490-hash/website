import Link from "next/link";
import { notFound } from "next/navigation";
import { User, Mail, Phone, UserCheck, UserX } from "lucide-react";
import { getAdminRepo } from "@/lib/admin/repo";
import { Panel } from "@/components/admin/ui";
import { Price } from "@/components/ui/misc";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { OrderTrackingForm } from "@/components/admin/OrderTrackingForm";
import { ORDER_STATUS_LABELS } from "@/lib/admin/records";
import type { CustomizationSelection } from "@/lib/customization/types";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getAdminRepo();
  const detail = await repo.getOrder(id);
  if (!detail) notFound();

  const { order, items, statusHistory, customer } = detail;
  const addr = order.shipping_address as Record<string, string | null>;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/orders"
        className="text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone"
      >
        ← All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">{order.order_number}</h2>
          <p className="mt-1 text-xs text-bone/40">
            {order.email} · placed{" "}
            {new Date(order.placed_at).toLocaleString("en-GB")}
          </p>
        </div>
        <OrderStatusControl orderId={order.id} status={order.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <Panel title={`Line items · ${items.length}`}>
            <ul className="flex flex-col divide-y divide-bone/10">
              {items.map((it) => (
                <li key={it.id} className="flex flex-col gap-3 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="font-serif text-lg text-bone">
                        {it.product_name}
                      </span>
                      <span className="text-xs text-bone/40">
                        {it.variant_label} · {it.sku} · qty {it.quantity}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <Price amount={it.total_cents} className="text-bone" />
                      <div className="text-[11px] text-bone/40">
                        <Price amount={it.unit_price_cents} /> base
                        {it.customization
                          ? ` + `
                          : ""}
                        {it.customization ? (
                          <Price amount={it.customization.price_delta_cents} />
                        ) : null}
                        {it.customization ? " personalisation" : ""} × {it.quantity}
                      </div>
                    </div>
                  </div>

                  {it.customization ? (
                    <CustomizationView payload={it.customization.payload} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Status history">
            {statusHistory.length === 0 ? (
              <p className="text-sm text-bone/40">No history recorded yet.</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {statusHistory.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <div className="flex flex-col">
                      <span className="text-bone">
                        {ORDER_STATUS_LABELS[h.status]}
                        <span className="ml-2 text-xs text-bone/35">
                          {new Date(h.created_at).toLocaleString("en-GB")}
                        </span>
                      </span>
                      {h.note ? <span className="text-xs text-bone/50">{h.note}</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Customer">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                {customer.isRegistered ? (
                  <UserCheck size={14} className="text-gold" />
                ) : (
                  <UserX size={14} className="text-bone/30" />
                )}
                <span
                  className={
                    customer.isRegistered ? "text-gold text-[11px] uppercase tracking-wide2" : "text-bone/40 text-[11px] uppercase tracking-wide2"
                  }
                >
                  {customer.isRegistered ? "Registered account" : "Guest checkout"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-bone/80">
                <User size={13} className="text-bone/30" /> {customer.fullName || "—"}
              </div>
              <div className="flex items-center gap-2 text-bone/70">
                <Mail size={13} className="text-bone/30" /> {customer.email}
              </div>
              <div className="flex items-center gap-2 text-bone/70">
                <Phone size={13} className="text-bone/30" /> {customer.mobile || "—"}
              </div>
            </div>
          </Panel>

          <Panel title="Summary">
            <dl className="flex flex-col gap-2 text-sm text-bone/55">
              <Row label="Subtotal">
                <Price amount={order.subtotal_cents} />
              </Row>
              <Row label="Shipping">
                {order.shipping_cents === 0 ? "Free" : <Price amount={order.shipping_cents} />}
              </Row>
              {order.discount_cents > 0 ? (
                <Row label={order.discount_code ? `Discount (${order.discount_code})` : "Discount"}>
                  −<Price amount={order.discount_cents} />
                </Row>
              ) : null}
              <Row label="Tax">
                <Price amount={order.tax_cents} />
              </Row>
              <div className="mt-1 flex items-center justify-between border-t border-bone/10 pt-3 text-bone">
                <dt className="uppercase tracking-wide2 text-bone/60">Total</dt>
                <dd className="font-serif text-lg">
                  <Price amount={order.total_cents} />
                </dd>
              </div>
              <Row label="Payment method">
                <span className="uppercase tracking-wide2 text-bone/70">
                  {order.payment_method}
                </span>
              </Row>
              <Row label="Payment status">
                <span className="uppercase tracking-wide2 text-bone/70">
                  {order.payment_status}
                </span>
              </Row>
            </dl>
          </Panel>

          <Panel title="Ship to">
            <address className="not-italic text-sm leading-relaxed text-bone/70">
              <span className="block text-bone">{addr.fullName}</span>
              {addr.mobile ? <span className="block">{addr.mobile}</span> : null}
              <span className="block">{addr.address}</span>
              <span className="block">
                {[addr.area, addr.city].filter(Boolean).join(", ")}
              </span>
              <span className="block">
                {[addr.province, addr.postalCode].filter(Boolean).join(" ")}
              </span>
              {addr.country ? <span className="block">{addr.country}</span> : null}
            </address>
            {order.customer_note ? (
              <p className="mt-3 border-t border-bone/10 pt-3 text-xs text-bone/45">
                Note: {order.customer_note}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-bone/40">
              Method: {order.shipping_method ?? "courier"}
            </p>
          </Panel>

          <Panel title="Tracking">
            <OrderTrackingForm
              orderId={order.id}
              trackingNumber={order.tracking_number}
              trackingCarrier={order.tracking_carrier}
            />
            {order.tracking_updated_at ? (
              <p className="mt-3 text-[11px] text-bone/35">
                Last updated {new Date(order.tracking_updated_at).toLocaleString("en-GB")}
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CustomizationView({ payload }: { payload: Record<string, unknown> }) {
  const selection = (payload.selection ?? {}) as CustomizationSelection;
  const breakdown = (payload.breakdown ?? []) as { label: string; amountCents: number }[];

  return (
    <div className="mt-1 flex flex-col gap-3 border border-gold/25 bg-gold/[0.04] p-4">
      <span className="text-[10px] uppercase tracking-luxe text-gold">
        Personalisation — production notes
      </span>
      <div className="flex flex-wrap items-start gap-5">
        {selection.imageUrl ? (
          <a
            href={selection.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-1"
          >
            <span
              className="h-24 w-24 rounded-sm bg-cover bg-center ring-1 ring-inset ring-gold/30"
              style={{ backgroundImage: `url(${selection.imageUrl})` }}
            />
            <span className="text-[10px] text-bone/40 group-hover:text-gold">
              Open full image ↗
            </span>
          </a>
        ) : null}
        <dl className="flex flex-1 flex-col gap-1.5 text-sm text-bone/75">
          {selection.text ? (
            <div className="flex gap-2">
              <dt className="text-bone/40">Engraving:</dt>
              <dd className="font-serif text-bone">“{selection.text}”</dd>
            </div>
          ) : null}
          {(payload.bottleOptionLabel as string) ? (
            <div className="flex gap-2">
              <dt className="text-bone/40">Bottle:</dt>
              <dd>{payload.bottleOptionLabel as string}</dd>
            </div>
          ) : null}
          {(payload.packagingOptionLabel as string) ? (
            <div className="flex gap-2">
              <dt className="text-bone/40">Packaging:</dt>
              <dd>{payload.packagingOptionLabel as string}</dd>
            </div>
          ) : null}
          {selection.imagePath ? (
            <div className="flex gap-2 text-[11px] text-bone/35">
              <dt>Storage path:</dt>
              <dd className="break-all">{selection.imagePath}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      {breakdown.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-gold/15 pt-2 text-[11px] text-bone/45">
          {breakdown.map((b, i) => (
            <li key={i} className="flex justify-between">
              <span>{b.label}</span>
              <span>
                {b.amountCents > 0 ? <Price amount={b.amountCents} /> : "included"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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
