import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionUser } from "@/lib/session";
import { listMailFolders, listChildFolders } from "@/lib/graph";
import { resolveMeGraphToken } from "@/lib/me-graph-token";

// BFF — 본인 Outlook 메일 폴더 트리(위임, Mail.Read). 세션 필수, 본인 데이터.
// 사용자 Graph 토큰은 서버 JWT에서만 읽고 브라우저에 노출하지 않는다.
// GET /api/me/mailFolders            → 최상위 트리(+1단계)
// GET /api/me/mailFolders?parentId=  → 특정 폴더의 하위 폴더(펼칠 때 lazy 로드)
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parentId = req.nextUrl.searchParams.get("parentId");

  const auth = await resolveMeGraphToken(
    req,
    "메일 권한(Mail.Read)이 포함된 Entra 로그인이 필요합니다. 로그아웃 후 다시 로그인해 주세요.",
  );
  if ("response" in auth) return auth.response;
  const { accessToken } = auth;

  try {
    const folders = parentId
      ? await listChildFolders(parentId, accessToken)
      : await listMailFolders(accessToken);
    return NextResponse.json({ folders });
  } catch (e) {
    return NextResponse.json(
      { error: "graph_failed", message: e instanceof Error ? e.message : "폴더 조회 실패" },
      { status: 502 },
    );
  }
}
