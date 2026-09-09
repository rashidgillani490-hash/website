import { getProducts } from "@/lib/cms";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";

export default async function WishlistPage() {
  // Demo: show a curated subset. A later phase reads the customer's wishlist rows.
  const all = await getProducts();
  const wishlist = all.filter((p) =>
    ["rose-close", "heure-bleue-77", "ambre-lumen"].includes(p.slug),
  );

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-serif text-2xl">Wishlist</h2>
      {wishlist.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart on any fragrance to save it here."
          action={
            <Button href="/fragrances" size="sm">
              Browse fragrances
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
          {wishlist.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
