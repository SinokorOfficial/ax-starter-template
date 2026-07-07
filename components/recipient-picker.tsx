"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchRecipients, type DirectoryHit } from "@/lib/portal-client";

export interface Recipient {
  name?: string;
  email: string;
  kind?: "user" | "group";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s: string) => EMAIL_RE.test(s.trim());

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
function initial(s: string): string {
  return s.trim().charAt(0).toUpperCase() || "?";
}

/** 사람/그룹 공용 아바타(그룹은 아이콘, 사람은 컬러 이니셜). */
function Avatar({
  seed,
  kind,
  size = "md",
}: {
  seed: string;
  kind?: "user" | "group";
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-xs";
  if (kind === "group") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          box,
        )}
      >
        <Users className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        box,
        colorOf(seed),
      )}
    >
      {initial(seed)}
    </span>
  );
}

/**
 * Outlook 스타일 수신자 선택기(칩 + 타입어헤드). 사람 + 메일 그룹 검색.
 * - 2글자↑ 입력 시 사내 주소록 검색, 이름만으로 선택
 * - 결과에 없는 외부 이메일은 "그대로 추가"
 * - 키보드: ↑/↓ 이동, Enter/Tab 선택, , ; Space 로 확정, 빈 입력 Backspace 로 삭제
 */
export function RecipientPicker({
  id,
  value,
  onChange,
  placeholder,
  usersOnly = false,
}: {
  id?: string;
  value: Recipient[];
  onChange: (next: Recipient[]) => void;
  placeholder?: string;
  /** true 면 사람만 검색(그룹 제외). Teams 1:1 처럼 그룹이 무의미한 곳에서 사용. */
  usersOnly?: boolean;
}) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<DirectoryHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 이미 담긴 이메일(중복 방지용, 소문자)
  const chosen = new Set(value.map((r) => r.email.toLowerCase()));

  // 결과에 없지만 유효한 이메일이면 "그대로 추가" 가상 행 노출
  const raw = text.trim();
  const showRaw =
    isEmail(raw) &&
    !results.some((p) => p.email.toLowerCase() === raw.toLowerCase()) &&
    !chosen.has(raw.toLowerCase());
  const optionCount = results.length + (showRaw ? 1 : 0);

  // 디바운스 검색
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchRecipients(q, ctrl.signal)
        .then((hits) => {
          setResults(
            hits.filter(
              (p) =>
                !chosen.has(p.email.toLowerCase()) &&
                (!usersOnly || p.kind === "user"),
            ),
          );
          setActive(0);
          setOpen(true);
        })
        .catch(() => {
          /* abort/실패는 조용히 무시 — 직접 입력은 계속 가능 */
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (r: Recipient) => {
    if (!r.email || chosen.has(r.email.toLowerCase())) {
      setText("");
      return;
    }
    onChange([...value, r]);
    setText("");
    setResults([]);
    setActive(0);
    inputRef.current?.focus();
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  // active 인덱스 → 실제 선택
  const commitActive = () => {
    if (active < results.length) {
      const h = results[active];
      add({ name: h.name, email: h.email, kind: h.kind });
    } else if (showRaw || isEmail(raw)) {
      add({ email: raw });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        if (optionCount) {
          e.preventDefault();
          setOpen(true);
          setActive((a) => (a + 1) % optionCount);
        }
        break;
      case "ArrowUp":
        if (optionCount) {
          e.preventDefault();
          setActive((a) => (a - 1 + optionCount) % optionCount);
        }
        break;
      case "Enter":
      case "Tab":
        if (open && optionCount) {
          e.preventDefault();
          commitActive();
        } else if (isEmail(raw)) {
          e.preventDefault();
          add({ email: raw });
        }
        break;
      case ",":
      case ";":
      case " ":
        if (isEmail(raw)) {
          e.preventDefault();
          add({ email: raw });
        }
        break;
      case "Backspace":
        if (!text && value.length) removeAt(value.length - 1);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={boxRef} className="relative">
      {/* 입력 박스: 칩 + 텍스트 인풋 */}
      <div
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((r, i) => (
          <span
            key={`${r.email}-${i}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-0.5 pl-0.5 pr-1.5 text-xs text-secondary-foreground"
            title={r.name ? `${r.name} <${r.email}>` : r.email}
          >
            <Avatar seed={r.name || r.email} kind={r.kind} size="sm" />
            <span className="truncate">{r.name || r.email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-black/10 hover:text-foreground"
              aria-label={`${r.name || r.email} 삭제`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => text.trim().length >= 2 && setOpen(true)}
          placeholder={value.length ? "" : placeholder}
          autoComplete="off"
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 드롭다운 */}
      {open && (loading || optionCount > 0 || raw.length >= 2) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-card py-1 shadow-md">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 검색 중…
            </div>
          )}

          {!loading &&
            results.map((p, i) => (
              <button
                key={`${p.kind}-${p.email}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => add({ name: p.name, email: p.email, kind: p.kind })}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-1.5 text-left",
                  active === i ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <Avatar seed={p.name || p.email} kind={p.kind} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm">{p.name}</span>
                    {p.kind === "group" && (
                      <span className="shrink-0 rounded bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                        그룹
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.kind === "group"
                      ? [p.email, p.groupType].filter(Boolean).join(" · ")
                      : [p.email, p.jobTitle || p.department]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </span>
              </button>
            ))}

          {/* 외부/직접 입력 이메일 */}
          {!loading && showRaw && (
            <button
              type="button"
              onMouseEnter={() => setActive(results.length)}
              onClick={() => add({ email: raw })}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-1.5 text-left",
                active === results.length ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="text-muted-foreground">이 주소 추가: </span>
                {raw}
              </span>
            </button>
          )}

          {/* 결과 없음 */}
          {!loading && optionCount === 0 && raw.length >= 2 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              일치하는 사람이 없습니다. 이메일 주소를 직접 입력하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
