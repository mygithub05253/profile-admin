import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShell userName={session?.user?.name ?? "관리자"} onSignOut={handleSignOut}>
      {children}
    </AdminShell>
  );
}
