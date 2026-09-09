"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, X, Sparkles, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";
import type {
  CustomizationLine,
  CustomizationSelection,
} from "@/lib/customization/types";
import { emptyCustomizationConfig } from "@/lib/customization/types";
import { validateCustomerImage } from "@/lib/customization/validation";
import {
  priceCustomizationAction,
  uploadCustomizationImageAction,
} from "@/app/(site)/actions";
import { Price } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function CustomizePanel({
  product,
  onChange,
}: {
  product: Product;
  onChange: (line: CustomizationLine | null, pending: boolean) => void;
}) {
  const config = product.customization ?? emptyCustomizationConfig;

  const [selection, setSelection] = useState<CustomizationSelection>({});
  const [line, setLine] = useState<CustomizationLine | null>(null);
  const [pricing, setPricing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const hasSelection =
    !!selection.text ||
    !!selection.imageUrl ||
    !!selection.bottleOptionId ||
    !!selection.packagingOptionId;

  // Server-verified pricing whenever the selection changes (debounced).
  useEffect(() => {
    if (!config.enabled) return;
    if (!hasSelection) {
      setLine(null);
      onChange(null, false);
      return;
    }
    setPricing(true);
    onChange(line, true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await priceCustomizationAction(product.slug, selection);
      if (id !== reqId.current) return; // stale
      setPricing(false);
      if (res.ok && res.line) {
        setLine(res.line);
        onChange(res.line, false);
      } else {
        setLine(null);
        onChange(null, false);
      }
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, config.enabled]);

  const set = useCallback(
    (patch: Partial<CustomizationSelection>) =>
      setSelection((s) => ({ ...s, ...patch })),
    [],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImgError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateCustomerImage({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!check.ok) {
      setImgError(check.error ?? "Invalid image.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadCustomizationImageAction(fd);
      if (res.ok && res.url) {
        set({ imageUrl: res.url, imagePath: res.path ?? null });
      } else {
        setImgError(res.message ?? "Upload failed.");
      }
    } catch {
      setImgError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage() {
    set({ imageUrl: null, imagePath: null });
    setImgError(null);
  }

  if (!config.enabled) return null;

  return (
    <section className="flex flex-col gap-6 border border-gold/25 bg-gold/[0.03] p-6">
      <header className="flex items-center gap-2">
        <Sparkles size={16} className="text-gold" />
        <h3 className="font-serif text-xl">Make it yours</h3>
      </header>

      {/* Custom text */}
      {config.allowText ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="cust-text"
            className="flex items-center justify-between text-[11px] uppercase tracking-luxe text-bone/50"
          >
            <span>Engrave a name or word</span>
            {config.textPriceCents > 0 ? (
              <span className="text-gold">
                + <Price amount={config.textPriceCents} />
              </span>
            ) : null}
          </label>
          <input
            id="cust-text"
            value={selection.text ?? ""}
            maxLength={config.textMaxLength}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="e.g. Camille"
            className="w-full border border-bone/20 bg-transparent px-4 py-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
          />
          <span className="self-end text-[10px] text-bone/35">
            {(selection.text ?? "").length}/{config.textMaxLength}
          </span>
        </div>
      ) : null}

      {/* Custom image */}
      {config.allowImage ? (
        <div className="flex flex-col gap-3">
          <span className="flex items-center justify-between text-[11px] uppercase tracking-luxe text-bone/50">
            <span>Your own label image</span>
            {config.imagePriceCents > 0 ? (
              <span className="text-gold">
                + <Price amount={config.imagePriceCents} />
              </span>
            ) : null}
          </span>

          {selection.imageUrl ? (
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-bone/15 bg-ink-soft">
                <Image
                  src={selection.imageUrl}
                  alt="Your uploaded label"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <button
                onClick={removeImage}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide2 text-bone/50 hover:text-bone"
              >
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 border border-dashed border-bone/25 px-4 py-4 text-xs text-bone/55 transition-colors hover:border-gold/50">
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-gold" />
              ) : (
                <UploadCloud size={16} className="text-bone/40" />
              )}
              <span>
                {uploading
                  ? "Uploading…"
                  : "Upload a JPEG, PNG or WebP — up to 5 MB"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
          {imgError ? (
            <p className="text-xs text-red-400">{imgError}</p>
          ) : null}
        </div>
      ) : null}

      {/* Bottle options */}
      {config.bottleOptions.length > 0 ? (
        <OptionGroup
          label="Bottle"
          options={config.bottleOptions}
          value={selection.bottleOptionId ?? null}
          onSelect={(id) =>
            set({ bottleOptionId: selection.bottleOptionId === id ? null : id })
          }
        />
      ) : null}

      {/* Packaging options */}
      {config.packagingOptions.length > 0 ? (
        <OptionGroup
          label="Packaging"
          options={config.packagingOptions}
          value={selection.packagingOptionId ?? null}
          onSelect={(id) =>
            set({
              packagingOptionId: selection.packagingOptionId === id ? null : id,
            })
          }
        />
      ) : null}

      {/* Live configuration + verified price */}
      <div className="flex flex-col gap-2 border-t border-bone/10 pt-4">
        <span className="text-[11px] uppercase tracking-luxe text-bone/50">
          Your configuration
        </span>
        {hasSelection ? (
          <ul className="flex flex-col gap-1.5 text-sm text-bone/70">
            {selection.text ? <li>Engraving: “{selection.text}”</li> : null}
            {selection.imageUrl ? <li>Custom label image attached</li> : null}
            {line?.bottleOptionLabel ? <li>Bottle: {line.bottleOptionLabel}</li> : null}
            {line?.packagingOptionLabel ? (
              <li>Packaging: {line.packagingOptionLabel}</li>
            ) : null}
          </ul>
        ) : (
          <p className="text-xs text-bone/35">
            Add a name, image or option above — nothing is required.
          </p>
        )}

        {hasSelection ? (
          <div className="mt-2 flex items-center justify-between border-t border-bone/10 pt-3">
            <span className="text-sm text-bone/60">Personalisation</span>
            <span className="flex items-center gap-2 font-serif text-lg text-bone">
              {pricing ? (
                <Loader2 size={14} className="animate-spin text-bone/40" />
              ) : null}
              {line && line.deltaCents > 0 ? (
                <>
                  + <Price amount={line.deltaCents} />
                </>
              ) : (
                "Included"
              )}
            </span>
          </div>
        ) : null}

        {line && line.breakdown.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-1 text-[11px] text-bone/40">
            {line.breakdown.map((b, i) => (
              <li key={i} className="flex justify-between">
                <span>{b.label}</span>
                <span>
                  {b.amountCents > 0 ? <Price amount={b.amountCents} /> : "included"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1 text-[10px] text-bone/30">
          Prices are confirmed on the server — the total is recalculated again at
          checkout.
        </p>
      </div>
    </section>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string; priceCents: number }[];
  value: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-luxe text-bone/50">{label}</span>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className={cn(
              "flex items-center justify-between border px-4 py-3 text-left text-sm transition-colors",
              value === o.id
                ? "border-gold bg-gold/10 text-bone"
                : "border-bone/15 text-bone/70 hover:border-bone/40",
            )}
          >
            <span>{o.label}</span>
            <span className="text-xs text-bone/50">
              {o.priceCents > 0 ? (
                <>
                  + <Price amount={o.priceCents} />
                </>
              ) : (
                "Included"
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
