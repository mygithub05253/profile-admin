import { NextRequest, NextResponse } from "next/server";
import { promoteDraft } from "@/lib/drafts";
import { draftSaveSchema } from "@/lib/schema/post";
import { toErrorResponse } from "@/lib/api-errors";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// POST /api/drafts/[slug]/promote — 발행 준비 (A-04, FR-M19)
// drafts/{slug}.md → posts/{slug}.md 이동 + status: ready 승격 (병합 시 velog 자동 발행 트리거)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const { frontmatter, body, sha } = draftSaveSchema.parse(json);
    const { prUrl } = await promoteDraft(slug, frontmatter, body, sha);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
