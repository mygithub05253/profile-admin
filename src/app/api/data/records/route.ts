import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRecordsData, updateRecordsData } from "@/lib/static-data";
import { recordsDataSchema } from "@/lib/schema/static-data";
import { toErrorResponse } from "@/lib/api-errors";
import { NotFoundError } from "@/lib/errors";

// GET /api/data/records — data/records.yml 조회 (FR-M23)
export async function GET() {
  try {
    const record = await getRecordsData();
    if (!record) throw new NotFoundError("records 데이터를 찾을 수 없습니다");
    return NextResponse.json(record);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PUT /api/data/records — sha 낙관적 잠금 저장 (FR-M23, PR + auto-merge)
export async function PUT(request: NextRequest) {
  try {
    const json = await request.json();
    const { data, sha } = z.object({ data: recordsDataSchema, sha: z.string() }).parse(json);
    const { prUrl } = await updateRecordsData(data, sha);
    return NextResponse.json({ prUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
