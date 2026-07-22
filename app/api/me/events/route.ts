import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionUser } from "@/lib/session";
import { listMyEvents } from "@/lib/graph";
import { resolveMeGraphToken } from "@/lib/me-graph-token";

// BFF — 본인 일정(위임, Calendars.Read). 세션 필수, 본인 데이터.
// GET /api/me/events?start=&end=
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const auth = await resolveMeGraphToken(
    req,
    "일정 권한(Calendars.Read)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
  );
  if ("response" in auth) return auth.response;

  try {
    const sp = req.nextUrl.searchParams;
    const start = sp.get("start") ?? undefined;
    const end = sp.get("end") ?? undefined;
    const events = await listMyEvents(
      auth.accessToken,
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
