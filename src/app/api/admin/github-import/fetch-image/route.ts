import { NextRequest, NextResponse } from "next/server";

const MAX_PROXY_BYTES = 20 * 1024 * 1024; // 원본 상한 — 클라이언트 압축 전 단계라 5MB 가드보다 넉넉하게 (FR-M24)

// GET /api/admin/github-import/fetch-image?url=... — README 후보 이미지를 서버가 대신 받아온다.
// 클라이언트 <canvas>로 직접 그리면 CORS 헤더 없는 외부 호스트(뱃지 등)에서 캔버스가 오염돼
// 리사이즈(toBlob)가 막히기 때문에 서버 프록시를 거친다(FR-M24). 리사이즈 자체는 여기서 하지 않는다.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing_url", message: "url 쿼리 파라미터가 필요합니다" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid_url", message: "올바르지 않은 URL입니다" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "invalid_protocol", message: "http(s) URL만 허용됩니다" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed);
  } catch {
    return NextResponse.json({ error: "fetch_failed", message: "원본 이미지를 가져오지 못했습니다" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "fetch_failed", message: `원본 응답 오류 (${upstream.status})` },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "not_an_image", message: "이미지가 아닙니다" }, { status: 415 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.byteLength > MAX_PROXY_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "원본 이미지가 너무 큽니다 (20MB 초과)" },
      { status: 413 }
    );
  }

  return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
}
