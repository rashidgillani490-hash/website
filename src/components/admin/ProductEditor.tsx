"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  setProductStatusAction,
  setProductFeaturedAction,
  deleteProductAction,
} from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import { ProductDetailsForm } from "./ProductDetailsForm";
import { VariantsEditor } from "./VariantsEditor";
import { NotesPicker } from "./NotesPicker";
import { MediaManager } from "./MediaManager";
import { CustomizationConfigEditor } from "./CustomizationConfigEditor";
import type {
  CategoryRecord,
  NoteRecord,
  ProductDetail,
} from "@/lib/admin/records";

export function ProductEditor({
  detail,
  categories,
  notes,
}: {
  detail: ProductDetail;
  categories: CategoryRecord[];
  notes: NoteRecord[];
}) {
  const { product } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">{product.name}</h2>
          <p className="mt-1 text-xs text-bone/40">
            {product.slug} · {product.status}
          </p>
        </div>
        <Link
          href={`/fragrances/${product.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide2 text-bone/50 hover:text-bone"
        >
          <ExternalLink size={13} /> View on storefront
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <ProductDetailsForm product={product} categories={categories} />
          <VariantsEditor productId={product.id} variants={detail.variants} />
          <NotesPicker
            productId={product.id}
            allNotes={notes}
            current={detail.notes}
          />
          <MediaManager
            productId={product.id}
            slug={product.slug}
            images={detail.images}
            models={detail.models}
          />
          <CustomizationConfigEditor
            productId={product.id}
            initial={product.customization}
          />
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <PublishCard
            id={product.id}
            status={product.status}
            featured={product.is_featured}
          />
          <Panel title="Danger zone">
            <DeleteProduct id={product.id} name={product.name} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PublishCard({
  id,
  status,
  featured,
}: {
  id: string;
  status: "draft" | "active" | "archived";
  featured: boolean;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();

  return (
    <Panel title="Visibility" action={pending ? <Spinner /> : null}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wide2 text-bone/40">Status</span>
          <div className="flex flex-wrap gap-2">
            {(["draft", "active", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() =>
                  run(() => setProductStatusAction(id, s), (r) => r.ok && router.refresh())
                }
                className={`h-8 px-3 text-[10px] font-medium uppercase tracking-wide2 border transition-colors ${
                  status === s
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-bone/15 text-bone/50 hover:border-bone/40"
                }`}
              >
                {s === "active" ? "Published" : s}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between border-t border-bone/10 pt-4 text-sm text-bone/70">
          Featured on homepage
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) =>
              run(
                () => setProductFeaturedAction(id, e.target.checked),
                (r) => r.ok && router.refresh(),
              )
            }
            className="accent-gold"
          />
        </label>

        <ResultNote result={result} />
      </div>
    </Panel>
  );
}

function DeleteProduct({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-bone/45">
        Permanently delete <span className="text-bone/70">{name}</span> and all its
        variants, notes and media.
      </p>
      <div className="flex items-center gap-3">
        <ConfirmButton
          label="Delete product"
          confirmLabel="Delete permanently"
          message="This cannot be undone."
          size="sm"
          onConfirm={() =>
            run(
              () => deleteProductAction(id),
              (r) => {
                if (r.ok) router.push("/admin/products");
              },
            )
          }
        />
        {pending ? <Spinner /> : <ResultNote result={result} />}
      </div>
    </div>
  );
}
