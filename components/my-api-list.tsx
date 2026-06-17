"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Search, AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ApiRow {
  OBJECT_ID?: string;
  OBJECT_TP?: string;
  OWNER?: string;
  PACKAGE_NM?: string;
  OBJECT_NM?: string;
  OBJECT_DESC?: string;
  LLM_SYNONYM?: string;
  LLM_DESC?: string;
  [k: string]: unknown;
}

// My API 목록 SP. SSO 경로라 P_UP_EMAIL 미전송 — 백엔드가 토큰의 SSO_UPN 으로 필터.
const LIST_REQUEST = {
  user_name: "API",
  package_name: "PKG_CM_API_USER",
  procedure_name: "SP_GET_API_USER_API_OBJECT_FIELD",
};

// SP 는 (객체 × 필드) 단위로 행을 주므로 OBJECT_ID 로 묶어 고유 API 만 추린다.
function groupRows(rows: ApiRow[]): ApiRow[] {
  const map = new Map<string, ApiRow>();
  for (const r of rows) {
    const id = r.OBJECT_ID ?? JSON.stringify(r);
    if (!map.has(id)) map.set(id, r);
  }
  return [...map.values()];
}

export function MyApiList() {
  const t = useTranslations("myApi");
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiRow[] | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      const res = await fetch("/api/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...LIST_REQUEST, params: {} }),
      });
      if (!res.ok) {
        const tx = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${tx ? `: ${tx.slice(0, 150)}` : ""}`);
      }
      const json = (await res.json()) as { data?: ApiRow[] };
      setRows(groupRows(Array.isArray(json.data) ? json.data : []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!rows) return null;
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      [r.LLM_SYNONYM, r.OBJECT_NM, r.OBJECT_DESC, r.LLM_DESC, r.PACKAGE_NM, r.OWNER]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(n),
    );
  }, [rows, q]);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("desc")}</p>

      {/* 툴바 */}
      <div className="mt-5 mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {t("account")} <span className="font-medium text-foreground">{email || "…"}</span>
        </span>
        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {t("ssoAuth")}
        </span>
        <Button size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("query")}
        </Button>
      </div>

      {/* 결과 */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : rows && rows.length > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search")}
                className="pl-8 pr-8"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {visible!.length === rows.length
                ? `${rows.length}`
                : `${visible!.length} / ${rows.length}`}
            </span>
          </div>

          {visible!.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible!.map((r, i) => {
                const title = r.LLM_SYNONYM || r.OBJECT_NM || `(이름 없음 ${i + 1})`;
                const path = [r.PACKAGE_NM, r.OBJECT_NM].filter(Boolean).join(".");
                const desc = r.LLM_DESC || r.OBJECT_DESC || "—";
                return (
                  <div
                    key={r.OBJECT_ID || i}
                    className="flex flex-col rounded-lg border bg-card p-4 text-card-foreground"
                  >
                    <span className="self-start rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                      {r.OBJECT_TP || "PROCEDURE"}
                    </span>
                    <h3 className="mt-3 text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                    <div className="mt-auto pt-3 text-xs text-muted-foreground">
                      소유자: {r.OWNER || "—"}
                      {path && <code className="mt-1 block truncate">{path}</code>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noResult")}
            </p>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
