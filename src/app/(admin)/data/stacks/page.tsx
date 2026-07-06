import { notFound } from "next/navigation";
import { getStacksData } from "@/lib/static-data";
import { StacksDataForm } from "@/components/StacksDataForm";

export const dynamic = "force-dynamic";

// FR-M23 — data/stacks.yml 편집
export default async function StacksDataPage() {
  const record = await getStacksData();
  if (!record) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Stacks 데이터</h1>
      <StacksDataForm initialData={record.data} initialSha={record.sha} />
    </div>
  );
}
