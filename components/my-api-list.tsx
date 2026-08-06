"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Play,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingRow, ErrorState } from "@/components/page-header";

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
interface ApiGroup {
  api: ApiRow;
  params: Record<string, unknown>;
}

// My API 목록 SP. SSO 경로라 P_UP_EMAIL 미전송 — 백엔드가 토큰의 SSO_UPN 으로 필터.
const LIST_REQUEST = {
  user_name: "API",
  package_name: "PKG_CM_API_USER",
  procedure_name: "SP_GET_API_USER_API_OBJECT_FIELD",
};

// SP 행에서 필드명/샘플값 컬럼명을 유연하게 인식.
// 필드 컬럼은 alias 에 field_ 접두가 붙음 → field_ 접두형 우선, pick 은 대소문자 무시.
const FIELD_NAME_KEYS = [
  "field_nm",
  "field_name",
  "param_nm",
  "param_name",
  "arg_nm",
  "column_nm",
];
const SAMPLE_KEYS = ["field_sample_value", "sample_value", "sample_val", "sample"];
const MAX_ROWS = 200;

function pick(row: ApiRow, keys: string[]): unknown {
  // 대소문자 무시 — alias 가 field_ 처럼 소문자/혼합이어도 매칭.
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

// (객체 × 필드) 행을 OBJECT_ID 로 묶어 고유 API + params(sample) 로 변환.
function groupRows(rows: ApiRow[]): ApiGroup[] {
  const map = new Map<string, ApiGroup>();
  for (const r of rows) {
    const id = r.OBJECT_ID ?? JSON.stringify(r);
    if (!map.has(id)) map.set(id, { api: r, params: {} });
    const g = map.get(id)!;
    const fname = pick(r, FIELD_NAME_KEYS);
    if (fname) g.params[String(fname)] = pick(r, SAMPLE_KEYS) ?? "";
  }
  return [...map.values()];
}

function fmtCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// LLM 에 그대로 붙여넣어 "이 API 를 호출하는 코드" 를 작성시킬 수 있는 명세 텍스트.
// 엔드포인트·요청 body·응답 형태까지 담아 사람보다 LLM 친화적으로.
function buildCopyText(g: ApiGroup): string {
  const r = g.api;
  const title = r.LLM_SYNONYM || r.OBJECT_NM || "";
  const desc = r.LLM_DESC || r.OBJECT_DESC || "";
  const body = {
    user_name: r.OWNER || "API",
    package_name: r.PACKAGE_NM || "",
    procedure_name: r.OBJECT_NM || "",
    params: g.params,
  };
  return [
    "[SINOKOR AX 사내 API 호출 명세]",
    `이름: ${title}`,
    desc ? `설명: ${desc}` : "",
    "호출: 브라우저에서 POST /api/internal (SSO 자동 인증, 키 불필요).",
    "주의: user_name 은 스키마 소유자(고정값)입니다 — 사용자 이메일이 아니며 그대로 두세요. 로그인 사용자 신원(oid/upn/email)은 서버가 SSO 토큰에서 자동 주입하므로 params 에 넣지 마세요.",
    "요청 body(JSON):",
    JSON.stringify(body, null, 2),
    "응답: { code, message, data } — data 는 결과 행 배열.",
    "예: const res = await fetch('/api/internal',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(BODY)}); const { data } = await res.json();",
  ]
    .filter(Boolean)
    .join("\n");
}

// API 사용법 모달 — POST /api/internal 호출법(요청 body·fetch 예제) 안내.
function MyApiUsageDialog({ group, onClose }: { group: ApiGroup; onClose: () => void }) {
  const r = group.api;
  const title = r.LLM_SYNONYM || r.OBJECT_NM || "";
  const desc = r.LLM_DESC || r.OBJECT_DESC || "";
  const path = [r.PACKAGE_NM, r.OBJECT_NM].filter(Boolean).join(".");
  const bodyJson = JSON.stringify(
    {
      user_name: r.OWNER || "API",
      package_name: r.PACKAGE_NM || "",
      procedure_name: r.OBJECT_NM || "",
      params: group.params,
    },
    null,
    2,
  );
  const fetchJs = `const res = await fetch("/api/internal", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin", // 로그인 세션(SSO) 자동 전송 — 키 불필요
  body: JSON.stringify(BODY),
});
const { data } = await res.json(); // data = 결과 행 배열`;

  const [copiedAll, setCopiedAll] = useState(false);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(group));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      /* 무시 */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title} — API 사용 방법</div>
            <code className="text-xs text-muted-foreground">POST /api/internal · {path}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-4 text-sm">
          {desc && <p className="text-muted-foreground">{desc}</p>}
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            브라우저에서 <code>POST /api/internal</code> 로 호출합니다. 로그인 세션(SSO)이 자동
            인증되어 <strong className="text-foreground">키가 필요 없습니다</strong>. 사용자
            신원(oid·upn·email)은 서버가 토큰에서 주입하니 <code>params</code> 에 넣지 마세요.
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">요청 body (JSON)</p>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
              <code>{bodyJson}</code>
            </pre>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">fetch 예제</p>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
              <code>{fetchJs}</code>
            </pre>
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2.5">
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {copiedAll ? (
              <>
                <Check className="h-3.5 w-3.5" /> 복사됨
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> LLM용 전체 복사
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export function MyApiList() {
  const t = useTranslations("myApi");
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ApiGroup[] | null>(null);
  const [q, setQ] = useState("");
  const [testGroup, setTestGroup] = useState<ApiGroup | null>(null);
  const [usageGroup, setUsageGroup] = useState<ApiGroup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyApi = async (g: ApiGroup, id: string) => {
    try {
      await navigator.clipboard.writeText(buildCopyText(g));
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* 무시 */
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGroups(null);
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
      setGroups(groupRows(Array.isArray(json.data) ? json.data : []));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("queryFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!groups) return null;
    const n = q.trim().toLowerCase();
    if (!n) return groups;
    return groups.filter((g) =>
      [
        g.api.LLM_SYNONYM,
        g.api.OBJECT_NM,
        g.api.OBJECT_DESC,
        g.api.LLM_DESC,
        g.api.PACKAGE_NM,
        g.api.OWNER,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(n),
    );
  }, [groups, q]);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("desc")}</p>

      {/* 툴바 */}
      <div className="mt-5 mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {t("account")}{" "}
          <span className="font-medium text-foreground">{email || "…"}</span>
        </span>
        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {t("ssoAuth")}
        </span>
        <Button size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("query")}
        </Button>
      </div>

      {/* 결과 */}
      {loading ? (
        <LoadingRow label={t("loading")} />
      ) : error ? (
        <ErrorState icon message={error} />
      ) : groups && groups.length > 0 ? (
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
              {visible!.length === groups.length
                ? `${groups.length}`
                : `${visible!.length} / ${groups.length}`}
            </span>
          </div>

          {visible!.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible!.map((g, i) => {
                const r = g.api;
                const id = r.OBJECT_ID || String(i);
                const objectDesc =
                  r.OBJECT_DESC || r.OBJECT_NM || t("unnamed", { n: i + 1 });
                const llmDesc = r.LLM_DESC || "";
                const llmSynonym = r.LLM_SYNONYM || "";
                const path = [r.PACKAGE_NM, r.OBJECT_NM].filter(Boolean).join(".");
                return (
                  <div
                    key={id}
                    className="flex flex-col rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-sm"
                  >
                    {/* 상단: 타입 배지 + 복사(subtle) — 식별 정보만 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                        {r.OBJECT_TP || "PROCEDURE"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyApi(g, id)}
                        title={t("copyForLlm")}
                        aria-label={t("copyForLlm")}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {copiedId === id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold" title={objectDesc}>
                      {objectDesc}
                    </h3>
                    {llmDesc && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{llmDesc}</p>
                    )}
                    {llmSynonym && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{llmSynonym}</p>
                    )}
                    {/* 메타 — mt-auto 로 카드 하단 고정(카드 간 정렬) */}
                    <div className="mt-auto pt-3 text-xs text-muted-foreground">
                      <div className="truncate border-t pt-2">
                        {t("owner")}: {r.OWNER || "—"}
                      </div>
                      {path && <code className="mt-0.5 block truncate">{path}</code>}
                    </div>
                    {/* 하단 액션 footer — 카드마다 동일 위치·스타일 */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 whitespace-nowrap"
                        onClick={() => setUsageGroup(g)}
                      >
                        <Code2 className="h-3.5 w-3.5" /> 사용법
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 whitespace-nowrap"
                        onClick={() => setTestGroup(g)}
                      >
                        <Play className="h-3.5 w-3.5" /> {t("test")}
                      </Button>
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

      {testGroup && (
        <ApiTester group={testGroup} onClose={() => setTestGroup(null)} />
      )}
      {usageGroup && (
        <MyApiUsageDialog group={usageGroup} onClose={() => setUsageGroup(null)} />
      )}
    </div>
  );
}

// ── 카드별 API 테스터(모달) — SSO 전용. params 는 sample 로 자동 채움 ──────────
function ApiTester({ group, onClose }: { group: ApiGroup; onClose: () => void }) {
  const t = useTranslations("myApi");
  const row = group.api;
  const initialBody = useMemo(
    () =>
      JSON.stringify(
        {
          user_name: row.OWNER || "API",
          package_name: row.PACKAGE_NM || "",
          procedure_name: row.OBJECT_NM || "",
          params: group.params,
        },
        null,
        2,
      ),
    [row, group.params],
  );

  const [bodyText, setBodyText] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: number; message: string; data: unknown } | null>(
    null,
  );
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const send = async () => {
    setError(null);
    setResult(null);
    setElapsed(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      setError(`${t("jsonParseError")}${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    setLoading(true);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("callFailed"));
    } finally {
      setElapsed(Math.round(performance.now() - t0));
      setLoading(false);
    }
  };

  const dataRows =
    result && Array.isArray(result.data)
      ? (result.data as Record<string, unknown>[])
      : null;
  const columns =
    dataRows && dataRows.length > 0 && typeof dataRows[0] === "object"
      ? Object.keys(dataRows[0])
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {t("testerTitle", { name: row.OBJECT_NM ?? "" })}
            </div>
            <code className="text-xs text-muted-foreground">
              {[row.PACKAGE_NM, row.OBJECT_NM].filter(Boolean).join(".")}
            </code>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Body (raw · JSON)
              <span className="ml-2 font-normal text-muted-foreground">{t("bodyHint")}</span>
            </span>
            <button
              type="button"
              onClick={() => setBodyText(initialBody)}
              className="text-xs text-primary hover:underline"
            >
              {t("restoreDefault")}
            </button>
          </div>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />

          {error ? (
            <ErrorState icon message={error} className="p-3" />
          ) : result ? (
            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {result.code === 200 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  code {result.code}
                </span>
                <span className="text-muted-foreground">{result.message}</span>
                {dataRows && (
                  <span className="text-muted-foreground">· {dataRows.length} rows</span>
                )}
                {elapsed != null && (
                  <span className="text-muted-foreground">· {elapsed} ms</span>
                )}
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  {showRaw ? t("viewTable") : t("viewRaw")}
                </button>
              </div>
              {showRaw ? (
                <pre className="max-h-72 overflow-auto p-3 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : dataRows && dataRows.length > 0 ? (
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">#</th>
                        {columns.map((c) => (
                          <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows.slice(0, MAX_ROWS).map((r2, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                          {columns.map((c) => (
                            <td key={c} className="whitespace-nowrap px-2 py-1">
                              {fmtCell(r2[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-xs text-muted-foreground">{t("emptyData")}</div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button onClick={send} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {t("send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
