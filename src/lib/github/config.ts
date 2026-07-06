// content-hub 저장 대상 고정 상수 (관리자 API 명세서 §3.2, §6.2 — 단일 테넌트 admin)
export const CONTENT_HUB_OWNER = "mygithub05253";
export const CONTENT_HUB_REPO = "content-hub";
export const BASE_BRANCH = "main";

export const PROJECTS_DIR = "projects";
export const DRAFTS_DIR = "drafts";
export const POSTS_DIR = "posts";
export const ASSETS_DIR = "assets";

// FR-M22 이미지 업로드 가드 (관리자 기능명세서 §22 — R-3)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_SAVE = 12;

// 프로필 README 레포 (blog-post.yml 워크플로 조회용, FR-M20 §20)
export const PROFILE_README_OWNER = "mygithub05253";
export const PROFILE_README_REPO = "mygithub05253";

// UX/제품 품질 평가 이력 (신규, 세션 13 사용자 요청) — 읽기 전용, my-profile-site는 미참조
export const UX_SCORES_PATH = "data/ux-scores.yml";
