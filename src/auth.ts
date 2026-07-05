import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { NextResponse } from "next/server";

// FR-M16: GitHub OAuth + 숫자 ID(profile.id) allowlist 3중 방어
// (관리자_기능명세서 §16, 관리자_API_통합명세서 §6.1)
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 1인 관리자 특성상 단축(7일). 유출 의심 시 AUTH_SECRET 회전으로 전체 무효화
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    // 방어 1: signIn 콜백 — 숫자 ID 불일치 시 false(AccessDenied)
    async signIn({ profile }) {
      const githubId = (profile as { id?: number } | undefined)?.id;
      return !!githubId && String(githubId) === process.env.ALLOWED_GITHUB_ID;
    },
    // 방어 2: jwt/session 콜백에 githubId 저장 — login(username) 대신 불변 숫자 ID 사용
    async jwt({ token, profile }) {
      if (profile) {
        token.githubId = String((profile as { id?: number }).id ?? "");
      }
      return token;
    },
    async session({ session, token }) {
      session.githubId = token.githubId as string | undefined;
      return session;
    },
    // 방어 3: 미들웨어 authorized 콜백 — 세션 존재 + githubId 재확인
    authorized({ auth: session, request }) {
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      if (isOnLogin) return true;

      if (!session?.user) return false; // 세션 없음 → /login 리다이렉트(기본 동작)

      const allowed = session.githubId === process.env.ALLOWED_GITHUB_ID;
      if (!allowed) {
        // 사유 미노출 403 고정 페이지로 (allowlist 밖 세션은 signIn 콜백에서 이미 차단되지만 방어 심층화)
        return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.nextUrl));
      }
      return true;
    },
  },
});
