"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveVariantAction, deleteVariantAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  AdminButton,
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import type { VariantRecord } from "@/lib/admin/records";

interface Draft {
  volume_ml: string;
  price: string;
  sale: string;
  stock: string;
  sku: string;
}

const emptyDraft: Draft = { volume_ml: "", price: "", sale: "", stock: "0", sku: "" };

const toCents = (v: string) => Math.round(parseFloat(v || "0") * 100);
const toMajor = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

export function VariantsEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRecord[];
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<Draft>(emptyDraft);

  function addVariant() {
    run(
      () =>
        saveVariantAction(productId, {
          sku: draft.sku.trim(),
          volume_ml: Number(draft.volume_ml),
          price_cents: toCents(draft.price),
          compare_at_price_cents: draft.sale ? toCents(draft.sale) : null,
          stock_quantity: Number(draft.stock) || 0,
        }),
      (r) => {
        if (r.ok) {
          setDraft(emptyDraft);
          router.refresh();
        }
      },
    );
  }

  function startEdit(v: VariantRecord) {
    setEditing(v.id);
    setRowDraft({
      volume_ml: String(v.volume_ml),
      price: toMajor(v.price_cents),
      sale: toMajor(v.compare_at_price_cents),
      stock: String(v.stock_quantity),
      sku: v.sku,
    });
  }

  function saveEdit(v: VariantRecord) {
    run(
      () =>
        saveVariantAction(productId, {
          id: v.id,
          sku: rowDraft.sku.trim(),
          volume_ml: Number(rowDraft.volume_ml),
          price_cents: toCents(rowDraft.price),
          compare_at_price_cents: rowDraft.sale ? toCents(rowDraft.sale) : null,
          stock_quantity: Number(rowDraft.stock) || 0,
          is_default: v.is_default,
        }),
      (r) => {
        if (r.ok) {
          setEditing(null);
          router.refresh();
        }
      },
    );
  }

  return (
    <Panel
      title={`Variants & pricing · ${variants.length}`}
      action={pending ? <Spinner /> : <ResultNote result={result} />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-bone/10 text-[10px] uppercase tracking-wide2 text-bone/40">
              <th className="py-2 pr-3">Size (ml)</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Sale price</th>
              <th className="py-2 pr-3">Stock</th>
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Default</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/5">
            {variants.map((v) =>
              editing === v.id ? (
                <tr key={v.id}>
                  <Cell>
                    <RowInput
                      value={rowDraft.volume_ml}
                      onChange={(x) => setRowDraft({ ...rowDraft, volume_ml: x })}
                      type="number"
                    />
                  </Cell>
                  <Cell>
                    <RowInput
                      value={rowDraft.price}
                      onChange={(x) => setRowDraft({ ...rowDraft, price: x })}
                      type="number"
                    />
                  </Cell>
                  <Cell>
                    <RowInput
                      value={rowDraft.sale}
                      onChange={(x) => setRowDraft({ ...rowDraft, sale: x })}
                      type="number"
                    />
                  </Cell>
                  <Cell>
                    <RowInput
                      value={rowDraft.stock}
                      onChange={(x) => setRowDraft({ ...rowDraft, stock: x })}
                      type="number"
                    />
                  </Cell>
                  <Cell>
                    <RowInput
                      value={rowDraft.sku}
                      onChange={(x) => setRowDraft({ ...rowDraft, sku: x })}
                    />
                  </Cell>
                  <Cell>{v.is_default ? "★" : ""}</Cell>
                  <Cell align="right">
                    <div className="flex justify-end gap-2">
                      <AdminButton size="xs" onClick={() => saveEdit(v)} disabled={pending}>
                        Save
                      </AdminButton>
                      <AdminButton size="xs" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </AdminButton>
                    </div>
                  </Cell>
                </tr>
              ) : (
                <tr key={v.id} className="text-bone/75">
                  <Cell>{v.volume_ml}</Cell>
                  <Cell>${(v.price_cents / 100).toFixed(2)}</Cell>
                  <Cell>
                    {v.compare_at_price_cents
                      ? `$${(v.compare_at_price_cents / 100).toFixed(2)}`
                      : "—"}
                  </Cell>
                  <Cell
                    className={
                      v.stock_quantity === 0
                        ? "text-red-300"
                        : v.stock_quantity < 10
                          ? "text-amber-300"
                          : undefined
                    }
                  >
                    {v.stock_quantity}
                  </Cell>
                  <Cell className="text-bone/50">{v.sku}</Cell>
                  <Cell>
                    {v.is_default ? (
                      <span className="text-gold">★ default</span>
                    ) : (
                      <button
                        className="text-[10px] text-bone/40 hover:text-bone"
                        onClick={() =>
                          run(
                            () =>
                              saveVariantAction(productId, {
                                id: v.id,
                                sku: v.sku,
                                volume_ml: v.volume_ml,
                                price_cents: v.price_cents,
                                compare_at_price_cents: v.compare_at_price_cents,
                                stock_quantity: v.stock_quantity,
                                is_default: true,
                              }),
                            (r) => r.ok && router.refresh(),
                          )
                        }
                      >
                        set default
                      </button>
                    )}
                  </Cell>
                  <Cell align="right">
                    <div className="flex justify-end gap-2">
                      <AdminButton size="xs" variant="outline" onClick={() => startEdit(v)}>
                        Edit
                      </AdminButton>
                      <ConfirmButton
                        label="Remove"
                        message="Remove this variant?"
                        onConfirm={() =>
                          run(
                            () => deleteVariantAction(productId, v.id),
                            (r) => r.ok && router.refresh(),
                          )
                        }
                      />
                    </div>
                  </Cell>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div className="mt-6 border-t border-bone/10 pt-5">
        <p className="mb-3 text-[11px] uppercase tracking-wide2 text-bone/40">
          Add a bottle size
        </p>
        <div className="grid gap-3 sm:grid-cols-6">
          <RowInput
            placeholder="ml"
            type="number"
            value={draft.volume_ml}
            onChange={(x) => setDraft({ ...draft, volume_ml: x })}
          />
          <RowInput
            placeholder="Price"
            type="number"
            value={draft.price}
            onChange={(x) => setDraft({ ...draft, price: x })}
          />
          <RowInput
            placeholder="Sale (opt.)"
            type="number"
            value={draft.sale}
            onChange={(x) => setDraft({ ...draft, sale: x })}
          />
          <RowInput
            placeholder="Stock"
            type="number"
            value={draft.stock}
            onChange={(x) => setDraft({ ...draft, stock: x })}
          />
          <RowInput
            placeholder="SKU"
            value={draft.sku}
            onChange={(x) => setDraft({ ...draft, sku: x })}
          />
          <AdminButton onClick={addVariant} disabled={pending}>
            Add
          </AdminButton>
        </div>
      </div>
    </Panel>
  );
}

function Cell({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td
      className={`py-2.5 pr-3 ${align === "right" ? "text-right" : ""} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function RowInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full border border-bone/20 bg-transparent px-2 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
    />
  );
}
