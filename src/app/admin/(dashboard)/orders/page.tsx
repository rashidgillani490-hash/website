import Link from "next/link";
import { getAdminRepo } from "@/lib/admin/repo";
import { Panel, StatCard } from "@/components/admin/ui";
import { TableToolbar, Pagination } from "@/components/admin/controls";
import { Price } from "@/components/ui/misc";
import { ORDER_STATUS_LABELS } from "@/lib/admin/records";
import { cn } from "@/lib/utils";
import type { OrderQueryParams, OrderStatusValue } from "@/lib/admin/records";

const statusTone: Record<OrderStatusValue, string> = {
  pending: "border-bone/20 bg-bone/5 text-bone/60",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  processing: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  shipped: "border-gold/40 bg-gold/10 text-gold",
  out_for_delivery: "border-gold/40 bg-gold/10 text-gold",
  delivered: "border-bone/20 bg-bone/5 text-bone/50",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const repo = await getAdminRepo();

  const params: OrderQueryParams = {
    search: first(sp.q),
    status: (first(sp.status) as OrderQueryParams["status"]) ?? "all",
    paymentMethod: (first(sp.method) as OrderQueryParams["paymentMethod"]) ?? "all",
    sort: (first(sp.sort) as OrderQueryParams["sort"]) ?? "recent",
    page: Number(first(sp.page) ?? "1") || 1,
    pageSize: 20,
  };

  // Stats look at the unfiltered set so they read as "the whole book", not
  // "this page of results".
  const [result, all] = await Promise.all([
    repo.listOrders(params),
    repo.listOrders({ pageSize: 100000 }),
  ]);

  const revenue = all.items
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + o.total_cents, 0);
  const personalised = all.items.reduce((n, o) => n + o.personalised_count, 0);
  const needsAttention = all.items.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Orders" value={String(all.total)} hint="all time" />
        <StatCard label="Revenue" value={`Rs ${(revenue / 100).toFixed(0)}`} hint="excl. cancelled" />
        <StatCard label="Needs attention" value={String(needsAttention)} hint="pending / confirmed" />
        <StatCard label="Personalised lines" value={String(personalised)} hint="need production notes" />
      </div>

      <TableToolbar
        searchPlaceholder="Search order #, email, tracking…"
        filters={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "all", label: "All statuses" },
              ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatusValue[]).map((s) => ({
                value: s,
                label: ORDER_STATUS_LABELS[s],
              })),
            ],
          },
          {
            name: "method",
            label: "Payment method",
            options: [
              { value: "all", label: "All payment methods" },
              { value: "cod", label: "Cash on Delivery" },
              { value: "jazzcash", label: "JazzCash" },
              { value: "easypaisa", label: "Easypaisa" },
              { value: "bank_transfer", label: "Bank transfer" },
              { value: "card", label: "Card" },
            ],
          },
          {
            name: "sort",
            label: "Sort",
            options: [
              { value: "recent", label: "Most recent" },
              { value: "oldest", label: "Oldest first" },
              { value: "total-desc", label: "Total high–low" },
              { value: "total-asc", label: "Total low–high" },
            ],
          },
        ]}
      />

      <Panel title={`Orders · ${result.total}`}>
        {result.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-bone/40">
            No orders match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-bone/10 text-[11px] uppercase tracking-wide2 text-bone/40">
                  <th className="px-3 py-3 font-medium first:pl-0">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Placed</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/5">
                {result.items.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-bone/[0.03]">
                    <td className="px-3 py-4 first:pl-0">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-bone hover:text-gold"
                      >
                        {o.order_number}
                      </Link>
                      {o.tracking_number ? (
                        <div className="mt-0.5 text-[10px] text-bone/35">
                          Tracking: {o.tracking_number}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-4 text-bone/60">
                      <div className="flex flex-col">
                        {o.customer_name ? (
                          <span className="text-bone/80">{o.customer_name}</span>
                        ) : null}
                        <span className="text-xs text-bone/45">{o.email}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-bone/50">
                      {new Date(o.placed_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-3 py-4 text-bone/60">
                      {o.item_count}
                      {o.personalised_count > 0 ? (
                        <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wide2 text-gold">
                          {o.personalised_count} personalised
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-4 text-bone/50">
                      <div className="flex flex-col text-xs">
                        <span className="uppercase tracking-wide2">{o.payment_method}</span>
                        <span className="text-bone/35">{o.payment_status}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide2",
                          statusTone[o.status],
                        )}
                      >
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <Price amount={o.total_cents} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6">
          <Pagination page={result.page} pageCount={result.pageCount} total={result.total} />
        </div>
      </Panel>
    </div>
  );
}
