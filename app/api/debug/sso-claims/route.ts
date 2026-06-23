import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { getApimAccessToken } from "@/lib/apim";

// 디버그 — 백엔드가 받는 APIM access token 의 사용자 클레임을 보여준다.
// 토큰 원문은 반환하지 않고, 신원 클레임만 추출. (본인 것만)
// GET /api/debug/sso-claims
function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1] ?? "";
  const json = Buffer.from(part, "base64url").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const refreshToken = jwt?.refreshToken;
  if (jwt?.error === "RefreshAccessTokenError" || !refreshToken) {
    return NextResponse.json(
      { error: "relogin_required", message: "세션이 만료됐습니다. 다시 로그인해 주세요." },
      { status: 409 },
    );
  }

  try {
    const token = await getApimAccessToken(refreshToken);
    const c = decodeJwtPayload(token);
    const val = (k: string) => (c[k] == null ? null : c[k]);

    // 토큰에 실제로 들어있는 신원 클레임
    const claims = {
      oid: val("oid"),
      upn: val("upn"),
      unique_name: val("unique_name"),
      email: val("email"),
      preferred_username: val("preferred_username"),
      name: val("name"),
      ver: val("ver"),
      iss: val("iss"),
      aud: val("aud"),
      scp: val("scp"),
      appid: val("appid") ?? val("azp"),
    };

    // 백엔드가 SSO_* 로 주입할 값(권장 폴백 기준) 미리보기
    const derived = {
      SSO_OID: claims.oid ?? null,
      SSO_UPN: claims.upn ?? claims.unique_name ?? null,
      SSO_EMAIL_raw: claims.email ?? null, // 토큰의 email (없으면 null = 비어있음)
      SSO_EMAIL_fallback:
        claims.email ?? claims.preferred_username ?? claims.upn ?? null, // email ?? upn 폴백
    };

    return NextResponse.json({ claims, derived });
  } catch (e) {
    return NextResponse.json(
      { error: "failed", message: e instanceof Error ? e.message : "토큰 디코드 실패" },
      { status: 502 },
    );
  }
}
