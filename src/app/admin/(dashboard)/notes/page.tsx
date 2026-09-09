import { getAdminRepo } from "@/lib/admin/repo";
import { NotesManager } from "@/components/admin/NotesManager";

export default async function AdminNotesPage() {
  const repo = await getAdminRepo();
  const notes = await repo.listNotes();

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-lg text-sm text-bone/50">
        The shared library of olfactive materials used to build every product&apos;s
        note pyramid. Written to{" "}
        <span className="text-bone/70">
          {repo.backend === "supabase" ? "Supabase" : "the local store"}
        </span>
        .
      </p>
      <NotesManager notes={notes} />
    </div>
  );
}
