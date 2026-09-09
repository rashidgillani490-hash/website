"use client";

import { useRouter } from "next/navigation";
import { updateProductAction } from "@/app/admin/actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Panel } from "./ui";
import { AdminButton, ResultNote, useActionRunner } from "./controls";
import type { CategoryRecord, ProductRecord } from "@/lib/admin/records";

const CONCENTRATIONS = ["Eau de Cologne", "Eau de Toilette", "Eau de Parfum", "Extrait de Parfum"];
const GENDERS = ["Feminine", "Masculine", "Unisex"];
const SILLAGE = ["Intimate", "Moderate", "Bold"];
const LONGEVITY = ["4–6h", "6–8h", "8h+"];

export function ProductDetailsForm({
  product,
  categories,
}: {
  product: ProductRecord;
  categories: CategoryRecord[];
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = String(fd.get(k) ?? "").trim();
      return v.length ? v : null;
    };
    run(
      () =>
        updateProductAction(product.id, {
          name: String(fd.get("name") ?? product.name),
          slug: String(fd.get("slug") ?? product.slug),
          tagline: str("tagline"),
          short_description: str("short_description"),
          description: str("description"),
          ingredients: str("ingredients"),
          story: str("story"),
          base_sku: str("base_sku"),
          category_id: str("category_id"),
          concentration: str("concentration"),
          gender: str("gender"),
          perfumer: str("perfumer"),
          sillage: str("sillage"),
          longevity: str("longevity"),
          accent_color: str("accent_color"),
          release_year: Number(fd.get("release_year")) || null,
          families: String(fd.get("families") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      (r) => r.ok && router.refresh(),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Panel
        title="Product details"
        action={
          <div className="flex items-center gap-3">
            <ResultNote result={result} />
            <AdminButton type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save details"}
            </AdminButton>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Product name" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={product.name} required />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="/fragrances/<slug>">
              <Input id="slug" name="slug" defaultValue={product.slug} />
            </Field>
          </div>

          <Field label="Short description" htmlFor="short_description" hint="Shown on listing cards">
            <Input
              id="short_description"
              name="short_description"
              defaultValue={product.short_description ?? ""}
            />
          </Field>
          <Field label="Full description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product.description ?? ""}
            />
          </Field>
          <Field label="Fragrance story" htmlFor="story">
            <Textarea id="story" name="story" rows={4} defaultValue={product.story ?? ""} />
          </Field>
          <Field label="Ingredients" htmlFor="ingredients" hint="Full INCI declaration">
            <Textarea
              id="ingredients"
              name="ingredients"
              rows={3}
              defaultValue={product.ingredients ?? ""}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fragrance category" htmlFor="category_id">
              <Select
                id="category_id"
                name="category_id"
                defaultValue={product.category_id ?? ""}
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Fragrance families"
              htmlFor="families"
              hint="Comma separated, e.g. floral, woody"
            >
              <Input
                id="families"
                name="families"
                defaultValue={(product.families ?? []).join(", ")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Concentration" htmlFor="concentration">
              <Select
                id="concentration"
                name="concentration"
                defaultValue={product.concentration ?? "Eau de Parfum"}
              >
                {CONCENTRATIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Wear" htmlFor="gender">
              <Select id="gender" name="gender" defaultValue={product.gender ?? "Unisex"}>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
            <Field label="Perfumer" htmlFor="perfumer">
              <Input id="perfumer" name="perfumer" defaultValue={product.perfumer ?? ""} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Longevity" htmlFor="longevity">
              <Select id="longevity" name="longevity" defaultValue={product.longevity ?? "6–8h"}>
                {LONGEVITY.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sillage" htmlFor="sillage">
              <Select id="sillage" name="sillage" defaultValue={product.sillage ?? "Moderate"}>
                {SILLAGE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Base SKU" htmlFor="base_sku">
              <Input id="base_sku" name="base_sku" defaultValue={product.base_sku ?? ""} />
            </Field>
            <Field label="Release year" htmlFor="release_year">
              <Input
                id="release_year"
                name="release_year"
                type="number"
                defaultValue={product.release_year ?? ""}
              />
            </Field>
          </div>

          <Field label="Accent colour" htmlFor="accent_color" hint="Hex, used on cards & 3D">
            <Input
              id="accent_color"
              name="accent_color"
              defaultValue={product.accent_color ?? "#c8a866"}
            />
          </Field>
        </div>
      </Panel>
    </form>
  );
}
