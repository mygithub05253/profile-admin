import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProfileData, updateProfileData } from "@/lib/static-data";
import { profileDataSchema } from "@/lib/schema/static-data";
import { toErrorResponse } from "@/lib/api-errors";
import { NotFoundError } from "@/lib/errors";

// GET /api/data/profile — data/profile.yml 조회 (FR-M23)
export async function GET() {
  try {
    const record = await getProfileData();
    if (!record) throw new NotFoundError("profile 데이터를 찾을 수 없습니다");
    return NextResponse.json(record);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PUT /api/data/profile — sha 낙관적 잠금 저장 (FR-M23, PR + auto-merge)
export async function PUT(request: NextRequest) {
  try {
    const json = await request.json();
    const { data, sha } = z.object({ data: profileDataSchema, sha: z.string() }).parse(json);
    const { prUrl } = await updateProfileData(data, sha);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
