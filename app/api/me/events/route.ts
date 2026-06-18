import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { listMyEvents } from "@/lib/graph";

// BFF — 본인 일정(위임, Calendars.Read). 세션 필수, 본인 데이터.
// GET /api/me/events?start=&end=
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
          "일정 권한(Calendars.Read)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
      },
      { status: 409 },
    );
  }

  try {
    const sp = req.nextUrl.searchParams;
    const start = sp.get("start") ?? undefined;
    const end = sp.get("end") ?? undefined;
    const events = await listMyEvents(
      jwt.accessToken,
      start && end ? { start, end } : { days: 30 },
    );
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json(
      { error: "graph_failed", message: e instanceof Error ? e.message : "일정 조회 실패" },
      { status: 502 },
    );
  }
}
