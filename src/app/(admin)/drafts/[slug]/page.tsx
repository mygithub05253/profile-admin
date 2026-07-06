import { notFound } from "next/navigation";
import { getDraft } from "@/lib/drafts";
import { DraftForm } from "@/components/DraftForm";

export const dynamic = "force-dynamic";

// A-04 초안 편집
export default async function EditDraftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draft = await getDraft(slug);
  if (!draft) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">{draft.frontmatter.title}</h1>
      <DraftForm
        slug={slug}
        initialFrontmatter={draft.frontmatter}
        initialBody={draft.body}
        initialSha={draft.sha}
      />
    </div>
  );
}
