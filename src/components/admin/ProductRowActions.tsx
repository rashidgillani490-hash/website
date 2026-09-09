"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Eye, EyeOff } from "lucide-react";
import {
  setProductFeaturedAction,
  setProductStatusAction,
  deleteProductAction,
} from "@/app/admin/actions";
import {
  useActionRunner,
  ConfirmButton,
  ResultNote,
  Spinner,
} from "@/components/admin/controls";
import { cn } from "@/lib/utils";

export function ProductRowActions({
  id,
  slug,
  status,
  featured,
}: {
  id: string;
  slug: string;
  status: "draft" | "active" | "archived";
  featured: boolean;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const published = status === "active";

  return (
    <div className="flex items-center justify-end gap-2">
      {pending ? <Spinner /> : <ResultNote result={result} />}

      <button
        title={featured ? "Unfeature" : "Feature"}
        onClick={() => run(() => setProductFeaturedAction(id, !featured), () => router.refresh())}
        className={cn(
          "grid h-8 w-8 place-items-center border transition-colors",
          featured
            ? "border-gold/40 bg-gold/10 text-gold"
            : "border-bone/15 text-bone/40 hover:text-bone",
        )}
      >
        <Star size={13} className={featured ? "fill-gold" : ""} />
      </button>

      <button
        title={published ? "Unpublish" : "Publish"}
        onClick={() =>
          run(
            () => setProductStatusAction(id, published ? "draft" : "active"),
            () => router.refresh(),
          )
        }
        className={cn(
          "grid h-8 w-8 place-items-center border transition-colors",
          published
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-bone/15 text-bone/40 hover:text-bone",
        )}
      >
        {published ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>

      <Link
        href={`/admin/products/${id}`}
        className="grid h-8 items-center border border-bone/15 px-3 text-[10px] font-medium uppercase tracking-wide2 text-bone/70 hover:border-bone/40 hover:text-bone"
      >
        Edit
      </Link>

      <ConfirmButton
        label="Delete"
        message={`Delete "${slug}"?`}
        onConfirm={() =>
          run(() => deleteProductAction(id), (r) => {
            if (r.ok) router.refresh();
          })
        }
      />
    </div>
  );
}
