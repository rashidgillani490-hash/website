import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRepo } from "@/lib/admin/repo";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getAdminRepo();
  const [detail, categories, notes] = await Promise.all([
    repo.getProduct(id),
    repo.listCategories(),
    repo.listNotes(),
  ]);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/products"
        className="text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone"
      >
        ← Back to products
      </Link>
      <ProductEditor detail={detail} categories={categories} notes={notes} />
    </div>
  );
}
