import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionUser } from "@/lib/session";
import { sendTeamsMessage } from "@/lib/graph";
import { resolveMeGraphToken } from "@/lib/me-graph-token";

// BFF — 로그인 사용자 명의로 직원(들)에게 Teams 1:1 메시지(알림) 발송.
// 위임 권한 Chat.Create + ChatMessage.Send 필요. 세션 필수.
// POST /api/me/teams-message  body: { to, text, html? }  (to 는 쉼표/세미콜론/공백으로 여러 명)
function parseAddrs(v: unknown): string[] {
  if (typeof v !== "string") return [];
  return Array.from(
    new Set(
      v
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes("@")),
    ),
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const myEmail = (user.email ?? "").toLowerCase();
  const b = (await req.json().catch(() => null)) as
    | { to?: string; text?: string; html?: boolean }
    | null;
  const text = b?.text ?? "";
  // 받는 사람 — 여러 명 지원. 본인은 (1:1 자기채팅 불가) 자동 제외.
  const recipients = parseAddrs(b?.to).filter((a) => a !== myEmail);

  if (recipients.length === 0)
    return NextResponse.json(
      { error: "invalid", message: "받는 사람 이메일(UPN)을 입력하세요. (본인 제외, 다른 직원)" },
      { status: 400 },
    );
  if (!text.trim())
    return NextResponse.json(
      { error: "invalid", message: "메시지 내용을 입력하세요." },
      { status: 400 },
    );

  const auth = await resolveMeGraphToken(
    req,
    "Teams 발송 권한(Chat.Create·ChatMessage.Send)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
  );
  if ("response" in auth) return auth.response;
  const { accessToken } = auth;
  const fromUpn = myEmail;

  // 각 수신자에게 개별 발송. 일부 실패해도 나머지는 진행하고 결과를 모아 반환.
  const results = await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendTeamsMessage(accessToken, fromUpn, to, text, b?.html);
        return { to, ok: true as const };
      } catch (e) {
        return { to, ok: false as const, error: e instanceof Error ? e.message : "발송 실패" };
      }
    }),
  );

  const sent = results.filter((r) => r.ok).map((r) => r.to);
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    { ok: failed.length === 0, sent, failed },
    { status: failed.length > 0 && sent.length === 0 ? 502 : 200 },
  );
}
