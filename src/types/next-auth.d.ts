import type { DefaultSession } from "next-auth";

// FR-M16: allowlist 판정에 사용하는 GitHub 숫자 ID를 세션/JWT에 보관
declare module "next-auth" {
  interface Session {
    githubId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
  }
}

export type { DefaultSession };
