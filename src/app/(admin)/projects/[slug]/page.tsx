import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

// A-03 프로젝트 편집
export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">{project.frontmatter.title}</h1>
      <ProjectForm
        mode="edit"
        initialFrontmatter={project.frontmatter}
        initialBody={project.body}
        initialSha={project.sha}
      />
    </div>
  );
}
