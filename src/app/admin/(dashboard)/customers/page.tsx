import { Panel, DataTable, StatCard } from "@/components/admin/ui";
import { Price } from "@/components/ui/misc";

const CUSTOMERS = [
  { name: "Camille Fontaine", email: "camille.fontaine@example.com", orders: 9, spent: 214000, tier: "Gold" },
  { name: "Julien Marchetti", email: "j.marchetti@example.com", orders: 4, spent: 91500, tier: "Silver" },
  { name: "Amara Osei", email: "amara.osei@example.com", orders: 12, spent: 338000, tier: "Gold" },
  { name: "Lars Henningsen", email: "lars.h@example.com", orders: 2, spent: 47000, tier: "Entry" },
  { name: "Sofia Marchetti", email: "sofia.m@example.com", orders: 6, spent: 128000, tier: "Silver" },
];

export default function AdminCustomersPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Customers" value="1,284" delta="+4.2%" />
        <StatCard label="Repeat rate" value="38%" delta="+2.0%" />
        <StatCard label="Lifetime value (avg)" value="$486" />
      </div>
      <Panel title="Directory">
        <DataTable
          columns={["Name", "Email", "Orders", "Total spent", "Tier"]}
          rows={CUSTOMERS.map((c) => [
            <span key="n" className="font-medium text-bone">
              {c.name}
            </span>,
            <span key="e" className="text-bone/50">
              {c.email}
            </span>,
            c.orders,
            <Price key="s" amount={c.spent} />,
            c.tier,
          ])}
        />
      </Panel>
    </div>
  );
}
