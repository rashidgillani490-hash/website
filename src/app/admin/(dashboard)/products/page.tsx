import Link from "next/link";
import { getAdminRepo } from "@/lib/admin/repo";
import { Panel } from "@/components/admin/ui";
import { TableToolbar, Pagination } from "@/components/admin/controls";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { Price } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { ProductListParams } from "@/lib/admin/records";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const repo = await getAdminRepo();

  const params: ProductListParams = {
    search: first(sp.q),
    category: first(sp.category) ?? "all",
    family: first(sp.family) ?? "all",
    status: (first(sp.status) as ProductListParams["status"]) ?? "all",
    featured: (first(sp.featured) as ProductListParams["featured"]) ?? "all",
    sort: (first(sp.sort) as ProductListParams["sort"]) ?? "recent",
    page: Number(first(sp.page) ?? "1") || 1,
    pageSize: 10,
  };

  const [result, categories] = await Promise.all([
    repo.listProducts(params),
    repo.listCategories(),
  ]);

  const familyOptions = [
    ...new Set(result.items.flatMap((i) => i.families)),
  ].sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-lg text-sm text-bone/50">
          Manage the full catalogue — details, notes, variants, pricing, imagery
          and 3D models. Changes are written to{" "}
          <span className="text-bone/70">{repo.backend === "supabase" ? "Supabase" : "the local store"}</span>{" "}
          and reflected on the storefront.
        </p>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center bg-bone px-6 text-[11px] font-medium uppercase tracking-wide2 text-ink"
        >
          Add product
        </Link>
      </div>

      <TableToolbar
        searchPlaceholder="Search name, slug, SKU…"
        filters={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "all", label: "All statuses" },
              { value: "active", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ],
          },
          {
            name: "category",
            label: "Category",
            options: [
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ],
          },
          {
            name: "family",
            label: "Family",
            options: [
              { value: "all", label: "All families" },
              ...familyOptions.map((f) => ({ value: f, label: cap(f) })),
            ],
          },
          {
            name: "featured",
            label: "Featured",
            options: [
              { value: "all", label: "Featured: any" },
              { value: "yes", label: "Featured only" },
              { value: "no", label: "Not featured" },
            ],
          },
          {
            name: "sort",
            label: "Sort",
            options: [
              { value: "recent", label: "Recently updated" },
              { value: "name", label: "Name A–Z" },
              { value: "price-asc", label: "Price low–high" },
              { value: "price-desc", label: "Price high–low" },
              { value: "stock", label: "Lowest stock" },
            ],
          },
        ]}
      />

      <Panel title={`Products · ${result.total}`}>
        {result.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-bone/40">
            No products match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-bone/10 text-[11px] uppercase tracking-wide2 text-bone/40">
                  <th className="px-3 py-3 font-medium first:pl-0">Product</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Price from</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Variants</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/5">
                {result.items.map((p) => (
                  <tr key={p.id} className="align-middle transition-colors hover:bg-bone/[0.03]">
                    <td className="px-3 py-3 first:pl-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-10 shrink-0 bg-ink-soft bg-cover bg-center"
                          style={
                            p.primary_image
                              ? { backgroundImage: `url(${p.primary_image})` }
                              : undefined
                          }
                        />
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-bone hover:text-gold"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[11px] text-bone/35">
                            {p.slug}
                            {p.is_featured ? " · featured" : ""}
                            {p.is_new ? " · new" : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-bone/60">{p.category_name ?? "—"}</td>
                    <td className="px-3 py-3 text-bone/70">
                      {p.min_price_cents !== null ? <Price amount={p.min_price_cents} /> : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3",
                        p.total_stock === 0
                          ? "text-red-300"
                          : p.total_stock < 20
                            ? "text-amber-300"
                            : "text-bone/60",
                      )}
                    >
                      {p.total_stock}
                    </td>
                    <td className="px-3 py-3 text-bone/50">{p.variant_count}</td>
                    <td className="px-3 py-3">
                      <StatusTag status={p.status} />
                    </td>
                    <td className="px-3 py-3">
                      <ProductRowActions
                        id={p.id}
                        slug={p.slug}
                        status={p.status}
                        featured={p.is_featured}
                      />
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

function StatusTag({ status }: { status: string }) {
  const tone =
    {
      active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      draft: "border-bone/20 bg-bone/5 text-bone/50",
      archived: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    }[status] ?? "border-bone/20 text-bone/50";
  const label = { active: "Published", draft: "Draft", archived: "Archived" }[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide2",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
