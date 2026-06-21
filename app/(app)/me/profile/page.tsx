"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, Mail, Building2, BadgeCheck, AtSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";

// 내 정보 — 로그인 계정 인적사항(Microsoft 365 Graph /me). 헤더와 동일 BFF(/api/me/profile).
interface MeProfile {
  displayName?: string | null;
  mail?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  userPrincipalName?: string | null;
}

export default function MyProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<MeProfile | null>(null);
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
    return () => {
      alive = false;
    };
  }, []);

  const name = profile?.displayName ?? session?.user?.name ?? session?.user?.email ?? "";
  const email = profile?.mail ?? session?.user?.email ?? "";
  const upn = profile?.userPrincipalName ?? session?.user?.email ?? "";
  const initial = name.charAt(0).toUpperCase() || "U";

  const fields = [
    { icon: Building2, label: "부서", value: profile?.department },
    { icon: BadgeCheck, label: "직책", value: profile?.jobTitle },
    { icon: Mail, label: "이메일", value: email },
    { icon: AtSign, label: "계정(UPN)", value: upn },
  ];

  return (
    <div>
      <PageHeader
        title="내 정보"
        description="로그인 계정의 인적사항입니다. Microsoft 365 디렉터리에서 조회됩니다."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
          {/* 헤더 영역 */}
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {initial}
            </span>
            <div className="leading-tight">
              <div className="text-xl font-semibold">{name || "—"}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {[profile?.department, profile?.jobTitle].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          </div>

          {/* 필드 그리드 */}
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-6 sm:grid-cols-2">
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
        </div>
      )}
    </div>
  );
}
