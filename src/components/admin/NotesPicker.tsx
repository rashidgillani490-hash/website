"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { saveProductNotesAction, saveNoteAction } from "@/app/admin/actions";
import { Panel } from "./ui";
import { AdminButton, ResultNote, useActionRunner } from "./controls";
import type { NoteRecord, NoteTier, ProductNoteRecord } from "@/lib/admin/records";

const TIERS: { key: NoteTier; label: string }[] = [
  { key: "top", label: "Top notes" },
  { key: "heart", label: "Heart notes" },
  { key: "base", label: "Base notes" },
];

type Selection = Record<NoteTier, string[]>;

export function NotesPicker({
  productId,
  allNotes,
  current,
}: {
  productId: string;
  allNotes: NoteRecord[];
  current: ProductNoteRecord[];
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();

  const [notes, setNotes] = useState<NoteRecord[]>(allNotes);
  const [sel, setSel] = useState<Selection>(() => {
    const base: Selection = { top: [], heart: [], base: [] };
    [...current]
      .sort((a, b) => a.position - b.position)
      .forEach((c) => base[c.tier].push(c.note_id));
    return base;
  });

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  function add(tier: NoteTier, noteId: string) {
    if (!noteId || sel[tier].includes(noteId)) return;
    setSel({ ...sel, [tier]: [...sel[tier], noteId] });
  }
  function remove(tier: NoteTier, noteId: string) {
    setSel({ ...sel, [tier]: sel[tier].filter((id) => id !== noteId) });
  }

  function save() {
    const entries = TIERS.flatMap((t) =>
      sel[t.key].map((note_id, position) => ({ note_id, tier: t.key, position })),
    );
    run(() => saveProductNotesAction(productId, entries), (r) => r.ok && router.refresh());
  }

  return (
    <Panel
      title="Note pyramid"
      action={
        <div className="flex items-center gap-3">
          <ResultNote result={result} />
          <AdminButton onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save pyramid"}
          </AdminButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {TIERS.map((t) => (
          <div key={t.key} className="flex flex-col gap-3">
            <span className="text-[11px] uppercase tracking-luxe text-gold">{t.label}</span>
            <div className="flex flex-wrap gap-2">
              {sel[t.key].length === 0 ? (
                <span className="text-xs text-bone/30">No notes yet</span>
              ) : null}
              {sel[t.key].map((id) => {
                const n = noteById.get(id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-bone/15 bg-bone/[0.03] px-3 py-1.5 text-xs text-bone/75"
                  >
                    {n ? `${n.name}` : id}
                    <button
                      onClick={() => remove(t.key, id)}
                      className="text-bone/40 hover:text-red-300"
                      aria-label="Remove note"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => add(t.key, e.target.value)}
              className="h-9 w-full max-w-xs border border-bone/20 bg-ink px-2 text-xs text-bone focus:border-gold focus:outline-none"
            >
              <option value="">+ add a note…</option>
              {notes
                .filter((n) => !sel[t.key].includes(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} · {n.family}
                  </option>
                ))}
            </select>
          </div>
        ))}

        <QuickCreateNote
          onCreated={(note) => {
            setNotes((prev) => [...prev, note].sort((a, b) => a.name.localeCompare(b.name)));
          }}
        />
      </div>
    </Panel>
  );
}

function QuickCreateNote({ onCreated }: { onCreated: (n: NoteRecord) => void }) {
  const { pending, result, run } = useActionRunner();
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");

  function create() {
    if (!name.trim() || !family.trim()) return;
    run(
      () => saveNoteAction(null, { name: name.trim(), family: family.trim(), slug: "" }),
      (r) => {
        if (r.ok && r.id) {
          onCreated({
            id: r.id,
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            name: name.trim(),
            family: family.trim(),
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setName("");
          setFamily("");
        }
      },
    );
  }

  return (
    <div className="border-t border-bone/10 pt-5">
      <p className="mb-3 text-[11px] uppercase tracking-wide2 text-bone/40">
        Quick-create a missing note
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Note name"
          className="h-9 w-48 border border-bone/20 bg-transparent px-2 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
        />
        <input
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="Family (e.g. Floral)"
          className="h-9 w-44 border border-bone/20 bg-transparent px-2 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
        />
        <AdminButton variant="outline" onClick={create} disabled={pending}>
          Create & add to library
        </AdminButton>
        <ResultNote result={result} />
      </div>
    </div>
  );
}
