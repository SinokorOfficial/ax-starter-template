"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Menu,
  Search,
  MessageSquare,
  LayoutGrid,
  LogOut,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { MeProfile, TeamsChat } from "@/lib/graph";

// 상대 시간 (방금 / N분 전 / N시간 전 / N일 전)
function relTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// Teams 안읽음 채팅 — 아이콘 + 뱃지, 클릭 시 드롭다운(최대 10). Chat.Read 필요.
function TeamsChatMenu() {
  const t = useTranslations("header");
  const [chats, setChats] = useState<TeamsChat[]>([]);

  useEffect(() => {
    fetch("/api/me/teams-chats", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.chats && setChats(d.chats))
      .catch(() => {});
  }, []);

  const unread = chats.filter((c) => c.unread).length;
  const iconBtnRel =
    "relative flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <Dropdown
      align="end"
      buttonClassName={iconBtnRel}
      panelClassName="w-80 max-h-96 overflow-auto"
      trigger={
        <>
          <MessageSquare className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread}
            </span>
          )}
        </>
      }
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        {t("teamsTitle")} · {t("unread")} {unread}
      </div>
      {chats.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">{t("teamsEmpty")}</div>
      ) : (
        chats.slice(0, 10).map((c) => (
          <a
            key={c.id}
            href={c.webUrl ?? "https://teams.microsoft.com"}
            target="_blank"
            rel="noreferrer"
            className="flex gap-2 rounded-sm px-3 py-2 hover:bg-accent"
          >
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                c.unread ? "bg-blue-500" : "border border-muted",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {c.topic || c.fromName}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {relTime(c.lastMessageAt)}
                </span>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {c.fromName}: {c.preview}
              </div>
            </div>
          </a>
        ))
      )}
    </Dropdown>
  );
}

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground";
const menuItem =
  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent";

// 앱 런처(9-dot) — M365 E3 앱 + AI + Developer. 클릭 시 새 창. (ax-portal과 동일)
interface LaunchApp {
  name: string;
  url: string;
  /** 아이콘 이미지 URL (로드 실패 시 색상 타일로 폴백) */
  icon: string;
  /** 폴백 타일 배경색 */
  color: string;
  /** 폴백 타일에 표시할 글자(1~2자) */
  abbr: string;
}

// Microsoft 공식 브랜드 아이콘 CDN (Fabric/Office) — 수년째 안정적인 정적 경로.
const FAB =
  "https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/svg";
const fab = (slug: string) => `${FAB}/${slug}_48x1.svg`;
// 서비스 파비콘 (Google s2) — 항상 실제 브랜드 아이콘 반환.
const fav = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

// 사내 서비스 — 사내망 도메인은 구글 파비콘 서비스가 접근 못하므로 사이트 아이콘을 직접 로드.
const SINOKOR_APPS: LaunchApp[] = [
  {
    name: "G/W",
    url: "https://skrgw.sinokor.co.kr/",
    icon: "https://skrgw.sinokor.co.kr/ekp/service/file/fileView?fileUrl=/CSNKO/favicon/2023/01/12&fileName=8c5decaa-44cd-41d1-9c98-283705e7290e",
    color: "#C8102E",
    abbr: "GW",
  },
  {
    name: "AI Portal",
    url: "https://aiportal.sinokor.co.kr/",
    icon: "https://aiportal.sinokor.co.kr/icon.svg",
    color: "#2563EB",
    abbr: "AX",
  },
];

const M365_APPS: LaunchApp[] = [
  { name: "Outlook", url: "https://outlook.office.com/mail", icon: fab("outlook"), color: "#0F6CBD", abbr: "O" },
  { name: "Teams", url: "https://teams.microsoft.com", icon: fab("teams"), color: "#5059C9", abbr: "T" },
  { name: "Loop", url: "https://loop.cloud.microsoft", icon: fav("loop.microsoft.com"), color: "#5B57C2", abbr: "Lo" },
  { name: "Microsoft 365", url: "https://m365.cloud.microsoft", icon: fab("office"), color: "#D83B01", abbr: "M" },
  { name: "OneDrive", url: "https://www.office.com/launch/onedrive", icon: fab("onedrive"), color: "#0364B8", abbr: "OD" },
  { name: "Word", url: "https://www.office.com/launch/word", icon: fab("word"), color: "#185ABD", abbr: "W" },
  { name: "Excel", url: "https://www.office.com/launch/excel", icon: fab("excel"), color: "#107C41", abbr: "X" },
  { name: "PowerPoint", url: "https://www.office.com/launch/powerpoint", icon: fab("powerpoint"), color: "#C43E1C", abbr: "P" },
  { name: "OneNote", url: "https://www.office.com/launch/onenote", icon: fab("onenote"), color: "#7719AA", abbr: "N" },
  { name: "SharePoint", url: "https://www.office.com/launch/sharepoint", icon: fab("sharepoint"), color: "#038387", abbr: "S" },
];

const AI_APPS: LaunchApp[] = [
  { name: "ChatGPT", url: "https://chat.openai.com", icon: fav("openai.com"), color: "#10A37F", abbr: "G" },
  { name: "Claude", url: "https://claude.ai", icon: fav("claude.ai"), color: "#D97757", abbr: "C" },
];

const DEV_APPS: LaunchApp[] = [
  { name: "GitHub", url: "https://github.com/SinokorOfficial", icon: fav("github.com"), color: "#181717", abbr: "GH" },
  { name: "Graph", url: "https://developer.microsoft.com/en-us/graph/graph-explorer", icon: fav("developer.microsoft.com"), color: "#0F6CBD", abbr: "G" },
  // UI 개발 참고 — 현재 컴포넌트 스택(shadcn/ui · lucide · Tailwind · Radix)
  { name: "shadcn/ui", url: "https://ui.shadcn.com/docs/components", icon: fav("ui.shadcn.com"), color: "#000000", abbr: "sh" },
  { name: "Lucide", url: "https://lucide.dev/icons", icon: fav("lucide.dev"), color: "#F56565", abbr: "Lu" },
  { name: "Tailwind", url: "https://tailwindcss.com/docs", icon: fav("tailwindcss.com"), color: "#06B6D4", abbr: "TW" },
  { name: "Radix UI", url: "https://www.radix-ui.com/primitives", icon: fav("radix-ui.com"), color: "#6E56CF", abbr: "Rx" },
];

function AppTile({ app }: { app: LaunchApp }) {
  const [imgError, setImgError] = useState(false);
  const showImg = Boolean(app.icon) && !imgError;
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 rounded-md p-1.5 text-center outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      title={app.name}
    >
      {!showImg ? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded text-xs font-semibold text-white"
          style={{ backgroundColor: app.color }}
        >
          {app.abbr}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          className="h-7 w-7 object-contain"
          onError={() => setImgError(true)}
        />
      )}
      <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">
        {app.name}
      </span>
    </a>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations("header");
  const tr = useTranslations("roles");
  const { data: session } = useSession();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState(false);
  const [copied, setCopied] = useState(false);

  const role = session?.user?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setProfile(d.profile))
      .catch(() => {});
  }, []);

  // 내 공인 IP — APIM/ACA IP 차단 대상. 관리자에게만 표시.
  useEffect(() => {
    if (!isAdmin) return;
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((j: { ip?: string }) => setIp(j.ip ?? null))
      .catch(() => setIpError(true));
  }, [isAdmin]);

  const copyIp = () => {
    if (!ip) return;
    navigator.clipboard?.writeText(ip).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  const name = profile?.displayName ?? session?.user?.name ?? session?.user?.email ?? "";
  const email = profile?.mail ?? profile?.userPrincipalName ?? session?.user?.email ?? "";
  const deptTitle = [profile?.department, profile?.jobTitle].filter(Boolean).join(" · ");
  const roleLabel = role ? tr(role) : "";

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4">
      <button onClick={onMenu} className={cn(iconBtn, "md:hidden")} aria-label="menu">
        <Menu className="h-4 w-4" />
      </button>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("search")} className="pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Teams 안읽음 채팅 */}
        <TeamsChatMenu />

        {/* 다크모드 */}
        <ThemeToggle />

        {/* 앱 런처 (9-dot) — M365 · AI · Developer (ax-portal과 동일) */}
        <Dropdown
          align="end"
          buttonClassName={iconBtn}
          panelClassName="w-64 max-h-[80vh] overflow-y-auto p-2"
          trigger={<LayoutGrid className="h-4 w-4" />}
        >
          <div className="px-1 py-1 text-sm font-medium">SINOKOR</div>
          <div className="grid grid-cols-4 gap-0.5">
            {SINOKOR_APPS.map((a) => (
              <AppTile key={a.name} app={a} />
            ))}
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="px-1 py-1 text-sm font-medium">Microsoft 365</div>
          <div className="grid grid-cols-4 gap-0.5">
            {M365_APPS.map((a) => (
              <AppTile key={a.name} app={a} />
            ))}
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="px-1 py-1 text-sm font-medium">AI</div>
          <div className="grid grid-cols-4 gap-0.5">
            {AI_APPS.map((a) => (
              <AppTile key={a.name} app={a} />
            ))}
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="px-1 py-1 text-sm font-medium">Developer</div>
          <div className="grid grid-cols-4 gap-0.5">
            {DEV_APPS.map((a) => (
              <AppTile key={a.name} app={a} />
            ))}
          </div>
        </Dropdown>

        {/* 언어 전환 */}
        <LanguageSwitcher />

        {/* 프로필 */}
        <Dropdown
          align="end"
          buttonClassName="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent"
          trigger={
            <>
              <Avatar
                name={name}
                className="h-8 w-8 text-sm font-semibold"
                initialsCount={1}
                fallback="U"
              />
              <span className="hidden text-sm font-medium sm:block">{name}</span>
            </>
          }
        >
          <div className="px-3 py-2 leading-tight">
            <div className="text-sm font-medium">{name}</div>
            {deptTitle && <div className="text-xs text-muted-foreground">{deptTitle}</div>}
            {email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
            {roleLabel && (
              <div className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {roleLabel}
              </div>
            )}
          </div>

          {/* 공인 IP (관리자) */}
          {isAdmin && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={copyIp}
                title={t("copyIp")}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs hover:bg-accent"
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 text-left leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("publicIp")}
                  </div>
                  <div className="font-mono">
                    {ip ?? (ipError ? t("ipError") : t("ipChecking"))}
                  </div>
                </div>
                {ip &&
                  (copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  ))}
              </button>
            </>
          )}

          <div className="my-1 h-px bg-border" />
          <button onClick={() => signOut()} className={cn(menuItem, "text-destructive")}>
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
