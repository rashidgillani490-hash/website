import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";

export function ProductGrid({
  products,
  emptyHref = "/fragrances",
}: {
  products: Product[];
  emptyHref?: string;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No fragrances match these filters"
        description="Try broadening your selection or explore the full wardrobe."
        action={
          <Button href={emptyHref} variant="outline" size="sm">
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} priority={i < 3} />
      ))}
    </div>
  );
}
