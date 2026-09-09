import Link from "next/link";
import { getAdminRepo } from "@/lib/admin/repo";
import { NewProductForm } from "@/components/admin/NewProductForm";

export default async function AdminNewProductPage() {
  const repo = await getAdminRepo();
  const categories = await repo.listCategories();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/products"
        className="text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone"
      >
        ← Back to products
      </Link>
      <div>
        <h2 className="font-serif text-2xl">Add a product</h2>
        <p className="mt-2 max-w-lg text-sm text-bone/50">
          Create the product first, then add variants, notes and media on the
          next screen.
        </p>
      </div>
      <NewProductForm categories={categories} />
    </div>
  );
}
