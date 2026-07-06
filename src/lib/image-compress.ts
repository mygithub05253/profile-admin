// FR-M22/M24 공유 이미지 압축 유틸 — 로컬 업로드(ImageDropzone)와
// README 후보 채택(ReadmeImageGallery)이 함께 사용한다.
const MAX_WIDTH = 1600; // 클라이언트 측 리사이즈 최대 폭
const WEBP_QUALITY = 0.82;
export const MAX_BYTES = 5 * 1024 * 1024; // 압축 후 5MB 가드 (서버 MAX_IMAGE_BYTES와 동일)

export async function compressImageBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 초기화할 수 없습니다");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP 변환에 실패했습니다"))), "image/webp", WEBP_QUALITY);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다"));
    reader.readAsDataURL(blob);
  });
}

export function sanitizeBaseName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "image";
}
