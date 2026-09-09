"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveNoteAction, deleteNoteAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  AdminButton,
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import { Input } from "@/components/ui/form";
import { slugify } from "@/lib/utils";
import type { NoteInput, NoteRecord } from "@/lib/admin/records";

export function NotesManager({ notes }: { notes: NoteRecord[] }) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [query, setQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteInput>({ name: "", family: "", slug: "" });
  const [rowDraft, setRowDraft] = useState<{ name: string; family: string; description: string }>({
    name: "",
    family: "",
    description: "",
  });

  const families = useMemo(
    () => [...new Set(notes.map((n) => n.family))].sort(),
    [notes],
  );

  const filtered = notes.filter((n) => {
    if (familyFilter !== "all" && n.family !== familyFilter) return false;
    if (query && !`${n.name} ${n.family} ${n.slug}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    return true;
  });

  function create() {
    if (!draft.name.trim() || !draft.family.trim()) return;
    run(
      () => saveNoteAction(null, { ...draft, slug: slugify(draft.name) }),
      (r) => {
        if (r.ok) {
          setDraft({ name: "", family: "", slug: "" });
          router.refresh();
        }
      },
    );
  }

  function saveRow(id: string) {
    run(
      () =>
        saveNoteAction(id, {
          name: rowDraft.name.trim(),
          family: rowDraft.family.trim(),
          description: rowDraft.description.trim() || null,
          slug: "",
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
      title={`Fragrance notes · ${notes.length}`}
      action={pending ? <Spinner /> : <ResultNote result={result} />}
    >
      <div className="flex flex-col gap-5">
        {/* create */}
        <div className="flex flex-wrap items-center gap-3 border border-bone/10 bg-bone/[0.02] p-4">
          <Input
            placeholder="New note name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-48"
          />
          <Input
            placeholder="Family (e.g. Floral)"
            value={draft.family}
            onChange={(e) => setDraft({ ...draft, family: e.target.value })}
            className="w-44"
          />
          <AdminButton onClick={create} disabled={pending}>
            Add note
          </AdminButton>
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-9 w-56 border border-bone/20 bg-transparent px-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
          />
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="h-9 border border-bone/20 bg-ink px-2 text-xs text-bone focus:border-gold focus:outline-none"
          >
            <option value="all">All families</option>
            {families.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <span className="text-xs text-bone/35">{filtered.length} shown</span>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-bone/10 text-[10px] uppercase tracking-wide2 text-bone/40">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Family</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/5">
              {filtered.map((n) =>
                editing === n.id ? (
                  <tr key={n.id}>
                    <td className="py-2 pr-3">
                      <Input
                        value={rowDraft.name}
                        onChange={(e) => setRowDraft({ ...rowDraft, name: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={rowDraft.family}
                        onChange={(e) => setRowDraft({ ...rowDraft, family: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3 text-bone/40">{n.slug}</td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <AdminButton size="xs" onClick={() => saveRow(n.id)} disabled={pending}>
                          Save
                        </AdminButton>
                        <AdminButton size="xs" variant="ghost" onClick={() => setEditing(null)}>
                          Cancel
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={n.id} className="text-bone/75">
                    <td className="py-2.5 pr-3">{n.name}</td>
                    <td className="py-2.5 pr-3 text-bone/55">{n.family}</td>
                    <td className="py-2.5 pr-3 text-bone/35">{n.slug}</td>
                    <td className="py-2.5 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <AdminButton
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEditing(n.id);
                            setRowDraft({
                              name: n.name,
                              family: n.family,
                              description: n.description ?? "",
                            });
                          }}
                        >
                          Edit
                        </AdminButton>
                        <ConfirmButton
                          label="Delete"
                          message="Delete note & remove from all products?"
                          onConfirm={() =>
                            run(
                              () => deleteNoteAction(n.id),
                              (r) => r.ok && router.refresh(),
                            )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
