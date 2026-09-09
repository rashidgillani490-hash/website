"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { saveCustomizationConfigAction } from "@/app/admin/actions";
import { parseCustomizationConfig } from "@/lib/customization/pricing";
import type {
  CustomOption,
  ProductCustomizationConfig,
} from "@/lib/customization/types";
import { Panel } from "./ui";
import { AdminButton, ResultNote, Spinner, useActionRunner } from "./controls";
import { Field, Input } from "@/components/ui/form";
import { slugify } from "@/lib/utils";
import { Price } from "@/components/ui/misc";

const toDollars = (c: number) => (c / 100).toFixed(2);
const toCents = (v: string) => Math.max(0, Math.round(parseFloat(v || "0") * 100));

export function CustomizationConfigEditor({
  productId,
  initial,
}: {
  productId: string;
  initial?: Record<string, unknown> | ProductCustomizationConfig;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [cfg, setCfg] = useState<ProductCustomizationConfig>(() =>
    parseCustomizationConfig(initial),
  );
  const set = (patch: Partial<ProductCustomizationConfig>) =>
    setCfg((c) => ({ ...c, ...patch }));

  function addOption(key: "bottleOptions" | "packagingOptions") {
    const opts = cfg[key];
    set({
      [key]: [
        ...opts,
        { id: `opt-${opts.length + 1}`, label: "", priceCents: 0 },
      ],
    } as Partial<ProductCustomizationConfig>);
  }
  function setOption(
    key: "bottleOptions" | "packagingOptions",
    idx: number,
    patch: Partial<CustomOption>,
  ) {
    set({
      [key]: cfg[key].map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    } as Partial<ProductCustomizationConfig>);
  }
  function removeOption(key: "bottleOptions" | "packagingOptions", idx: number) {
    set({
      [key]: cfg[key].filter((_, i) => i !== idx),
    } as Partial<ProductCustomizationConfig>);
  }

  function save() {
    // Fill blank ids from labels before sending.
    const normalised: ProductCustomizationConfig = {
      ...cfg,
      bottleOptions: cfg.bottleOptions
        .filter((o) => o.label.trim())
        .map((o) => ({ ...o, id: o.id || slugify(o.label) })),
      packagingOptions: cfg.packagingOptions
        .filter((o) => o.label.trim())
        .map((o) => ({ ...o, id: o.id || slugify(o.label) })),
    };
    run(
      () => saveCustomizationConfigAction(productId, normalised),
      (r) => r.ok && router.refresh(),
    );
  }

  return (
    <Panel
      title="Customisation"
      action={
        <div className="flex items-center gap-3">
          {pending ? <Spinner /> : <ResultNote result={result} />}
          <AdminButton onClick={save} disabled={pending}>
            Save customisation
          </AdminButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <label className="flex items-center justify-between border-b border-bone/10 pb-4 text-sm text-bone/75">
          <span>
            Allow customers to personalise this product
            <span className="block text-xs text-bone/40">
              Shows the &ldquo;Make it yours&rdquo; panel on the product page.
            </span>
          </span>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="accent-gold"
          />
        </label>

        <fieldset
          className={cfg.enabled ? "flex flex-col gap-6" : "pointer-events-none flex flex-col gap-6 opacity-40"}
          disabled={!cfg.enabled}
        >
          {/* Text */}
          <div className="flex flex-col gap-3 border-b border-bone/10 pb-5">
            <label className="flex items-center justify-between text-sm text-bone/70">
              <span>Custom engraved text / name</span>
              <input
                type="checkbox"
                checked={cfg.allowText}
                onChange={(e) => set({ allowText: e.target.checked })}
                className="accent-gold"
              />
            </label>
            {cfg.allowText ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Max characters" htmlFor="c-textmax">
                  <Input
                    id="c-textmax"
                    type="number"
                    value={cfg.textMaxLength}
                    onChange={(e) =>
                      set({ textMaxLength: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </Field>
                <Field label="Surcharge ($)" htmlFor="c-textprice">
                  <Input
                    id="c-textprice"
                    type="number"
                    step="0.01"
                    value={toDollars(cfg.textPriceCents)}
                    onChange={(e) => set({ textPriceCents: toCents(e.target.value) })}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {/* Image */}
          <div className="flex flex-col gap-3 border-b border-bone/10 pb-5">
            <label className="flex items-center justify-between text-sm text-bone/70">
              <span>Customer image upload (JPEG / PNG / WebP, ≤ 5 MB)</span>
              <input
                type="checkbox"
                checked={cfg.allowImage}
                onChange={(e) => set({ allowImage: e.target.checked })}
                className="accent-gold"
              />
            </label>
            {cfg.allowImage ? (
              <Field label="Surcharge ($)" htmlFor="c-imgprice">
                <Input
                  id="c-imgprice"
                  type="number"
                  step="0.01"
                  value={toDollars(cfg.imagePriceCents)}
                  onChange={(e) => set({ imagePriceCents: toCents(e.target.value) })}
                />
              </Field>
            ) : null}
          </div>

          <OptionList
            title="Bottle options"
            options={cfg.bottleOptions}
            onAdd={() => addOption("bottleOptions")}
            onChange={(i, p) => setOption("bottleOptions", i, p)}
            onRemove={(i) => removeOption("bottleOptions", i)}
          />
          <OptionList
            title="Packaging options"
            options={cfg.packagingOptions}
            onAdd={() => addOption("packagingOptions")}
            onChange={(i, p) => setOption("packagingOptions", i, p)}
            onRemove={(i) => removeOption("packagingOptions", i)}
          />
        </fieldset>
      </div>
    </Panel>
  );
}

function OptionList({
  title,
  options,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  options: CustomOption[];
  onAdd: () => void;
  onChange: (idx: number, patch: Partial<CustomOption>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-luxe text-bone/50">{title}</span>
        <AdminButton size="xs" variant="outline" onClick={onAdd}>
          <Plus size={12} /> Add
        </AdminButton>
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-bone/30">None — customers won&apos;t see this group.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {options.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
              <input
                value={o.label}
                placeholder="Option label"
                onChange={(e) => onChange(i, { label: e.target.value })}
                className="h-9 border border-bone/20 bg-transparent px-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-bone/40">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={toDollars(o.priceCents)}
                  onChange={(e) => onChange(i, { priceCents: toCents(e.target.value) })}
                  className="h-9 w-full border border-bone/20 bg-transparent px-2 text-sm text-bone focus:border-gold focus:outline-none"
                />
              </div>
              <button
                onClick={() => onRemove(i)}
                className="grid h-9 place-items-center border border-bone/15 text-bone/40 hover:text-red-300"
                aria-label="Remove option"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {options.some((o) => o.priceCents > 0) ? (
        <p className="text-[10px] text-bone/30">
          e.g. “{options.find((o) => o.priceCents > 0)?.label || "Option"}” adds{" "}
          <Price amount={options.find((o) => o.priceCents > 0)?.priceCents ?? 0} />.
        </p>
      ) : null}
    </div>
  );
}
