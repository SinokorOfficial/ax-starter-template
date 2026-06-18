import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { listMyTeamsChats } from "@/lib/graph";

// BFF — 본인 Teams 채팅(헤더 안읽음 드롭다운). Chat.Read 위임 필요.
// 미동의(403) 시 502 + 메시지 → 헤더에서 뱃지/목록 숨김 처리.
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  try {
    const chats = await listMyTeamsChats(jwt?.accessToken);
    return NextResponse.json({ chats });
  } catch (e) {
    return NextResponse.json(
      { error: "graph_failed", message: e instanceof Error ? e.message : "Teams 조회 실패" },
      { status: 502 },
    );
  }
}
