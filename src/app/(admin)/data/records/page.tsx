import { notFound } from "next/navigation";
import { getRecordsData } from "@/lib/static-data";
import { RecordsDataForm } from "@/components/RecordsDataForm";

export const dynamic = "force-dynamic";

// FR-M23 — data/records.yml 편집
export default async function RecordsDataPage() {
  const record = await getRecordsData();
  if (!record) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Records 데이터</h1>
      <RecordsDataForm initialData={record.data} initialSha={record.sha} />
    </div>
  );
}
