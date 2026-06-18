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
import { cn } from "@/lib/utils";
import type { MeProfile } from "@/lib/graph";

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground";
const menuItem =
  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent";

// Microsoft 365 런처 (스타터 기본 링크)
const M365_LINKS = [
  { label: "Outlook", href: "https://outlook.office.com" },
  { label: "Teams", href: "https://teams.microsoft.com" },
  { label: "SharePoint", href: "https://www.office.com/launch/sharepoint" },
  { label: "OneDrive", href: "https://www.office.com/launch/onedrive" },
  { label: "Office Home", href: "https://www.office.com" },
];

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
  const initial = name.charAt(0).toUpperCase() || "U";

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
        {/* Teams */}
        <a
          href="https://teams.microsoft.com"
          target="_blank"
          rel="noreferrer"
          className={iconBtn}
          title={t("teams")}
        >
          <MessageSquare className="h-4 w-4" />
        </a>

        {/* 다크모드 */}
        <ThemeToggle />

        {/* Microsoft 365 런처 */}
        <Dropdown align="end" buttonClassName={iconBtn} trigger={<LayoutGrid className="h-4 w-4" />}>
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {t("m365")}
          </div>
          {M365_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={menuItem}>
              {l.label}
            </a>
          ))}
        </Dropdown>

        {/* 언어 전환 */}
        <LanguageSwitcher />

        {/* 프로필 */}
        <Dropdown
          align="end"
          buttonClassName="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent"
          trigger={
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </span>
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
