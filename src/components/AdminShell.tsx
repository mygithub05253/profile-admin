"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  FileEdit,
  LayoutDashboard,
  BarChart3,
  Database,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { PublicSiteLink } from "./PublicSiteLink";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/drafts", label: "Drafts", icon: FileEdit },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
  { href: "/data", label: "Data", icon: Database },
] as const;

interface AdminShellProps {
  userName: string;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}

// 서버 컴포넌트(AdminLayout)에서 session/signOut을 받아 사이드바+헤더의
// 클라이언트 상호작용(드로어 토글 등)만 이 컴포넌트가 담당한다
export function AdminShell({ userName, onSignOut, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 text-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
              isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {isActive && (
              <span aria-hidden className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-1">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <p className="mb-6 px-2 text-sm font-semibold">profile-admin</p>
        {nav()}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:justify-end md:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <PublicSiteLink />
            <span aria-hidden className="h-4 w-px bg-border" />
            <ThemeToggle />
            <span aria-hidden className="h-4 w-px bg-border" />
            <form action={onSignOut}>
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                {userName} · 로그아웃
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {nav(() => setDrawerOpen(false))}
      </MobileDrawer>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute left-0 top-0 h-full w-64 bg-background p-4 shadow-lg">
        <div className="mb-6 flex items-center justify-between px-2">
          <p className="text-sm font-semibold">profile-admin</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
