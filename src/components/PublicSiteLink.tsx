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
