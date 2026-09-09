import { getSiteContent } from "@/lib/cms";
import { SiteContentEditor } from "@/components/admin/SiteContentEditor";

export default async function AdminContentPage() {
  const site = await getSiteContent();
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-bone/50">
        Homepage and site-wide copy. These fields feed the hero, brand
        introduction, story, values and contact blocks. Editing here is the
        intended way for the client to replace all demo content — no code changes.
      </p>
      <SiteContentEditor site={site} />
    </div>
  );
}
