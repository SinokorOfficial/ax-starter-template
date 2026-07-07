import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { searchDirectoryUsers } from "@/lib/graph";

// BFF — 메일·Teams 수신자 검색(위임 Graph, User.ReadBasic.All). 로그인 사용자면 누구나.
// GET /api/directory/people?q=검색어  (2글자 이상)
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ recipients: [] });

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (jwt?.error === "RefreshAccessTokenError" || !jwt?.accessToken) {
    return NextResponse.json(
      { error: "relogin_required", message: "세션이 만료됐습니다. 다시 로그인해 주세요." },
      { status: 409 },
    );
  }

  try {
    const people = await searchDirectoryUsers(jwt.accessToken, q);
    return NextResponse.json({
      recipients: people.map((p) => ({ kind: "user" as const, ...p, groupType: null })),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "directory_unavailable",
        message: e instanceof Error ? e.message : "디렉터리 조회 실패",
      },
      { status: 502 },
    );
  }
}
