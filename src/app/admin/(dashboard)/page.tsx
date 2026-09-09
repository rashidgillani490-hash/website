import Link from "next/link";
import { getAdminRepo } from "@/lib/admin/repo";
import { demoOrders } from "@/lib/data/account";
import {
  StatCard,
  Panel,
  DataTable,
  StatusPill,
  MiniBarChart,
} from "@/components/admin/ui";
import { Price } from "@/components/ui/misc";

export default async function AdminOverviewPage() {
  const repo = await getAdminRepo();
  const [all, categories] = await Promise.all([
    repo.listProducts({ pageSize: 10000, sort: "stock" }),
    repo.listCategories(),
  ]);

  const published = all.items.filter((p) => p.status === "active").length;
  const drafts = all.items.filter((p) => p.status === "draft").length;
  const lowStock = all.items.filter((p) => p.total_stock < 20);

  const revenue = [
    { label: "Apr", value: 42 },
    { label: "May", value: 51 },
    { label: "Jun", value: 48 },
    { label: "Jul", value: 63 },
    { label: "Aug", value: 72 },
    { label: "Sep", value: 39 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published products" value={String(published)} hint={`${drafts} drafts`} />
        <StatCard label="Categories" value={String(categories.length)} hint="storefront groups" />
        <StatCard
          label="Low-stock lines"
          value={String(lowStock.length)}
          hint="under 20 units"
        />
        <StatCard label="Total catalogue" value={String(all.total)} hint="all statuses" />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Revenue by month (sample)">
          <MiniBarChart data={revenue} />
        </Panel>
        <Panel
          title="Inventory alerts"
          action={
            <Link href="/admin/products?sort=stock" className="text-xs text-gold link-underline">
              Manage
            </Link>
          }
        >
          <ul className="flex flex-col gap-3 text-sm">
            {lowStock.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <Link href={`/admin/products/${p.id}`} className="text-bone/70 hover:text-gold">
                  {p.name}
                </Link>
                <span className={p.total_stock < 10 ? "text-red-300" : "text-amber-300"}>
                  {p.total_stock} in stock
                </span>
              </li>
            ))}
            {lowStock.length === 0 ? (
              <li className="text-bone/40">All lines are well stocked.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Recent orders"
        action={
          <Link href="/admin/orders" className="text-xs text-gold link-underline">
            View all
          </Link>
        }
      >
        <DataTable
          columns={["Order", "Date", "Items", "Status", "Total"]}
          rows={demoOrders.map((o) => [
            <span key="id" className="font-medium text-bone">
              {o.id}
            </span>,
            new Date(o.date).toLocaleDateString("en-GB"),
            o.items.reduce((n, i) => n + i.qty, 0),
            <StatusPill key="s" status={o.status} />,
            <Price key="t" amount={o.total} />,
          ])}
        />
      </Panel>
    </div>
  );
}
