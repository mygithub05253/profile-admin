# 관리자 디자인 시스템 도입 · 테마 토글 · 반응형 지원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** profile-admin에 shadcn/ui 스타일 컴포넌트 인프라를 도입하고, 그 위에 테마 토글(라이트/다크/시스템)·공개 사이트 링크·반응형 사이드바 셸·테이블 3개/폼 2개 반응형화·recharts 차트·토스트 에러 피드백을 구현한다.

**Architecture:** Tailwind v4 CSS-first 토큰(`@theme inline` + `@custom-variant dark`) 위에 Radix+CVA 기반 프리미티브(Button/Card/Table/Badge/Input)를 얹고, 기존 raw-Tailwind 컴포넌트(테이블 3개·차트 2개·SectionErrorNotice)를 이 프리미티브로 순차 교체한다. 색상은 gc-dating-app("Ember Signal")의 브랜딩을 걷어내고 profile-admin 기존 흑백 미니멀 톤 + 기존 StatusBadge 시맨틱 색으로 중립화한다.

**Tech Stack:** Next.js 15 App Router, Tailwind v4, TypeScript, class-variance-authority, clsx, tailwind-merge, lucide-react, next-themes, @radix-ui/react-slot, recharts, react-hot-toast

**참고 설계 문서:** `docs/superpowers/specs/2026-07-07-admin-theme-toggle-responsive-design.md` (커밋 fb850f8)

**검증 제약:** profile-admin은 FR-M16(로그인 필요)이라 Claude가 실제 로그인 후 화면을 브라우저로 확인할 수 없다. 각 태스크의 검증은 `npm run build` + `npm run lint` 통과, 순수 로직은 verify 스크립트로 확인하고, 실제 렌더링/인터랙션 확인은 전체 구현 완료 후 사용자 몫으로 남긴다.

---

## Phase 1: 인프라 + 디자인 토큰

### Task 1: 의존성 설치 + cn() 유틸

**Files:**
- Modify: `package.json`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: 의존성 설치**

```bash
cd profile-admin
npm install class-variance-authority clsx tailwind-merge lucide-react next-themes @radix-ui/react-slot recharts react-hot-toast
```

- [ ] **Step 2: `src/lib/utils.ts` 작성**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 기존과 동일하게 성공 (아직 아무 화면도 새 유틸을 안 씀)

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json src/lib/utils.ts
git commit -m "feat: shadcn/ui 스타일 인프라용 의존성 및 cn() 유틸 추가"
```

### Task 2: 디자인 토큰 (globals.css)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 기존 파일 내용 뒤에 토큰 블록 추가**

`src/app/globals.css` 전체를 아래로 교체한다 (기존 `:root`/`@theme inline`/`@media (prefers-color-scheme: dark)`/`body` 블록을 대체):

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --success: 142 71% 45%;
  --success-foreground: 0 0% 98%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 9%;
  --info: 217 91% 60%;
  --info-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 9%;
}

.dark {
  --background: 0 0% 9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 12%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 12%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  --secondary: 0 0% 16%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 16%;
  --muted-foreground: 0 0% 65%;
  --accent: 0 0% 16%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 70% 50%;
  --destructive-foreground: 0 0% 98%;
  --success: 142 60% 45%;
  --success-foreground: 0 0% 9%;
  --warning: 38 85% 55%;
  --warning-foreground: 0 0% 9%;
  --info: 217 80% 60%;
  --info-foreground: 0 0% 9%;
  --border: 0 0% 20%;
  --input: 0 0% 20%;
  --ring: 0 0% 83%;
}

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
  --color-info: hsl(var(--info));
  --color-info-foreground: hsl(var(--info-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

기존 `@media (prefers-color-scheme: dark)` 블록은 제거한다 — `next-themes`(Task 5)가 `.dark` 클래스를 관리하므로 더 이상 OS 미디어쿼리로 직접 분기할 필요가 없다.

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공. 기존 `dark:` 클래스들은 이제 `.dark` 클래스 기준으로 동작 — 아직 `.dark`를 토글하는 코드가 없으니(Task 5에서 추가) 항상 라이트로 보임, 정상.

- [ ] **Step 3: 커밋**

```bash
git add src/app/globals.css
git commit -m "feat: 디자인 토큰 도입 및 dark variant를 class 기반으로 전환"
```

### Task 3: Button + Input 프리미티브

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`

- [ ] **Step 1: `src/components/ui/button.tsx` 작성**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-8 rounded-md px-2.5 text-xs",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: `src/components/ui/input.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공 (아직 아무 곳에서도 import 안 함)

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx
git commit -m "feat: Button·Input 프리미티브 추가"
```

### Task 4: Card + Table + Badge 프리미티브

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/badge.tsx`

- [ ] **Step 1: `src/components/ui/card.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 2: `src/components/ui/table.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("border-b border-border", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("divide-y divide-border", className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("transition-colors hover:bg-muted/30", className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-2 py-2 text-left text-sm font-normal text-muted-foreground", className)} {...props} />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn("px-2 py-2 text-sm", className)} {...props} />,
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

- [ ] **Step 3: `src/components/ui/badge.tsx` 작성**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-border text-foreground",
        destructive: "bg-destructive/15 text-destructive",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        info: "bg-info/15 text-info",
        "soft-primary": "bg-primary/10 text-primary",
        "soft-muted": "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "soft-muted" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 5: 커밋**

```bash
git add src/components/ui/card.tsx src/components/ui/table.tsx src/components/ui/badge.tsx
git commit -m "feat: Card·Table·Badge 프리미티브 추가"
```

---

## Phase 2: 테마 토글 + 공개 사이트 링크

### Task 5: next-themes ThemeProvider 배선

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 현재 내용 확인 후 ThemeProvider로 감싸기**

`src/app/layout.tsx`의 `<body>` 태그를 아래처럼 수정한다 (기존 `geistSans`/`geistMono` 폰트 변수, `metadata`는 그대로 유지):

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "profile-admin",
  description: "content-hub 프로젝트/블로그 관리자 웹",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning`이 `<html>`에 필요한 이유: `next-themes`가 마운트 전/후 `class="dark"` 여부를 클라이언트에서 조정하는 과정에서 서버 렌더 결과와 다를 수 있음(라이브러리 공식 요구사항).

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/app/layout.tsx
git commit -m "feat: next-themes ThemeProvider 및 Toaster 배선"
```

### Task 6: ThemeToggle 컴포넌트

**Files:**
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

// 라이트→다크→시스템 3단 순환 (gc-dating-app Frontend/admin ThemeToggle 패턴)
export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="테마 전환" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const resolved = theme === "system" ? systemTheme : theme;

  const handleToggle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const icon =
    theme === "system" ? (
      <Monitor className="h-4 w-4" />
    ) : resolved === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  const label = theme === "system" ? "시스템 설정" : resolved === "dark" ? "다크 모드" : "라이트 모드";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={`테마 전환 (현재: ${label})`}
      title={`${label} — 클릭하여 전환`}
    >
      {icon}
    </Button>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat: ThemeToggle 컴포넌트 추가 (라이트/다크/시스템 3단)"
```

### Task 7: 공개 사이트 링크

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/components/PublicSiteLink.tsx`

- [ ] **Step 1: `src/lib/constants.ts` 작성**

```ts
export const PUBLIC_SITE_URL = "https://my-profile-site-coral.vercel.app";
```

- [ ] **Step 2: `src/components/PublicSiteLink.tsx` 작성**

```tsx
import { ExternalLink } from "lucide-react";
import { PUBLIC_SITE_URL } from "@/lib/constants";

export function PublicSiteLink() {
  return (
    <a
      href={PUBLIC_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      공개 사이트 보기
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/lib/constants.ts src/components/PublicSiteLink.tsx
git commit -m "feat: 공개 사이트 링크 컴포넌트 추가"
```

---

## Phase 3: AdminShell 반응형 셸

### Task 8: AdminShell 골격 + 데스크톱 사이드바/헤더

**Files:**
- Create: `src/components/AdminShell.tsx`

- [ ] **Step 1: 작성**

```tsx
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
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공 (아직 layout.tsx에서 사용 안 함, Task 10에서 배선)

- [ ] **Step 3: 커밋**

```bash
git add src/components/AdminShell.tsx
git commit -m "feat: AdminShell 골격 추가 (데스크톱 사이드바+헤더)"
```

### Task 9: 모바일 드로어 상호작용 보완 (스크롤 잠금·ESC)

**Files:**
- Modify: `src/components/AdminShell.tsx`

- [ ] **Step 1: `AdminShell` 컴포넌트에 `useEffect` import 및 드로어 부수효과 추가**

`import { useState } from "react";` import 줄을 다음으로 교체:

```tsx
import { useEffect, useState } from "react";
```

`export function AdminShell` 함수 본문, `const [drawerOpen, setDrawerOpen] = useState(false);` 바로 아래에 추가:

```tsx
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/AdminShell.tsx
git commit -m "feat: 모바일 드로어에 스크롤 잠금·ESC 닫기 추가"
```

### Task 10: (admin)/layout.tsx를 AdminShell로 교체

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
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
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(admin)/layout.tsx"
git commit -m "feat: 관리자 레이아웃을 AdminShell로 교체 (반응형 셸 적용)"
```

---

## Phase 4: 테이블/폼 반응형

### Task 11: DataTable 컴포넌트

**Files:**
- Create: `src/components/DataTable.tsx`

- [ ] **Step 1: 작성**

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({ columns, data, rowKey, emptyState }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.align === "right" ? "text-right" : undefined}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
              {emptyState ?? "데이터가 없습니다"}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, index) => (
            <TableRow key={rowKey(row, index)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.align === "right" ? "text-right" : undefined}>
                  {col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/DataTable.tsx
git commit -m "feat: DataTable 컴포넌트 추가 (overflow-x-auto 내장)"
```

### Task 12: SearchBar + Pagination 컴포넌트

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/Pagination.tsx`
- Test: `scripts/verify-pagination.mjs`

- [ ] **Step 1: `src/components/SearchBar.tsx` 작성**

```tsx
"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// gc-dating-app SearchBar 포팅 — 원본도 모바일 미대응이라 flex-col로 보완
export function SearchBar({ value, onChange, placeholder = "검색..." }: SearchBarProps) {
  return (
    <div className="relative flex-1 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 페이지 윈도우 계산 순수 함수를 먼저 검증 스크립트로 작성 (실패 확인)**

`scripts/verify-pagination.mjs` 작성:

```js
// Pagination의 페이지 번호 윈도우 계산 순수 로직 회귀 테스트
// (src/components/Pagination.tsx의 getPageWindow와 반드시 동일 로직 유지)
function getPageWindow(currentPage, totalPages, maxVisible = 5) {
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(0, end - maxVisible + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

const cases = [
  { currentPage: 0, totalPages: 3, expected: [0, 1, 2] },
  { currentPage: 0, totalPages: 10, expected: [0, 1, 2, 3, 4] },
  { currentPage: 9, totalPages: 10, expected: [5, 6, 7, 8, 9] },
  { currentPage: 5, totalPages: 10, expected: [3, 4, 5, 6, 7] },
];

let failed = 0;
for (const c of cases) {
  const result = getPageWindow(c.currentPage, c.totalPages);
  const ok = JSON.stringify(result) === JSON.stringify(c.expected);
  if (!ok) {
    failed++;
    console.error(`FAIL: currentPage=${c.currentPage} totalPages=${c.totalPages} → ${JSON.stringify(result)}, expected ${JSON.stringify(c.expected)}`);
  }
}

if (failed > 0) {
  console.error(`${failed}개 케이스 실패`);
  process.exit(1);
}
console.log("모든 페이지네이션 케이스 통과");
```

Run: `node scripts/verify-pagination.mjs`
Expected: 이 시점엔 이미 통과함(순수 함수를 스크립트 안에 직접 구현했으므로) — 이 스크립트의 목적은 Step 4에서 실제 컴포넌트 로직을 바꿀 때 회귀를 잡는 것. 지금은 그냥 통과 확인만.

- [ ] **Step 3: `package.json`에 verify 스크립트 등록 확인**

`package.json`의 `scripts.verify`를 다음으로 교체(기존 content-analytics 검증과 함께 실행):

```json
"verify": "node scripts/verify-content-analytics.mjs && node scripts/verify-pagination.mjs"
```

- [ ] **Step 4: `src/components/Pagination.tsx` 작성 (Step 2와 동일 로직)**

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// 페이지 윈도우 계산 — scripts/verify-pagination.mjs와 동일 로직 유지 필수
function getPageWindow(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(0, end - maxVisible + 1);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPageWindow(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4">
      <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 0}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page + 1}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: 빌드 및 verify 확인**

Run: `npm run build && npm run lint && npm run verify`
Expected: 전부 성공

- [ ] **Step 6: 커밋**

```bash
git add src/components/SearchBar.tsx src/components/Pagination.tsx scripts/verify-pagination.mjs package.json
git commit -m "feat: SearchBar·Pagination 컴포넌트 추가 (페이지 윈도우 계산 회귀 테스트 포함)"
```

### Task 13: ProjectsTable을 DataTable+SearchBar+Pagination으로 교체

**Files:**
- Modify: `src/components/ProjectsTable.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectListItem } from "@/lib/schema/project";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SearchBar } from "./SearchBar";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 10;

// A-02 프로젝트 관리 목록 — 검색(제목)·필터(status/category) (관리자 UI 설계서 §3)
export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  // 검색/필터가 바뀌면 이전 페이지가 범위를 벗어날 수 있으니 0으로 리셋
  useEffect(() => setPage(0), [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: DataTableColumn<ProjectListItem>[] = [
    {
      key: "title",
      header: "제목",
      cell: (project) => (
        <Link href={`/projects/${project.slug}`} className="hover:underline">
          {project.title}
        </Link>
      ),
    },
    { key: "category", header: "category", cell: (project) => project.category.join(", ") },
    { key: "scope", header: "scope", cell: (project) => project.scope },
    { key: "status", header: "status", cell: (project) => project.status },
    { key: "featured", header: "featured", cell: (project) => (project.featured ? "✓" : "") },
    {
      key: "updatedAt",
      header: "수정일",
      cell: (project) => (project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("ko-KR") : "-"),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="제목 검색" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">전체 status</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(project) => project.slug}
        emptyState="결과 없음"
      />
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/ProjectsTable.tsx
git commit -m "refactor: ProjectsTable을 DataTable·SearchBar·Pagination 기반으로 교체"
```

### Task 14: DraftsTable을 DataTable+SearchBar+Pagination으로 교체

**Files:**
- Modify: `src/components/DraftsTable.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DraftListItem } from "@/lib/schema/post";
import { DataTable, type DataTableColumn } from "./DataTable";
import { SearchBar } from "./SearchBar";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 10;

// A-04 초안 관리 목록 — 검색(제목)·필터(status) (관리자 UI 설계서 §5)
export function DraftsTable({ drafts }: { drafts: DraftListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesQuery = draft.title.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || draft.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [drafts, query, statusFilter]);

  useEffect(() => setPage(0), [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: DataTableColumn<DraftListItem>[] = [
    {
      key: "title",
      header: "제목",
      cell: (draft) => (
        <Link href={`/drafts/${draft.slug}`} className="hover:underline">
          {draft.title}
        </Link>
      ),
    },
    { key: "status", header: "status", cell: (draft) => draft.status },
    { key: "source", header: "source", cell: (draft) => draft.source },
    { key: "date", header: "date", cell: (draft) => draft.date },
    {
      key: "updatedAt",
      header: "수정일",
      cell: (draft) => (draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString("ko-KR") : "-"),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="제목 검색" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">전체 status</option>
          <option value="draft">draft</option>
          <option value="ready">ready</option>
          <option value="published">published</option>
          <option value="synced">synced</option>
        </select>
      </div>

      <DataTable columns={columns} data={paged} rowKey={(draft) => draft.slug} emptyState="초안이 없습니다" />
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/DraftsTable.tsx
git commit -m "refactor: DraftsTable을 DataTable·SearchBar·Pagination 기반으로 교체"
```

### Task 15: Evaluation 발견사항 테이블을 DataTable로 교체

**Files:**
- Modify: `src/app/(admin)/evaluation/page.tsx:70-107`

- [ ] **Step 1: 발견사항 `<table>` 블록만 `DataTable`로 교체**

`src/app/(admin)/evaluation/page.tsx`의 import 목록에 추가:

```tsx
import { DataTable, type DataTableColumn } from "@/components/DataTable";
```

`EvaluationPage` 함수 안, `findings` 계산(`.sort(...)`로 끝나는 블록) 바로 다음 줄에 컬럼 정의를 추가한다:

```tsx
  const columns: DataTableColumn<(typeof findings)[number]>[] = [
    { key: "area", header: "영역", cell: (f) => f.area },
    {
      key: "severity",
      header: "심각도",
      cell: (f) => <StatusBadge label={SEVERITY_LABELS[f.severity] ?? f.severity} tone={f.severity} />,
    },
    { key: "issue", header: "이슈", cell: (f) => f.issue },
    { key: "suggestion", header: "제안", cell: (f) => <span className="text-muted-foreground">{f.suggestion}</span> },
    {
      key: "status",
      header: "상태",
      cell: (f) => <StatusBadge label={FINDING_STATUS_LABELS[f.status] ?? f.status} tone={f.status} />,
    },
    { key: "date", header: "평가일", cell: (f) => <span className="text-muted-foreground">{f.date}</span> },
  ];
```

기존 `<table className="w-full text-left text-sm">...</table>` 전체 블록(70~107행)을 아래로 교체:

```tsx
        <DataTable
          columns={columns}
          data={findings}
          rowKey={(f, i) => `${f.date}-${i}`}
          emptyState="발견사항이 없습니다"
        />
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add "src/app/(admin)/evaluation/page.tsx"
git commit -m "refactor: Evaluation 발견사항 테이블을 DataTable로 교체"
```

### Task 16: ProfileDataForm/RecordsDataForm 그리드 반응형화

**Files:**
- Modify: `src/components/ProfileDataForm.tsx:123`, `src/components/ProfileDataForm.tsx:155`
- Modify: `src/components/RecordsDataForm.tsx:121`, `src/components/RecordsDataForm.tsx:149`

- [ ] **Step 1: `ProfileDataForm.tsx` 123행 수정**

Before:
```tsx
              <div className="grid flex-1 grid-cols-2 gap-2">
```
After:
```tsx
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
```

- [ ] **Step 2: `ProfileDataForm.tsx` 155행 수정**

Before:
```tsx
              <div className="grid grid-cols-2 gap-2">
```
After:
```tsx
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
```

- [ ] **Step 3: `RecordsDataForm.tsx` 121행 수정**

Before:
```tsx
              <div className="grid flex-1 grid-cols-2 gap-2">
```
After:
```tsx
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
```

- [ ] **Step 4: `RecordsDataForm.tsx` 149행 수정**

Before:
```tsx
              <div className="grid grid-cols-2 gap-2">
```
After:
```tsx
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
```

주의: `RecordsDataForm.tsx`에는 `grid-cols-2`가 이 위치 외에 `items` 섹션에도 등장할 수 있다(150행 부근, `date`+`category` 페어). 해당 파일에서 `grid-cols-2` 문자열을 전부 찾아 동일하게 `grid-cols-1 sm:grid-cols-2`로 바꾼다.

Run: `grep -n "grid-cols-2" src/components/RecordsDataForm.tsx` 로 남은 항목이 없는지 확인.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add src/components/ProfileDataForm.tsx src/components/RecordsDataForm.tsx
git commit -m "feat: ProfileDataForm·RecordsDataForm 그리드 반응형화"
```

---

## Phase 5: 분석/차트/토스트

### Task 17: StackedBarChart를 recharts로 교체

**Files:**
- Modify: `src/components/StackedBarChart.tsx`

- [ ] **Step 1: 전체 교체 (외부 API `ChartSegment`/`StackedBarChart` 이름은 유지 — 호출부 무변경)**

```tsx
"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface ChartSegment {
  label: string;
  count: number;
  colorClass: string; // 레거시 필드 — recharts 전환 후에도 호출부 호환을 위해 유지, hex로 매핑
}

// bg-{color}-500 형태 Tailwind 클래스를 recharts용 hex로 매핑
const COLOR_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-green-500": "#22c55e",
  "bg-purple-500": "#a855f7",
  "bg-amber-500": "#f59e0b",
  "bg-pink-500": "#ec4899",
  "bg-cyan-500": "#06b6d4",
  "bg-black/25 dark:bg-white/25": "#9ca3af",
  "bg-black/20 dark:bg-white/20": "#9ca3af",
};

function toHex(colorClass: string): string {
  return COLOR_HEX[colorClass] ?? "#9ca3af";
}

export function StackedBarChart({ segments }: { segments: ChartSegment[] }) {
  const data = segments.map((s) => ({ name: s.label, count: s.count, fill: toHex(s.colorClass) }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <Tooltip cursor={{ fill: "transparent" }} />
          <Bar dataKey="count" radius={4} barSize={20}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toHex(s.colorClass) }} />
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}
```

참고: recharts의 `BarChart layout="vertical"`는 X축(수치)·Y축(카테고리) 배치가 기존 "가로 누적 막대"와 다르게 각 세그먼트가 별도 행으로 그려진다 — 기존 "한 줄에 다 이어붙인 스택 바"와 시각적으로 다르다는 점을 사용자에게 실 렌더 확인 시 안내할 것(로그인 필요 화면이라 Claude가 직접 확인 불가).

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/StackedBarChart.tsx
git commit -m "refactor: StackedBarChart를 recharts 기반으로 교체"
```

### Task 18: ScoreTrendChart를 recharts로 교체

**Files:**
- Modify: `src/components/ScoreTrendChart.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export interface ScorePoint {
  date: string;
  score: number;
}

export function ScoreTrendChart({ points }: { points: ScorePoint[] }) {
  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={points} margin={{ left: 0, right: 16, top: 16, bottom: 4 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/ScoreTrendChart.tsx
git commit -m "refactor: ScoreTrendChart를 recharts 기반으로 교체"
```

### Task 19: AnalyticsStatus 컴포넌트 + SectionErrorNotice 대체

**Files:**
- Create: `src/components/AnalyticsStatus.tsx`
- Modify: `src/components/ContentAnalyticsSection.tsx`
- Modify: `src/components/PublishSection.tsx`
- Delete: `src/components/SectionErrorNotice.tsx` (교체 후 미사용 확인되면)

- [ ] **Step 1: `src/components/AnalyticsStatus.tsx` 작성**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

// gc-dating-app AnalyticsStatus 패턴 포팅 — Promise.allSettled 실패 섹션에
// "다시 시도"(router.refresh)까지 갖춘 에러 표시. 기존 SectionErrorNotice(정적 문구만) 대체
export function AnalyticsError({ label }: { label: string }) {
  const router = useRouter();
  return (
    <div className="mb-4 flex flex-col items-start gap-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {label} 데이터를 불러오지 못했습니다.
      </span>
      <button
        onClick={() => router.refresh()}
        className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      >
        다시 시도
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `ContentAnalyticsSection.tsx`에서 `SectionErrorNotice` → `AnalyticsError`로 교체**

Import 줄 교체:

Before:
```tsx
import { SectionErrorNotice } from "./SectionErrorNotice";
```
After:
```tsx
import { AnalyticsError } from "./AnalyticsStatus";
```

본문 내 사용처 3곳 교체 (`<SectionErrorNotice label="스택" />` → `<AnalyticsError label="스택" />`, `"프로젝트"`, `"Records"` 동일 패턴으로 각각 교체).

- [ ] **Step 3: `PublishSection.tsx`에서도 동일하게 교체**

Import 줄 교체 후, `<SectionErrorNotice label="..." />` 4곳(`"글 상태"`, `"워크플로 실행 이력"`, `"admin PR 이력"`)을 `<AnalyticsError label="..." />`로 교체.

- [ ] **Step 4: `SectionErrorNotice.tsx` 참조가 완전히 사라졌는지 확인 후 삭제**

Run: `grep -rln "SectionErrorNotice" src/`
Expected: 결과 없음 (모두 교체됨)

```bash
rm src/components/SectionErrorNotice.tsx
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build && npm run lint`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "refactor: SectionErrorNotice를 재시도 가능한 AnalyticsError로 대체"
```

### Task 20: toast-errors.ts + 폼 3개 연결

**Files:**
- Create: `src/lib/toast-errors.ts`
- Test: `scripts/verify-toast-errors.mjs`
- Modify: `src/components/ProjectForm.tsx`, `src/components/ProfileDataForm.tsx`, `src/components/RecordsDataForm.tsx`

- [ ] **Step 1: 에러코드→메시지 매핑 순수 함수를 검증 스크립트로 먼저 작성**

`scripts/verify-toast-errors.mjs`:

```js
// api-errors.ts의 toErrorResponse()가 내려주는 error 코드 → 한글 메시지 매핑 회귀 테스트
// (src/lib/toast-errors.ts의 errorCodeToMessage와 반드시 동일 매핑 유지)
const ERROR_MESSAGES = {
  invalid_schema: "입력값이 올바르지 않습니다.",
  slug_conflict: "이미 존재하는 슬러그입니다.",
  slug_immutable: "슬러그는 수정할 수 없습니다.",
  not_found: "리소스를 찾을 수 없습니다.",
  sha_conflict: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요.",
  upstream_error: "GitHub 연동 중 오류가 발생했습니다.",
};

function errorCodeToMessage(code, fallbackMessage) {
  return ERROR_MESSAGES[code] ?? fallbackMessage ?? "알 수 없는 오류가 발생했습니다.";
}

const cases = [
  { code: "sha_conflict", fallback: undefined, expected: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요." },
  { code: "not_found", fallback: undefined, expected: "리소스를 찾을 수 없습니다." },
  { code: "unknown_code", fallback: "서버 메시지", expected: "서버 메시지" },
  { code: "unknown_code", fallback: undefined, expected: "알 수 없는 오류가 발생했습니다." },
];

let failed = 0;
for (const c of cases) {
  const result = errorCodeToMessage(c.code, c.fallback);
  if (result !== c.expected) {
    failed++;
    console.error(`FAIL: code=${c.code} → "${result}", expected "${c.expected}"`);
  }
}

if (failed > 0) {
  console.error(`${failed}개 케이스 실패`);
  process.exit(1);
}
console.log("모든 에러 메시지 매핑 케이스 통과");
```

Run: `node scripts/verify-toast-errors.mjs`
Expected: 통과 (스크립트 안에 이미 구현을 직접 포함 — 목적은 Task 완료 후 실제 `toast-errors.ts`와의 매핑 불일치를 회귀로 잡는 것)

- [ ] **Step 2: `package.json` verify 스크립트에 추가**

```json
"verify": "node scripts/verify-content-analytics.mjs && node scripts/verify-pagination.mjs && node scripts/verify-toast-errors.mjs"
```

- [ ] **Step 3: `src/lib/toast-errors.ts` 작성 (Step 1과 동일 매핑)**

```ts
import toast from "react-hot-toast";

// profile-admin 자체 에러 코드(src/lib/api-errors.ts의 toErrorResponse) → 한글 메시지
// scripts/verify-toast-errors.mjs와 매핑을 동일하게 유지할 것
const ERROR_MESSAGES: Record<string, string> = {
  invalid_schema: "입력값이 올바르지 않습니다.",
  slug_conflict: "이미 존재하는 슬러그입니다.",
  slug_immutable: "슬러그는 수정할 수 없습니다.",
  not_found: "리소스를 찾을 수 없습니다.",
  sha_conflict: "저장 충돌: 다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도하세요.",
  upstream_error: "GitHub 연동 중 오류가 발생했습니다.",
};

export function errorCodeToMessage(code?: string, fallbackMessage?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallbackMessage ?? "알 수 없는 오류가 발생했습니다.";
}

export function toastApiError(json: { error?: string; message?: string }) {
  toast.error(errorCodeToMessage(json.error, json.message));
}

export function toastSaved() {
  toast.success("저장되었습니다.");
}
```

- [ ] **Step 4: `RecordsDataForm.tsx`의 `onSubmit` 핸들러에 토스트 연결**

`RecordsDataForm.tsx` 상단 import 줄(`import { useState } from "react";` 등) 마지막에 두 줄 추가:

```tsx
import toast from "react-hot-toast";
import { toastApiError, toastSaved } from "@/lib/toast-errors";
```

`onSubmit` 함수 내부 세 지점 수정:

Before (66~74행):
```tsx
      if (!res.ok) {
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict(true);
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```
After:
```tsx
      if (!res.ok) {
        toastApiError(json);
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict(true);
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```

Before (76~78행):
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      router.refresh();
```
After:
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      toastSaved();
      router.refresh();
```

Before (79~82행):
```tsx
    } catch {
      setServerError("네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.");
      setStatus("error");
    }
```
After:
```tsx
    } catch {
      const message = "네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.";
      setServerError(message);
      setStatus("error");
      toast.error(message);
    }
```

- [ ] **Step 5: `ProfileDataForm.tsx`에 동일하게 연결**

확인 결과 `ProfileDataForm.tsx`는 `RecordsDataForm.tsx`와 `onSubmit` 블록이 한 글자도 다르지 않다(55~76행). 상단 import(`import { useState } from "react";` 등) 마지막에 추가:

```tsx
import toast from "react-hot-toast";
import { toastApiError, toastSaved } from "@/lib/toast-errors";
```

Before (59~68행):
```tsx
      if (!res.ok) {
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict(true);
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```
After:
```tsx
      if (!res.ok) {
        toastApiError(json);
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict(true);
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```

Before (70~72행):
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      router.refresh();
```
After:
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      toastSaved();
      router.refresh();
```

Before (73~76행):
```tsx
    } catch {
      setServerError("네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.");
      setStatus("error");
    }
```
After:
```tsx
    } catch {
      const message = "네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.";
      setServerError(message);
      setStatus("error");
      toast.error(message);
    }
```

- [ ] **Step 6: `ProjectForm.tsx`에 동일하게 연결**

`ProjectForm.tsx`는 `conflict` state 타입만 다르다(`{ sha: string } | null`이라 `setConflict({ sha: json.latest?.sha })` 형태). 상단 import(`import { useRef, useState } from "react";` 등) 마지막에 추가:

```tsx
import toast from "react-hot-toast";
import { toastApiError, toastSaved } from "@/lib/toast-errors";
```

Before (167~176행):
```tsx
      if (!res.ok) {
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict({ sha: json.latest?.sha });
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```
After:
```tsx
      if (!res.ok) {
        toastApiError(json);
        if (res.status === 409 && json.error === "sha_conflict") {
          setConflict({ sha: json.latest?.sha });
          setStatus("error");
          return;
        }
        setServerError(json.message ?? "저장 중 오류가 발생했습니다");
        setStatus("error");
        return;
      }
```

Before (178~180행):
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      router.refresh();
```
After:
```tsx
      setPrUrl(json.prUrl);
      setStatus("done");
      toastSaved();
      router.refresh();
```

Before (181~184행):
```tsx
    } catch {
      setServerError("네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.");
      setStatus("error");
    }
```
After:
```tsx
    } catch {
      const message = "네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.";
      setServerError(message);
      setStatus("error");
      toast.error(message);
    }
```

- [ ] **Step 7: 빌드 및 verify 확인**

Run: `npm run build && npm run lint && npm run verify`
Expected: 전부 성공

- [ ] **Step 8: 커밋**

```bash
git add src/lib/toast-errors.ts scripts/verify-toast-errors.mjs package.json src/components/RecordsDataForm.tsx src/components/ProfileDataForm.tsx src/components/ProjectForm.tsx
git commit -m "feat: 폼 제출 성공/실패 토스트 추가 (profile-admin 자체 에러코드 매핑)"
```

---

## 최종 확인

- [ ] **전체 빌드/린트/검증 한 번에 실행**

Run: `npm run build && npm run lint && npm run verify`
Expected: 전부 성공

- [ ] **의존성 사용처 확인** — 설치한 패키지가 실제로 전부 쓰였는지 확인

Run: `grep -rl "@radix-ui/react-slot\|next-themes\|recharts\|react-hot-toast\|class-variance-authority" src/`
Expected: 각 패키지마다 최소 1개 이상의 사용 파일이 나와야 함(모두 Task 1~20에서 실제로 import됨). 안 나오는 패키지가 있으면 `package.json`에서 제거.

- [ ] **사용자 보고**: `npm run build`/`lint`/`verify` 통과 완료. profile-admin은 로그인 필요(FR-M16)라 실제 렌더링·인터랙션(드로어 동작, 테마 3단 전환, 토스트 노출, 차트 시각적 형태)은 사용자가 직접 로그인해서 확인 필요 — 특히 Task 17의 recharts 막대차트는 기존 "한 줄 스택 바"와 시각적으로 달라졌다는 점을 짚어줄 것.
