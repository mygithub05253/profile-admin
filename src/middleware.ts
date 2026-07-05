export { auth as middleware } from "@/auth";

// api/auth(OAuth 콜백)·login·auth/error·정적 자산은 인증 검사 제외
export const config = {
  matcher: ["/((?!api/auth|login|auth/error|_next/static|_next/image|favicon.ico).*)"],
};
