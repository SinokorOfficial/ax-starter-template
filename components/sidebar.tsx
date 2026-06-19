"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, Inbox, CalendarDays, MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* 데스크톱 */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <SidebarBody />
      </aside>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-card">
            <SidebarBody onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();

  // 스타터 기본 메뉴: 그룹(label) + 항목. 새 메뉴는 여기에 추가.
  const groups = [
    {
      label: t("nav.groupApi"),
      items: [{ href: "/my-api", label: t("nav.myApi"), icon: KeyRound }],
    },
    {
      label: t("nav.groupM365"),
      items: [
        { href: "/me/mail", label: t("nav.mail"), icon: Inbox },
        { href: "/me/calendar", label: t("nav.calendar"), icon: CalendarDays },
        { href: "/me/teams", label: t("nav.teams"), icon: MessageSquare },
      ],
    },
  ];

  // 그룹 접기/펼치기 — 기본 펼침, 브라우저(localStorage)에 저장.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const s = localStorage.getItem("sidebar.groups");
      if (s) setOpen(JSON.parse(s));
    } catch {
      /* 무시 */
    }
  }, []);
  const isOpen = (label: string) => open[label] !== false;
  const toggle = (label: string) =>
    setOpen((prev) => {
      const next = { ...prev, [label]: prev[label] === false };
      try {
        localStorage.setItem("sidebar.groups", JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* 로고 */}
      <Link
        href="/my-api"
        onClick={onNavigate}
        className="flex h-16 items-center gap-2 border-b px-6 transition-colors hover:bg-accent/40"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          AX
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t("app.title")}</div>
          <div className="text-xs text-muted-foreground">{t("app.subtitle")}</div>
        </div>
      </Link>

      {/* 네비 */}
      <nav className="flex-1 space-y-4 p-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(group.label)}
              aria-expanded={isOpen(group.label)}
              className="flex w-full items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isOpen(group.label) ? "" : "-rotate-90",
                )}
              />
            </button>
            {isOpen(group.label) &&
              group.items.map((it) => {
                const active = pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      {/* 푸터 */}
      <div className="mt-auto border-t px-6 py-4 leading-tight">
        <div className="text-xs font-semibold text-foreground">SINOKOR AX</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {t("footer.copyright")}
        </div>
      </div>
    </div>
  );
}
