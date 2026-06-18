"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/page-header";
import { fetchMyEvents } from "@/lib/portal-client";
import type { CalendarEvent } from "@/lib/types";

type View = "calendar" | "list";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 로컬 기준 YYYY-MM-DD */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** 이벤트 시작의 날짜 키 (Graph KST 문자열 앞 10자리 → 타임존 무관 그룹) */
function dayKey(iso: string): string {
  return (iso || "").slice(0, 10);
}
function hhmm(iso: string): string {
  return iso
    ? new Date(iso).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

export default function MyCalendarPage() {
  const [view, setView] = useState<View>("calendar");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 보이는 6주 그리드의 시작(해당 월 1일이 포함된 주의 일요일)부터 42일.
  const gridStart = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const s = new Date(first);
    s.setDate(1 - first.getDay());
    return s;
  }, [month]);
  const gridDays = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
      }),
    [gridStart],
  );

  // 선택한 월 기준으로 그리드(앞뒤 포함) 범위를 조회. 캘린더/리스트가 같은 데이터를 공유.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const end = new Date(gridStart);
      end.setDate(gridStart.getDate() + 42);
      setEvents(
        await fetchMyEvents({
          start: gridStart.toISOString(),
          end: end.toISOString(),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "일정 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [gridStart]);

  useEffect(() => {
    void load();
  }, [load]);

  // 리스트 보기는 "해당 월" 일정만 (캘린더는 앞뒤 인접일 포함).
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => dayKey(e.start).startsWith(monthPrefix))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [events, monthPrefix],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = dayKey(ev.start);
      const arr = map.get(k);
      if (arr) arr.push(ev);
      else map.set(k, [ev]);
    }
    return map;
  }, [events]);

  const todayKey = ymd(new Date());
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div>
      <PageHeader
        title="일정"
        description="로그인한 본인 계정의 일정입니다."
        action={
          <div className="flex items-center gap-2">
            {/* 보기 토글 */}
            <div className="inline-flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs ${
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> 캘린더
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs ${
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" /> 리스트
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              새로고침
            </Button>
          </div>
        }
      />

      {/* 월 이동 (캘린더·리스트 공통) */}
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="이전 달">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="다음 달">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-1 text-lg font-semibold">{monthLabel}</div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-1"
          onClick={() =>
            setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
          }
        >
          오늘
        </Button>
        {loading && (
          <Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">일정을 불러오지 못했습니다</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            실제 일정은 <strong>Calendars.Read 권한이 포함된 Entra 로그인</strong>이 필요합니다.
            (앱 등록에 Calendars.Read 위임 권한 + 동의, 이후 재로그인)
          </p>
        </div>
      ) : view === "calendar" ? (
        <CalendarGrid
          gridDays={gridDays}
          month={month.getMonth()}
          byDay={byDay}
          todayKey={todayKey}
        />
      ) : loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 일정을 불러오는 중…
        </div>
      ) : monthEvents.length === 0 ? (
        <EmptyState title={`${monthLabel} 일정이 없습니다`} />
      ) : (
        <EventList events={monthEvents} />
      )}
    </div>
  );
}

function CalendarGrid({
  gridDays,
  month,
  byDay,
  todayKey,
}: {
  gridDays: Date[];
  month: number;
  byDay: Map<string, CalendarEvent[]>;
  todayKey: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDays.map((d, i) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month;
          const isToday = key === todayKey;
          const dow = d.getDay();
          const dayEvents = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-[6.5rem] border-b border-r p-1.5 ${i % 7 === 6 ? "border-r-0" : ""} ${
                inMonth ? "" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : dow === 0
                        ? "text-red-500"
                        : dow === 6
                          ? "text-blue-500"
                          : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.webLink ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${ev.subject}${ev.isAllDay ? " (종일)" : ` ${hhmm(ev.start)}`}`}
                    className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                  >
                    {!ev.isAllDay && (
                      <span className="mr-1 tabular-nums opacity-70">
                        {hhmm(ev.start)}
                      </span>
                    )}
                    {ev.subject}
                  </a>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}건 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventList({ events }: { events: CalendarEvent[] }) {
  return (
    <ul className="space-y-2">
      {events.map((ev) => {
        const [y, m, d] = dayKey(ev.start).split("-").map(Number);
        const dow = new Date(y || 2000, (m || 1) - 1, d || 1).getDay();
        return (
          <li
            key={ev.id}
            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30"
          >
            {/* 날짜 (월은 상단 조회조건에 표기) */}
            <div className="flex w-11 shrink-0 flex-col items-center rounded-md border bg-muted/30 py-1 leading-none">
              <span
                className={`text-[11px] ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-muted-foreground"}`}
              >
                {WEEKDAYS[dow]}
              </span>
              <span className="mt-0.5 text-lg font-semibold">{d}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{ev.subject}</div>
              <div className="text-xs text-muted-foreground">
                {ev.isAllDay ? "종일" : `${hhmm(ev.start)}–${hhmm(ev.end)}`}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {ev.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {ev.location}
                  </span>
                )}
                {ev.organizer && <span>주최: {ev.organizer}</span>}
              </div>
            </div>
            {ev.webLink && (
              <a
                href={ev.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Outlook에서 열기"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
