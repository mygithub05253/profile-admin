import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraft } from "@/lib/drafts";
import { draftSaveSchema } from "@/lib/schema/post";
import { toErrorResponse } from "@/lib/api-errors";
import { NotFoundError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/drafts/[slug] — 단건 조회(sha 포함, A-04 편집 진입)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const draft = await getDraft(slug);
    if (!draft) throw new NotFoundError(`초안을 찾을 수 없습니다: ${slug}`);
    return NextResponse.json(draft);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PUT /api/drafts/[slug] — 편집 저장 (drafts/ 유지, sha 낙관적 잠금 FR-M21)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const { frontmatter, body, sha } = draftSaveSchema.parse(json);
    const { prUrl } = await updateDraft(slug, frontmatter, body, sha);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
