"use client";

// 공용 3-pane 레이아웃 — 메일·Drive 등 "트리 → 목록 → 상세" 화면의 뼈대.
// 기능: 좌측 pane 접기(Outlook식 햄버거) + pane 경계 드래그로 너비 조절
//       + 너비/접힘 상태 localStorage 저장(페이지별) + 데스크톱 전용(모바일은 스택).
// 각 slot(left/list/detail) 내부의 로딩·빈·에러 상태는 호출부가 담당한다.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PanelLeftClose, PanelLeft, Folder, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * pane 공용 헤더 — 1pane(좌측 트리)·2pane(목록)이 동일한 형태를 공유한다.
 * 레이아웃: [폴더 아이콘] [제목(굵게) + 보조경로] … [N개] [접기]
 * copyPath 를 주면 폴더 아이콘이 "경로 복사" 버튼이 된다(파일 pane 전용).
 * 이 동작만 페이지가 주입하고 레이아웃은 모듈이 소유 → 헤더 통일 + 기능 분리.
 */
export function PaneHeader({
  title,
  trailing,
  count,
  copyPath,
  onCollapse,
  collapseLabel = "접기",
}: {
  title: ReactNode;
  /** 제목 옆 보조 텍스트(예: 경로 breadcrumb). */
  trailing?: ReactNode;
  /** 항목 수(개). */
  count?: number;
  /** 지정 시 폴더 아이콘이 이 문자열을 클립보드에 복사하는 버튼이 됨. */
  copyPath?: string;
  onCollapse: () => void;
  collapseLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    if (!copyPath) return;
    try {
      await navigator.clipboard.writeText(copyPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 등 실패 — 무시(치명적 아님).
    }
  };
  return (
    <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-sm text-muted-foreground">
      {copyPath ? (
        <button
          type="button"
          onClick={doCopy}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="경로 복사"
          title={copied ? "복사됨" : "경로 복사"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
        </button>
      ) : (
        <Folder className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold text-foreground">{title}</span>
        {trailing != null && trailing !== "" && (
          <span className="ml-1 text-xs font-normal">{trailing}</span>
        )}
      </span>
      {typeof count === "number" && (
        <span className="shrink-0 text-xs">{count}개</span>
      )}
      <button
        type="button"
        onClick={onCollapse}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={collapseLabel}
        title={collapseLabel}
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
    </div>
  );
}

const MIN_LEFT = 160;
const MAX_LEFT = 480;
const MIN_LIST = 240;
const MIN_DETAIL = 280;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

/** md(768px) 이상인지 — 접기/리사이즈는 데스크톱에서만. SSR 안전(초기 true). */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

interface PersistedState {
  leftWidth: number;
  listWidth: number;
  collapsed: boolean;
  listCollapsed: boolean;
}

/** list 슬롯이 함수형일 때 전달되는 API — 헤더 등에 접기 버튼을 두기 위함. */
export interface ThreePaneListApi {
  collapse: () => void;
}

interface ThreePaneProps {
  /** localStorage 키(페이지별로 고유). 없으면 저장 안 함. */
  storageKey?: string;
  /** 좌측 트리 pane 내용. 생략(undefined)하면 좌측 pane 자체를 렌더하지 않음. */
  left?: ReactNode;
  /** 좌측 pane 헤더 라벨(접기 버튼 옆). */
  leftTitle?: string;
  /** 좌측 pane 헤더에 표시할 항목 수(최상위 개수 등). */
  leftCount?: number;
  /** 중앙 목록 pane 내용(자체 로딩/빈/에러 포함).
   *  함수형이면 collapse 콜백을 받아 헤더에 접기 버튼을 배치할 수 있다. */
  list: ReactNode | ((api: ThreePaneListApi) => ReactNode);
  /** 우측 상세 pane 내용(자체 placeholder 포함). */
  detail: ReactNode;
  /** 모바일에서 상세를 표시(목록 숨김)할지 — 항목 선택 여부. */
  detailActive?: boolean;
  defaultLeftWidth?: number;
  defaultListWidth?: number;
}

export function ThreePane({
  storageKey,
  left,
  leftTitle = "탐색",
  leftCount,
  list,
  detail,
  detailActive = false,
  defaultLeftWidth = 224,
  defaultListWidth = 380,
}: ThreePaneProps) {
  const isDesktop = useIsDesktop();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLeft = left !== undefined && left !== null;

  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [listWidth, setListWidth] = useState(defaultListWidth);
  const [collapsed, setCollapsed] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [restored, setRestored] = useState(false);

  // 저장된 너비/접힘 복원(마운트 후 1회 — SSR 일치 위해 초기값은 기본값 사용).
  useEffect(() => {
    if (!storageKey) {
      setRestored(true);
      return;
    }
    try {
      const raw = localStorage.getItem(`three-pane:${storageKey}`);
      if (raw) {
        const s = JSON.parse(raw) as Partial<PersistedState>;
        if (typeof s.leftWidth === "number")
          setLeftWidth(clamp(s.leftWidth, MIN_LEFT, MAX_LEFT));
        if (typeof s.listWidth === "number")
          setListWidth(Math.max(s.listWidth, MIN_LIST));
        if (typeof s.collapsed === "boolean") setCollapsed(s.collapsed);
        if (typeof s.listCollapsed === "boolean")
          setListCollapsed(s.listCollapsed);
      }
    } catch {
      // 저장값 파싱 실패 — 기본값 유지.
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 상태 변경 시 저장(복원 완료 후에만 — 초기 기본값 덮어쓰기 방지).
  useEffect(() => {
    if (!storageKey || !restored) return;
    try {
      localStorage.setItem(
        `three-pane:${storageKey}`,
        JSON.stringify({
          leftWidth,
          listWidth,
          collapsed,
          listCollapsed,
        } as PersistedState),
      );
    } catch {
      // 저장 실패 — 무시(기능은 계속 동작).
    }
  }, [storageKey, restored, leftWidth, listWidth, collapsed, listCollapsed]);

  // 목록 너비 최대값 — 상세 pane 최소폭을 확보하도록 컨테이너 폭에서 역산.
  const clampList = useCallback(
    (w: number) => {
      const cw = containerRef.current?.offsetWidth ?? 1200;
      const leftPart = hasLeft && !collapsed ? leftWidth : 0;
      const max = cw - leftPart - MIN_DETAIL - 16;
      return clamp(w, MIN_LIST, max);
    },
    [hasLeft, collapsed, leftWidth],
  );

  // 좌측 너비 최대값 — 목록+상세 최소폭을 침범하지 않도록 클램프.
  const clampLeft = useCallback(
    (w: number) => {
      const cw = containerRef.current?.offsetWidth ?? 1200;
      const listPart = listCollapsed ? 0 : listWidth;
      const max = Math.min(MAX_LEFT, cw - listPart - MIN_DETAIL - 16);
      return clamp(w, MIN_LEFT, max);
    },
    [listWidth, listCollapsed],
  );

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 overflow-hidden rounded-lg border"
    >
      {/* ── 좌측 pane (접기/리사이즈) ── */}
      {hasLeft &&
        (collapsed ? (
          <div className="hidden w-9 shrink-0 flex-col items-center border-r pt-2 md:flex">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`${leftTitle} 펼치기`}
              title={`${leftTitle} 펼치기`}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div
              className="hidden shrink-0 flex-col overflow-hidden border-r md:flex"
              style={isDesktop ? { width: leftWidth } : undefined}
            >
              <PaneHeader
                title={leftTitle}
                count={leftCount}
                onCollapse={() => setCollapsed(true)}
                collapseLabel={`${leftTitle} 접기`}
              />
              <div className="min-h-0 flex-1 overflow-y-auto p-2">{left}</div>
            </div>
            <Divider
              onResize={(dx) => setLeftWidth((w) => clampLeft(w + dx))}
              onReset={() => setLeftWidth(defaultLeftWidth)}
            />
          </>
        ))}

      {/* ── 중앙: 목록 pane (접기/리사이즈) ── */}
      {listCollapsed && isDesktop ? (
        <div className="hidden w-9 shrink-0 flex-col items-center border-r pt-2 md:flex">
          <button
            type="button"
            onClick={() => setListCollapsed(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="목록 펼치기"
            title="목록 펼치기"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex min-w-0 flex-col overflow-hidden md:shrink-0 md:border-r",
              "w-full",
              detailActive && "hidden md:flex",
            )}
            style={isDesktop ? { width: listWidth } : undefined}
          >
            {typeof list === "function"
              ? list({ collapse: () => setListCollapsed(true) })
              : list}
          </div>
          <Divider
            onResize={(dx) => setListWidth((w) => clampList(w + dx))}
            onReset={() => setListWidth(defaultListWidth)}
          />
        </>
      )}

      {/* ── 우측: 상세 pane ── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden",
          !detailActive && "hidden md:flex",
        )}
      >
        {detail}
      </div>
    </div>
  );
}

/** pane 경계 드래그 핸들(데스크톱 전용). 증분(delta)으로 좌측 pane 너비 조절. */
function Divider({
  onResize,
  onReset,
}: {
  onResize: (dx: number) => void;
  onReset: () => void;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      onResizeRef.current(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    // 얇은 시각선(1px) + 넓은 투명 그립(≈13px)으로 잡기 쉽게. 레이아웃 폭은 1px만 차지.
    <div
      role="separator"
      aria-orientation="vertical"
      className="relative hidden w-px shrink-0 bg-border md:block"
    >
      <div
        className="absolute inset-y-0 -left-1.5 -right-1.5 z-10 cursor-col-resize transition-colors hover:bg-primary/30 active:bg-primary/50"
        onPointerDown={(e) => {
          dragging.current = true;
          lastX.current = e.clientX;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        onDoubleClick={onReset}
        title="드래그로 너비 조절 · 더블클릭 초기화"
      />
    </div>
  );
}
