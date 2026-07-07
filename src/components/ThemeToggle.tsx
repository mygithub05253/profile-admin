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
