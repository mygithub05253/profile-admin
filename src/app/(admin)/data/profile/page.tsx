import { notFound } from "next/navigation";
import { getProfileData } from "@/lib/static-data";
import { ProfileDataForm } from "@/components/ProfileDataForm";

export const dynamic = "force-dynamic";

// FR-M23 — data/profile.yml 편집
export default async function ProfileDataPage() {
  const record = await getProfileData();
  if (!record) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Profile 데이터</h1>
      <ProfileDataForm initialData={record.data} initialSha={record.sha} />
    </div>
  );
}
