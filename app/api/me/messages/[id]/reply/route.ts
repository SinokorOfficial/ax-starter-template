import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { replyToMessage } from "@/lib/graph";

// BFF — 본인 메일 회신(위임, Mail.Send). 세션 필수.
// POST /api/me/messages/:id/reply  body: { comment, replyAll? }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => null)) as
    | { comment?: string; replyAll?: boolean }
    | null;

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
    await replyToMessage(jwt.accessToken, params.id, b?.comment ?? "", b?.replyAll);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "reply_failed", message: e instanceof Error ? e.message : "회신 실패" },
      { status: 502 },
    );
  }
}
