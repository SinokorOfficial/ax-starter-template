"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Paperclip,
  PenSquare,
  Send,
  X,
  CheckCircle2,
  Reply,
  ReplyAll,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, EmptyState } from "@/components/page-header";
import {
  fetchMyMessages,
  fetchMessage,
  sendMail,
  replyMail,
} from "@/lib/portal-client";
import { cn } from "@/lib/utils";
import type { MailMessage, MailDetail } from "@/lib/types";

const fmt = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 메일 본문을 격리된(스크립트 차단) iframe srcDoc 으로 렌더 — XSS/스타일 누수 방지.
function buildSrcDoc(detail: MailDetail): string {
  const content =
    detail.bodyType === "html"
      ? detail.body
      : `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0">${escapeHtml(detail.body)}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<style>
  html,body{margin:0;padding:16px;background:#fff;color:#1f2937;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
    font-size:14px;line-height:1.6;word-break:break-word;overflow-wrap:anywhere;}
  img{max-width:100%;height:auto;} table{max-width:100%;}
  a{color:#2563eb;}
</style></head><body>${content}</body></html>`;
}

export default function MyMailPage() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // 로컬 읽음 표시(Mail.Read 권한만 → 서버 PATCH 불가, UI 상으로만 읽음 처리)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setMessages(await fetchMyMessages());
    } catch (e) {
      setError(e instanceof Error ? e.message : "메일 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const select = async (m: MailMessage) => {
    setSelectedId(m.id);
    setReadIds((prev) => new Set(prev).add(m.id));
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchMessage(m.id));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "본문을 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const srcDoc = useMemo(
    () => (detail ? buildSrcDoc(detail) : ""),
    [detail],
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="메일"
        description="로그인한 본인 계정의 Outlook 받은 메일입니다."
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <PenSquare className="h-4 w-4" />새 메일
            </Button>
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

      {composeOpen && <Compose onClose={() => setComposeOpen(false)} />}
      {replyMode && detail && (
        <ReplyModal
          detail={detail}
          replyAll={replyMode === "replyAll"}
          onClose={() => setReplyMode(null)}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 메일을 불러오는 중…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">메일을 불러오지 못했습니다</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            실제 메일은 <strong>Mail.Read 권한이 포함된 Entra 로그인</strong>이 필요합니다.
            (앱 등록에 Mail.Read 위임 권한 + 동의, 이후 재로그인)
          </p>
        </div>
      ) : messages.length === 0 ? (
        <EmptyState title="받은 메일이 없습니다" />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
          {/* ── 좌측: 목록 ── */}
          <ul
            className={cn(
              "w-full divide-y overflow-y-auto md:w-[380px] md:shrink-0 md:border-r",
              selectedId && "hidden md:block",
            )}
          >
            {messages.map((m) => {
              const isRead = m.isRead || readIds.has(m.id);
              const active = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => void select(m)}
                    className={cn(
                      "flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40",
                      active && "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        isRead ? "bg-transparent" : "bg-primary",
                      )}
                      aria-label={isRead ? "읽음" : "안읽음"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            !isRead && "font-semibold",
                          )}
                        >
                          {m.fromName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fmt(m.receivedAt)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "truncate text-sm",
                          isRead ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {m.subject}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.preview}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ── 우측: 본문 ── */}
          <div
            className={cn(
              "min-w-0 flex-1 flex-col",
              selectedId ? "flex" : "hidden md:flex",
            )}
          >
            {!selectedId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-8 w-8 opacity-40" />
                읽을 메일을 선택하세요.
              </div>
            ) : detailLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 본문을 불러오는 중…
              </div>
            ) : detailError ? (
              <div className="p-6 text-sm">
                <p className="font-medium text-destructive">
                  본문을 불러오지 못했습니다
                </p>
                <p className="mt-1 text-muted-foreground">{detailError}</p>
              </div>
            ) : detail ? (
              <>
                {/* 본문 헤더 */}
                <div className="shrink-0 border-b p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold leading-snug">
                      {detail.subject}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1">
                      {detail.hasAttachments && (
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      )}
                      {detail.webLink && (
                        <a
                          href={detail.webLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Outlook에서 열기"
                          title="Outlook에서 열기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {/* 모바일: 목록으로 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSelectedId(null)}
                        aria-label="목록으로"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {detail.fromName}
                    {detail.fromAddress && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        &lt;{detail.fromAddress}&gt;
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {fmt(detail.receivedAt)}
                  </div>
                  {detail.toRecipients.length > 0 && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      받는 사람: {detail.toRecipients.join(", ")}
                    </div>
                  )}
                  {detail.ccRecipients.length > 0 && (
                    <div className="truncate text-xs text-muted-foreground">
                      참조: {detail.ccRecipients.join(", ")}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setReplyMode("reply")}>
                      <Reply className="h-4 w-4" />회신
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyMode("replyAll")}
                    >
                      <ReplyAll className="h-4 w-4" />전체 회신
                    </Button>
                  </div>
                </div>
                {/* 본문 (격리 iframe) */}
                <iframe
                  title="메일 본문"
                  className="min-h-0 w-full flex-1 bg-white"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={srcDoc}
                />
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 새 메일 작성(Compose) 모달 ──────────────────────────────────────────────
function Compose({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    setError(null);
    if (!to.trim()) return setError("받는 사람을 입력하세요.");
    if (!subject.trim()) return setError("제목을 입력하세요.");
    setSending(true);
    try {
      await sendMail({ to, cc, subject, body });
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PenSquare className="h-4 w-4" /> 새 메일
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-2 p-10 text-sm">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            메일을 보냈습니다.
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-auto p-4">
            <div className="space-y-1">
              <Label htmlFor="to">받는 사람 *</Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="user@sinokor.co.kr (여러 명은 , 로 구분)"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cc">참조 (CC)</Label>
              <Input
                id="cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="(선택) 참조 받을 이메일"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject">제목 *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mbody">본문</Label>
              <Textarea
                id="mbody"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="내용을 입력하세요."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!sent && (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              취소
            </Button>
            <Button onClick={onSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              보내기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 회신 모달 ────────────────────────────────────────────────────────────────
function ReplyModal({
  detail,
  replyAll,
  onClose,
}: {
  detail: MailDetail;
  replyAll: boolean;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    setError(null);
    setSending(true);
    try {
      await replyMail(detail.id, { comment, replyAll });
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "회신 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {replyAll ? (
              <ReplyAll className="h-4 w-4" />
            ) : (
              <Reply className="h-4 w-4" />
            )}
            {replyAll ? "전체 회신" : "회신"}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-2 p-10 text-sm">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            회신을 보냈습니다.
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-auto p-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="truncate">
                받는 사람{" "}
                <span className="text-foreground">
                  {detail.fromName}
                  {detail.fromAddress && ` <${detail.fromAddress}>`}
                </span>
                {replyAll && detail.toRecipients.length > 0 && (
                  <> · 외 {detail.toRecipients.length}명</>
                )}
              </div>
              <div className="mt-0.5 truncate">제목 RE: {detail.subject}</div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reply-body">내용</Label>
              <Textarea
                id="reply-body"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={9}
                placeholder="회신 내용을 입력하세요. (아래에 원문이 인용되어 함께 전송됩니다)"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!sent && (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              취소
            </Button>
            <Button onClick={onSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              보내기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
