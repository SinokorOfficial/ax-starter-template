// 본인(delegated) Graph BFF 라우트 공용 — 사용자 Graph 위임 토큰 해석.
// 여러 /api/me/* 라우트가 공유하던 동일한 토큰/갱신실패/409 보일러플레이트를 한 곳으로.
// 서버 전용.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type MeGraphTokenResult =
  | { accessToken: string }
  | { response: NextResponse };

/**
 * 로그인 사용자의 Graph 위임 액세스 토큰을 해석한다.
 * - 성공: { accessToken } (호출부는 그대로 graph 함수에 전달)
 * - 실패(토큰 없음/갱신 실패): { response } (409) — 호출부에서 그대로 반환.
 *
 * @param missingTokenMessage 토큰이 없을 때 안내 메시지(라우트별 스코프 문구 유지).
 */
export async function resolveMeGraphToken(
  req: NextRequest,
  missingTokenMessage: string,
): Promise<MeGraphTokenResult> {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 위임 토큰이 없거나 갱신 실패 → 재로그인(재동의) 필요.
  if (jwt?.error === "RefreshAccessTokenError") {
    return {
      response: NextResponse.json(
        { error: "relogin_required", message: "세션이 만료됐습니다. 다시 로그인해 주세요." },
        { status: 409 },
      ),
    };
  }
  if (!jwt?.accessToken) {
    return {
      response: NextResponse.json(
        { error: "relogin_required", message: missingTokenMessage },
        { status: 409 },
      ),
    };
  }

  return { accessToken: jwt.accessToken };
}
