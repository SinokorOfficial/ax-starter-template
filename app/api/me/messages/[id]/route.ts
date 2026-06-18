import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { getMyMessage } from "@/lib/graph";

// BFF — 본인 메일 단건 본문(위임, Mail.Read). 세션 필수.
// GET /api/me/messages/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const message = await getMyMessage(params.id, jwt.accessToken);
    return NextResponse.json({ message });
  } catch (e) {
    return NextResponse.json(
      { error: "graph_failed", message: e instanceof Error ? e.message : "메일 조회 실패" },
      { status: 502 },
    );
  }
}
