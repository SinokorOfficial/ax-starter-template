"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { RecipientPicker, type Recipient } from "@/components/recipient-picker";
import { sendTeamsNotify } from "@/lib/portal-client";

export default function TeamsNotifyPage() {
  const [to, setTo] = useState<Recipient[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sent: string[];
    failed: { to: string; error?: string }[];
  } | null>(null);

  const onSend = async () => {
    setError(null);
    setResult(null);
    if (!to.length) return setError("받는 사람(직원)을 선택하세요.");
    if (!text.trim()) return setError("메시지 내용을 입력하세요.");
    setSending(true);
    try {
      const r = await sendTeamsNotify({ to: to.map((r) => r.email).join(","), text });
      setResult({ sent: r.sent ?? [], failed: r.failed ?? [] });
      if ((r.sent?.length ?? 0) > 0) setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="팀즈 알림"
        description="직원에게 Teams 1:1 메시지로 알림을 보냅니다. (보낸사람: 본인)"
      />

      <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
        <div className="space-y-1">
          <Label htmlFor="to">받는 사람 *</Label>
          <RecipientPicker
            id="to"
            value={to}
            onChange={setTo}
            placeholder="이름 또는 이메일로 검색"
            usersOnly
          />
          <p className="text-xs text-muted-foreground">
            이름으로 검색해 선택. 본인은 자동 제외됩니다.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="msg">내용 *</Label>
          <Textarea
            id="msg"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="보낼 알림 내용을 입력하세요."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
            {result.sent.length > 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                발송 완료: {result.sent.join(", ")}
              </div>
            )}
            {result.failed.length > 0 && (
              <div className="text-destructive">
                {result.failed.map((f) => (
                  <div key={f.to} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      실패: {f.to}
                      {f.error ? ` — ${f.error}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            보내기
          </Button>
        </div>
      </div>

      <div className="mt-4 flex max-w-xl items-start gap-2 rounded-md border border-l-[3px] border-l-primary bg-muted/20 p-3 text-xs text-muted-foreground">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          받는 사람의 Teams에 1:1 메시지로 도착하며, Teams 기본 알림(데스크톱·모바일)이
          함께 표시됩니다. 권한: Chat.Create · ChatMessage.Send (위임).
        </span>
      </div>
    </div>
  );
}
