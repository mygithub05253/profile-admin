import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects";
import { projectSaveSchema } from "@/lib/schema/project";
import { toErrorResponse } from "@/lib/api-errors";

// GET /api/projects — 목록 (A-02)
export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json(projects);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/projects — 생성 (A-03, FR-M17)
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { frontmatter, body, images } = projectSaveSchema.parse(json);
    const { prUrl } = await createProject(frontmatter, body, images);
    return NextResponse.json({ slug: frontmatter.slug, prUrl }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
