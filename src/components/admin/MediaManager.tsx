"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowUp, ArrowDown, Box, UploadCloud } from "lucide-react";
import {
  uploadImageAction,
  deleteImageAction,
  setPrimaryImageAction,
  moveImageAction,
  uploadModelAction,
  deleteModelAction,
  setActiveModelAction,
} from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  AdminButton,
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import type { ImageRecord, ModelRecord } from "@/lib/admin/records";

export function MediaManager({
  productId,
  slug,
  images,
  models,
}: {
  productId: string;
  slug: string;
  images: ImageRecord[];
  models: ModelRecord[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <ImagesPanel productId={productId} slug={slug} images={images} />
      <ModelsPanel productId={productId} slug={slug} models={models} />
    </div>
  );
}

/* --------------------------------------------------------------- images */

function ImagesPanel({
  productId,
  slug,
  images,
}: {
  productId: string;
  slug: string;
  images: ImageRecord[];
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("slug", slug);
    fd.set("alt", alt);
    fd.set("file", file);
    run(() => uploadImageAction(fd), (r) => {
      if (r.ok) {
        if (fileRef.current) fileRef.current.value = "";
        setAlt("");
        router.refresh();
      }
    });
  }

  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <Panel
      title={`Product images · ${images.length}`}
      action={pending ? <Spinner /> : <ResultNote result={result} />}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((img, i) => (
            <figure key={img.id} className="flex flex-col gap-2 border border-bone/10 p-2">
              <div
                className="aspect-square w-full bg-ink-soft bg-cover bg-center"
                style={{ backgroundImage: `url(${img.url})` }}
              />
              <figcaption className="flex flex-col gap-1.5">
                <span className="truncate text-[10px] text-bone/40" title={img.url}>
                  {img.alt || "—"}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    title="Set as primary"
                    onClick={() =>
                      run(
                        () => setPrimaryImageAction(productId, img.id),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                    className={`grid h-7 w-7 place-items-center border ${
                      img.is_primary
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-bone/15 text-bone/40 hover:text-bone"
                    }`}
                  >
                    <Star size={12} className={img.is_primary ? "fill-gold" : ""} />
                  </button>
                  <button
                    title="Move earlier"
                    disabled={i === 0}
                    onClick={() =>
                      run(
                        () => moveImageAction(productId, img.id, "up"),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                    className="grid h-7 w-7 place-items-center border border-bone/15 text-bone/40 hover:text-bone disabled:opacity-30"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    title="Move later"
                    disabled={i === sorted.length - 1}
                    onClick={() =>
                      run(
                        () => moveImageAction(productId, img.id, "down"),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                    className="grid h-7 w-7 place-items-center border border-bone/15 text-bone/40 hover:text-bone disabled:opacity-30"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <ConfirmButton
                    label="Del"
                    message="Delete image?"
                    onConfirm={() =>
                      run(
                        () => deleteImageAction(productId, img.id),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                  />
                </div>
              </figcaption>
            </figure>
          ))}
          {images.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-bone/30">
              No images yet — upload one below.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-bone/10 pt-5">
          <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wide2 text-bone/40">
            Image file (JPEG / PNG / WebP / AVIF, ≤ 8 MB)
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="text-xs text-bone/60 file:mr-3 file:border file:border-bone/20 file:bg-transparent file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-wide2 file:text-bone/70"
            />
          </label>
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Alt text (optional)"
            className="h-9 w-56 border border-bone/20 bg-transparent px-2 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
          />
          <AdminButton onClick={upload} disabled={pending}>
            <UploadCloud size={13} /> Upload image
          </AdminButton>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- models */

function ModelsPanel({
  productId,
  slug,
  models,
}: {
  productId: string;
  slug: string;
  models: ModelRecord[];
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const fileRef = useRef<HTMLInputElement>(null);

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("slug", slug);
    fd.set("file", file);
    run(() => uploadModelAction(fd), (r) => {
      if (r.ok) {
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <Panel
      title={`3D models · ${models.length}`}
      action={pending ? <Spinner /> : <ResultNote result={result} />}
    >
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col divide-y divide-bone/10">
          {models.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Box size={16} className="text-bone/40" />
                <div className="flex flex-col">
                  <a
                    href={m.model_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-bone/75 hover:text-gold"
                  >
                    {m.model_url ? m.model_url.split("/").pop() : "Procedural (no file)"}
                  </a>
                  <span className="text-[10px] uppercase tracking-wide2 text-bone/35">
                    {m.format}
                    {m.is_active ? " · active" : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!m.is_active ? (
                  <AdminButton
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      run(
                        () => setActiveModelAction(productId, m.id),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                  >
                    Set active
                  </AdminButton>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide2 text-gold">active</span>
                )}
                <ConfirmButton
                  label="Delete"
                  message="Delete model?"
                  onConfirm={() =>
                    run(
                      () => deleteModelAction(productId, m.id),
                      (r) => r.ok && router.refresh(),
                    )
                  }
                />
              </div>
            </li>
          ))}
          {models.length === 0 ? (
            <li className="py-4 text-sm text-bone/30">
              No 3D model — the showcase renders a procedural flacon.
            </li>
          ) : null}
        </ul>

        <div className="flex flex-wrap items-end gap-3 border-t border-bone/10 pt-5">
          <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wide2 text-bone/40">
            Model file (.glb / .gltf, ≤ 40 MB)
            <input
              ref={fileRef}
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              className="text-xs text-bone/60 file:mr-3 file:border file:border-bone/20 file:bg-transparent file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-wide2 file:text-bone/70"
            />
          </label>
          <AdminButton onClick={upload} disabled={pending}>
            <UploadCloud size={13} /> Upload model
          </AdminButton>
        </div>
      </div>
    </Panel>
  );
}
