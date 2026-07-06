import { NextResponse } from "next/server";
import { listDrafts } from "@/lib/drafts";
import { toErrorResponse } from "@/lib/api-errors";

// GET /api/drafts — 목록 (A-04)
export async function GET() {
  try {
    const drafts = await listDrafts();
    return NextResponse.json(drafts);
  } catch (err) {
    return toErrorResponse(err);
  }
}
