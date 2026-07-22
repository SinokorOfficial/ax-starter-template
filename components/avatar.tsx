"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Outlook 처럼 이름별로 안정적인 아바타 색상(팔레트에서 해시 선택).
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
];
function colorOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * 사람/그룹 공용 아바타.
 * - 사진(photoSrc) 로드 실패 시 이니셜로 폴백
 * - kind="group" 이면 사람 대신 Users 아이콘(bg-muted)
 * - colorSeed 제공 시 시드 기반 색상 해시(사람 아바타), 없으면 bg-primary
 * 크기/폰트/텍스트 클래스는 호출부가 className 으로 정확히 지정한다.
 */
export function Avatar({
  name,
  photoSrc,
  kind,
  className,
  iconClassName,
  colorSeed,
  initialsCount = 2,
  fallback = "?",
  imgAlt = "프로필 사진",
}: {
  name: string;
  photoSrc?: string;
  kind?: "user" | "group";
  className?: string;
  iconClassName?: string;
  /** 제공 시 이 시드로 색상 해시(사람 아바타). 없으면 bg-primary. */
  colorSeed?: string;
  initialsCount?: number;
  fallback?: string;
  imgAlt?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = cn("flex items-center justify-center rounded-full", className);

  if (kind === "group") {
    return (
      <span className={cn(box, "bg-muted text-muted-foreground")}>
        <Users className={cn("h-4 w-4", iconClassName)} />
      </span>
    );
  }

  if (photoSrc && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoSrc}
        alt={imgAlt}
        className={cn("rounded-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = name.trim().slice(0, initialsCount).toUpperCase() || fallback;
  return (
    <span
      className={cn(
        box,
        colorSeed ? colorOf(colorSeed) : "bg-primary text-primary-foreground",
      )}
    >
      {initials}
    </span>
  );
}
