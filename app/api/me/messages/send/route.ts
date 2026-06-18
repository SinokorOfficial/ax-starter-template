import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { sendMyMail } from "@/lib/graph";

// BFF — 본인 명의 메일 발송(위임, Mail.Send). 세션 필수.
// POST /api/me/messages/send  body: { to, cc?, subject, body, html? }
function parseAddrs(v: unknown): string[] {
  if (typeof v !== "string") return [];
  return v
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => null)) as
    | { to?: string; cc?: string; subject?: string; body?: string; html?: boolean }
    | null;
  const to = parseAddrs(b?.to);
  const cc = parseAddrs(b?.cc);
  const subject = (b?.subject ?? "").trim();
  const body = b?.body ?? "";

  if (to.length === 0)
    return NextResponse.json(
      { error: "invalid", message: "받는 사람(유효한 이메일)을 입력하세요." },
      { status: 400 },
    );
  if (!subject)
    return NextResponse.json(
      { error: "invalid", message: "제목을 입력하세요." },
      { status: 400 },
    );

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (jwt?.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "relogin_required", message: "세션이 만료됐습니다. 다시 로그인해 주세요." },
      { status: 409 },
    );
  }
  if (!jwt?.accessToken) {
    return NextResponse.json(
      {
        error: "relogin_required",
        message:
          "메일 발신 권한(Mail.Send)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
      },
      { status: 409 },
    );
  }

  try {
    await sendMyMail(jwt.accessToken, { to, cc, subject, body, html: b?.html });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "send_failed", message: e instanceof Error ? e.message : "메일 발송 실패" },
      { status: 502 },
    );
  }
}
