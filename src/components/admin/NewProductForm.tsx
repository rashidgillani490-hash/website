"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProductAction } from "@/app/admin/actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Panel } from "./ui";
import { AdminButton, ResultNote, useActionRunner } from "./controls";
import { slugify } from "@/lib/utils";
import type { CategoryRecord } from "@/lib/admin/records";

const CONCENTRATIONS = ["Eau de Cologne", "Eau de Toilette", "Eau de Parfum", "Extrait de Parfum"];
const GENDERS = ["Feminine", "Masculine", "Unisex"];

export function NewProductForm({ categories }: { categories: CategoryRecord[] }) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(
      () =>
        createProductAction({
          name: String(fd.get("name") ?? ""),
          slug: slug || slugify(name),
          short_description: String(fd.get("short_description") ?? "") || null,
          description: String(fd.get("description") ?? "") || null,
          category_id: (String(fd.get("category_id") ?? "") || null) as string | null,
          concentration: String(fd.get("concentration") ?? "") || null,
          gender: String(fd.get("gender") ?? "") || null,
          status: fd.get("status") === "active" ? "active" : "draft",
        }),
      (r) => {
        if (r.ok && r.id) router.push(`/admin/products/${r.id}`);
      },
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Panel title="New product">
        <div className="flex flex-col gap-5">
          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </Field>
          <Field label="Slug" htmlFor="slug" hint="URL: /fragrances/<slug>">
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Short description" htmlFor="short_description">
            <Input id="short_description" name="short_description" />
          </Field>
          <Field label="Full description" htmlFor="description">
            <Textarea id="description" name="description" rows={3} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category" htmlFor="category_id">
              <Select id="category_id" name="category_id" defaultValue="">
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Concentration" htmlFor="concentration">
              <Select id="concentration" name="concentration" defaultValue="Eau de Parfum">
                {CONCENTRATIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Wear" htmlFor="gender">
              <Select id="gender" name="gender" defaultValue="Unisex">
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="active">Published</option>
            </Select>
          </Field>

          <div className="flex items-center gap-4 pt-2">
            <AdminButton type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create product"}
            </AdminButton>
            <ResultNote result={result} />
          </div>
        </div>
      </Panel>
    </form>
  );
}
