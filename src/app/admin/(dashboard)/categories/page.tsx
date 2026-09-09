import { getAdminRepo } from "@/lib/admin/repo";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const repo = await getAdminRepo();
  const [categories, all] = await Promise.all([
    repo.listCategories(),
    repo.listProducts({ pageSize: 10000 }),
  ]);

  const counts: Record<string, number> = {};
  for (const p of all.items) {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-lg text-sm text-bone/50">
        Categories group fragrances on the storefront and power the homepage
        collection grid. Written to{" "}
        <span className="text-bone/70">
          {repo.backend === "supabase" ? "Supabase" : "the local store"}
        </span>
        .
      </p>
      <CategoryManager categories={categories} counts={counts} />
    </div>
  );
}
