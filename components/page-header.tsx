import type { ComponentType, ReactNode } from "react";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4">
      {/* 제목 옆에 설명을 인라인 배치(설명이 화면을 덜 차지하도록) */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h1 className="shrink-0 text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * 화면 주요 액션 버튼(공통) — 모든 페이지의 "새 …/등록" 버튼은 이걸로 통일.
 * PageHeader 의 action 슬롯에 넣어 제목 우측에 일관 배치한다.
 */
export function PrimaryButton({
  label,
  onClick,
  icon: Icon = Plus,
  disabled,
  type = "button",
}: {
  label: string;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button size="sm" onClick={onClick} disabled={disabled} type={type} className="gap-1.5">
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function LoadingRow({ label }: { label: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner /> {label}
    </div>
  );
}

/**
 * 파괴적(destructive) 에러 카드.
 * - icon: AlertCircle 표시(아이콘 변형). title 없으면 메시지만.
 * - title/message/hint 로 제목·본문·보조설명 구성.
 */
export function ErrorState({
  title,
  message,
  hint,
  icon = false,
  className,
}: {
  title?: string;
  message: ReactNode;
  hint?: ReactNode;
  icon?: boolean;
  className?: string;
}) {
  if (icon) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm",
          className,
        )}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        {title ? (
          <div>
            <p className="font-medium text-destructive">{title}</p>
            <p className="mt-1 text-muted-foreground">{message}</p>
            {hint && (
              <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">{message}</p>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm",
        className,
      )}
    >
      {title && <p className="font-medium text-destructive">{title}</p>}
      <p className={cn("text-muted-foreground", title && "mt-1")}>{message}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
