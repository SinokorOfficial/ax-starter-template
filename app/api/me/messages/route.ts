import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { listMyMessages } from "@/lib/graph";

// BFF — 본인 Outlook 받은 메일(위임, Mail.Read). 세션 필수, 본인 데이터.
// 사용자 Graph 토큰은 서버 JWT에서만 읽고 브라우저에 노출하지 않는다.
// GET /api/me/messages
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
          "메일 권한(Mail.Read)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
      },
      { status: 409 },
    );
  }

  try {
    const messages = await listMyMessages(jwt.accessToken, 20);
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json(
      { error: "graph_failed", message: e instanceof Error ? e.message : "메일 조회 실패" },
      { status: 502 },
    );
  }
}
