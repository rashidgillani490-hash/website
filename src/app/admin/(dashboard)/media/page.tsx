import Link from "next/link";
import { getAdminRepo } from "@/lib/admin/repo";
import { Panel } from "@/components/admin/ui";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { MEDIA_BUCKET } from "@/lib/admin/storage";

export default async function AdminMediaPage() {
  const repo = await getAdminRepo();
  const [{ images, models }, all] = await Promise.all([
    repo.listAllMedia(),
    repo.listProducts({ pageSize: 10000 }),
  ]);
  const productName = new Map(all.items.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-xl text-sm text-bone/50">
        Every asset attached to a product. Uploads go to{" "}
        <span className="text-bone/70">
          {isSupabaseAdminConfigured()
            ? `Supabase Storage (bucket "${MEDIA_BUCKET}")`
            : "public/uploads (local dev fallback)"}
        </span>
        . Add, replace, reorder and delete media from each product&apos;s editor.
      </p>

      <Panel title={`Images · ${images.length}`}>
        {images.length === 0 ? (
          <p className="py-6 text-sm text-bone/30">No images yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {images.map((img) => (
              <Link
                key={img.id}
                href={`/admin/products/${img.product_id}`}
                className="flex flex-col gap-2"
              >
                <div
                  className="aspect-square w-full bg-ink-soft bg-cover bg-center ring-1 ring-inset ring-bone/10"
                  style={{ backgroundImage: `url(${img.url})` }}
                />
                <span className="truncate text-[11px] text-bone/40">
                  {productName.get(img.product_id) ?? "—"}
                  {img.is_primary ? " · primary" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`3D models · ${models.filter((m) => m.model_url).length}`}>
        {models.filter((m) => m.model_url).length === 0 ? (
          <p className="py-6 text-sm text-bone/30">
            No uploaded 3D models — products fall back to a procedural flacon.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-bone/10 text-sm">
            {models
              .filter((m) => m.model_url)
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <Link
                    href={`/admin/products/${m.product_id}`}
                    className="text-bone/75 hover:text-gold"
                  >
                    {productName.get(m.product_id) ?? "—"}
                  </Link>
                  <span className="text-[10px] uppercase tracking-wide2 text-bone/35">
                    {m.format}
                    {m.is_active ? " · active" : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
