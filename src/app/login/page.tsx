import { signIn } from "@/auth";

// A-01 로그인 (관리자 UI 설계서 §2)
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-black/10 p-8 text-center shadow-sm dark:border-white/15">
        <h1 className="mb-1 text-xl font-semibold">profile-admin</h1>
        <p className="mb-6 text-sm text-black/60 dark:text-white/60">관리자 전용 로그인</p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/projects" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            GitHub로 로그인
          </button>
        </form>
      </div>
    </main>
  );
}
