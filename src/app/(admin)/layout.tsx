import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";

// 전역 셸: 좌측 사이드바(Projects·Drafts·Dashboard) + 상단 사용자 메뉴 (관리자 UI 설계서 §1)
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/15">
        <p className="mb-6 px-2 text-sm font-semibold">profile-admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/projects" className="rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
            Projects
          </Link>
          <Link href="/drafts" className="rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
            Drafts
          </Link>
          <Link href="/dashboard" className="rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
            Dashboard
          </Link>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-black/10 px-6 py-3 dark:border-white/15">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              {session?.user?.name ?? "관리자"} · 로그아웃
            </button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
