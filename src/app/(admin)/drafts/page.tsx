import { listDrafts } from "@/lib/drafts";
import { DraftsTable } from "@/components/DraftsTable";

export const dynamic = "force-dynamic";

// A-04 초안 관리 목록 (FR-M19)
export default async function DraftsPage() {
  const drafts = await listDrafts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Drafts ({drafts.length})</h1>
      </div>
      <DraftsTable drafts={drafts} />
    </div>
  );
}
