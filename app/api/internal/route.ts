import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { callInternalSso } from "@/lib/apim";

// BFF — SSO(Entra 토큰)로 사내 APIM 호출. 세션 필수.
// body = { user_name, package_name, procedure_name, params }
export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid", message: "JSON body 필요" }, { status: 400 });
  }

  // 병행 기간 구독키(선택)
  const subKey = req.headers.get("x-apim-key") ?? undefined;
  // 선택 locale(쿠키)이 데이터 언어를 결정 → 없으면 브라우저 Accept-Language.
  const locale = req.cookies.get("locale")?.value;
  const acceptLang = locale ?? req.headers.get("accept-language") ?? undefined;

  try {
    const { status, json } = await callInternalSso(body, refreshToken, subKey, acceptLang);
    return NextResponse.json(json, { status });
  } catch (e) {
    return NextResponse.json(
      { error: "apim_failed", message: e instanceof Error ? e.message : "APIM 호출 실패" },
      { status: 502 },
    );
  }
}
