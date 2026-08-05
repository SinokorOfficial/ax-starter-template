"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Building2, BadgeCheck, AtSign } from "lucide-react";
import { PageHeader, LoadingRow, ErrorState } from "@/components/page-header";
import { Avatar } from "@/components/avatar";

// 내 정보 — 로그인 계정 인적사항(Microsoft 365 Graph /me) + 세션/신원(토큰 제외).
interface MeProfile {
  displayName?: string | null;
  mail?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  userPrincipalName?: string | null;
}
interface SsoClaims {
  oid?: string | null;
  upn?: string | null;
  email?: string | null;
}

export default function MyProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [sso, setSso] = useState<SsoClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/profile", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ profile: MeProfile }>;
      })
      .then((d) => alive && setProfile(d.profile))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => alive && setLoading(false));
    // SSO 클레임(신원값) — 실패해도 무시(없으면 "—")
    fetch("/api/debug/sso-claims", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.claims && setSso(d.claims))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const name = profile?.displayName ?? session?.user?.name ?? session?.user?.email ?? "";
  const email = profile?.mail ?? session?.user?.email ?? "";
  const upn = profile?.userPrincipalName ?? session?.user?.email ?? "";
  const su = (session?.user ?? {}) as { id?: string; role?: string; email?: string };

  const fields = [
    { icon: Building2, label: "부서(department)", value: profile?.department },
    { icon: BadgeCheck, label: "직책(jobTitle)", value: profile?.jobTitle },
    { icon: Mail, label: "이메일(mail)", value: email },
    { icon: AtSign, label: "계정(UPN)", value: upn },
  ];

  // 세션/신원 — 토큰 원문 제외, 식별자만.
  const idRows: { label: string; value?: string | null }[] = [
    { label: "계정 ID (session.id)", value: su.id },
    { label: "역할 (role)", value: su.role },
    { label: "세션 이메일 (session.email)", value: su.email },
    { label: "oid (SSO_OID)", value: sso?.oid },
    { label: "upn (SSO_UPN)", value: sso?.upn },
    { label: "email (SSO_EMAIL)", value: sso?.email },
  ];

  return (
    <div>
      <PageHeader
        title="내 정보"
        description="로그인 계정의 인적사항입니다. Microsoft 365 디렉터리에서 조회됩니다."
      />

      {loading ? (
        <LoadingRow label="불러오는 중…" />
      ) : error ? (
        <ErrorState icon message={error} />
      ) : (
        <div className="max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
          {/* 헤더 영역 */}
          <div className="flex items-center gap-4">
            {/* 본인 프로필 사진 (Graph /me/photo) — 없으면 이니셜 폴백 */}
            <Avatar
              name={name}
              photoSrc="/api/me/photo"
              className="h-16 w-16 text-2xl font-bold"
              initialsCount={1}
              fallback="U"
            />
            <div className="leading-tight">
              <div className="text-xl font-semibold">{name || "—"}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {[profile?.department, profile?.jobTitle].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          </div>

          {/* 필드 그리드 */}
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2">
            {fields.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 leading-tight">
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium">{f.value || "—"}</dd>
                  </div>
                </div>
              );
            })}
          </dl>

          {/* 세션 / 신원 (토큰 제외) */}
          <div className="mt-4 border-t pt-4">
            <div className="text-sm font-semibold">세션 / 신원</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              로그인 세션과 SSO 토큰의 신원값입니다. (토큰 원문은 표시하지 않습니다)
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {idRows.map((r) => (
                <div key={r.label} className="min-w-0 leading-tight">
                  <dt className="text-xs text-muted-foreground">{r.label}</dt>
                  <dd className="mt-0.5 truncate font-mono text-xs">
                    {r.value ? (
                      r.value
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        (비어있음)
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
