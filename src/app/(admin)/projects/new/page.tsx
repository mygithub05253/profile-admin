"use client";

import { useEffect, useState } from "react";
import { ProjectForm } from "@/components/ProjectForm";
import type { ProjectFrontmatter } from "@/lib/schema/project";
import { IMPORT_PREFILL_KEY } from "@/lib/import-prefill-key";

type Prefill = Partial<ProjectFrontmatter> & { scopeHint?: "personal" | "team" };

// A-03 프로젝트 생성 — FR-M10에서 넘어온 프리필이 있으면 그대로 반영
export default function NewProjectPage() {
  const [prefill, setPrefill] = useState<Prefill | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(IMPORT_PREFILL_KEY);
    if (raw) {
      sessionStorage.removeItem(IMPORT_PREFILL_KEY);
      setPrefill(JSON.parse(raw));
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">새 프로젝트</h1>
      <ProjectForm mode="create" initialFrontmatter={prefill} scopeHint={prefill?.scopeHint} />
    </div>
  );
}
