import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/projects";
import { projectSaveSchema } from "@/lib/schema/project";
import { toErrorResponse } from "@/lib/api-errors";
import { NotFoundError } from "@/lib/errors";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/projects/[slug] — 단건 조회(sha 포함, A-03 편집 진입)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const project = await getProject(slug);
    if (!project) throw new NotFoundError(`프로젝트를 찾을 수 없습니다: ${slug}`);
    return NextResponse.json(project);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PUT /api/projects/[slug] — 수정 (slug 불변 + sha 낙관적 잠금, FR-M17/M21)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const { frontmatter, body, sha, images } = projectSaveSchema.extend({ sha: z.string() }).parse(json);
    const { prUrl } = await updateProject(slug, frontmatter, body, sha, images);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/projects/[slug] — 삭제 (파괴 조작, slug 재입력 확인은 UI 담당)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const { sha } = z.object({ sha: z.string() }).parse(json);
    const { prUrl } = await deleteProject(slug, sha);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
