"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCategoryAction, deleteCategoryAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  AdminButton,
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import { Field, Input, Textarea } from "@/components/ui/form";
import { slugify } from "@/lib/utils";
import type { CategoryInput, CategoryRecord } from "@/lib/admin/records";

const blank: CategoryInput = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  hero_image_url: "",
  accent_color: "#c8a866",
  position: 0,
  is_active: true,
};

export function CategoryManager({
  categories,
  counts,
}: {
  categories: CategoryRecord[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function persist(id: string | null, input: CategoryInput) {
    run(() => saveCategoryAction(id, input), (r) => {
      if (r.ok) {
        setEditing(null);
        setCreating(false);
        router.refresh();
      }
    });
  }

  return (
    <Panel
      title={`Categories · ${categories.length}`}
      action={
        <div className="flex items-center gap-3">
          {pending ? <Spinner /> : <ResultNote result={result} />}
          <AdminButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New category"}
          </AdminButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {creating ? (
          <CategoryForm initial={blank} onSave={(input) => persist(null, input)} pending={pending} />
        ) : null}

        <div className="flex flex-col divide-y divide-bone/10">
          {categories.map((c) =>
            editing === c.id ? (
              <div key={c.id} className="py-4">
                <CategoryForm
                  initial={{
                    slug: c.slug,
                    name: c.name,
                    subtitle: c.subtitle ?? "",
                    description: c.description ?? "",
                    hero_image_url: c.hero_image_url ?? "",
                    accent_color: c.accent_color ?? "#c8a866",
                    position: c.position,
                    is_active: c.is_active,
                  }}
                  onCancel={() => setEditing(null)}
                  onSave={(input) => persist(c.id, input)}
                  pending={pending}
                />
              </div>
            ) : (
              <div key={c.id} className="flex flex-wrap items-center gap-4 py-4">
                <div
                  className="h-10 w-16 shrink-0 rounded-sm bg-cover bg-center"
                  style={{
                    backgroundImage: c.hero_image_url ? `url(${c.hero_image_url})` : undefined,
                    backgroundColor: c.accent_color ?? "#222",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg text-bone">
                    {c.name}
                    {!c.is_active ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide2 text-amber-300">
                        hidden
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-bone/40">
                    /{c.slug} · position {c.position} · {counts[c.id] ?? 0} products
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminButton size="xs" variant="outline" onClick={() => setEditing(c.id)}>
                    Edit
                  </AdminButton>
                  <ConfirmButton
                    label="Delete"
                    message={counts[c.id] ? "Has products — reassign first" : "Delete category?"}
                    onConfirm={() =>
                      run(
                        () => deleteCategoryAction(c.id),
                        (r) => r.ok && router.refresh(),
                      )
                    }
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </Panel>
  );
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial: CategoryInput;
  onSave: (input: CategoryInput) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<CategoryInput>(initial);
  const set = (patch: Partial<CategoryInput>) => setForm({ ...form, ...patch });

  return (
    <div className="flex flex-col gap-4 border border-bone/10 bg-bone/[0.02] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" required>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              set({
                name,
                slug: !initial.slug || form.slug === slugify(form.name) ? slugify(name) : form.slug,
              });
            }}
          />
        </Field>
        <Field label="Slug" htmlFor="c-slug">
          <Input
            id="c-slug"
            value={form.slug}
            onChange={(e) => set({ slug: slugify(e.target.value) })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subtitle" htmlFor="c-sub">
          <Input
            id="c-sub"
            value={form.subtitle ?? ""}
            onChange={(e) => set({ subtitle: e.target.value })}
          />
        </Field>
        <Field label="Hero image URL" htmlFor="c-img">
          <Input
            id="c-img"
            value={form.hero_image_url ?? ""}
            onChange={(e) => set({ hero_image_url: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="c-desc">
        <Textarea
          id="c-desc"
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Accent colour" htmlFor="c-accent">
          <Input
            id="c-accent"
            value={form.accent_color ?? ""}
            onChange={(e) => set({ accent_color: e.target.value })}
          />
        </Field>
        <Field label="Position" htmlFor="c-pos">
          <Input
            id="c-pos"
            type="number"
            value={form.position ?? 0}
            onChange={(e) => set({ position: Number(e.target.value) })}
          />
        </Field>
        <label className="flex items-center gap-3 pt-6 text-sm text-bone/70">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => set({ is_active: e.target.checked })}
            className="accent-gold"
          />
          Visible on storefront
        </label>
      </div>
      <div className="flex gap-3">
        <AdminButton onClick={() => onSave(form)} disabled={pending}>
          Save category
        </AdminButton>
        {onCancel ? (
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
