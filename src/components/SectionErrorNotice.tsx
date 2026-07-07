// Promise.allSettled로 개별 데이터 소스가 실패했을 때 섹션 단위로 보여주는 인라인 오류 —
// 전체 페이지를 죽이지 않고 실패한 부분만 알린다 (스키마 drift로 /data/stacks 전체가 죽었던 버그 재발 방지)
export function SectionErrorNotice({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
      {label} 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
    </div>
  );
}
