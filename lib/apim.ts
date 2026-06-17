// 서버 전용 — SSO(Entra 토큰)로 사내 APIM(SP 게이트웨이) 호출.
//
// 흐름: NextAuth refresh_token → APIM 전용 access_token 교환(audience=APIM API)
//       → APIM 에 Authorization: Bearer 로 호출 (validate-jwt 가 검증).
// 토큰은 ~1시간 캐시하여 매 호출 토큰 교환 왕복을 피한다.

const TENANT = process.env.ENTRA_TENANT_ID ?? "";
const CLIENT_ID = process.env.ENTRA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET ?? "";

// ⚠️ 공유 APIM API 의 scope (각 앱의 client 가 아니라!). 모든 사내 앱이 같은 APIM 을
// 호출하므로 audience 는 이 공유 API 로 고정된다. 새 앱은 이 API 에 pre-authorize 만 받으면 됨.
// (APIM API 가 바뀌면 .env 의 APIM_SCOPE 로 덮어쓰기)
const APIM_SCOPE =
  process.env.APIM_SCOPE ??
  "api://b14bac0b-be58-4b1f-8234-1fe9f28d6d91/access";
const APIM_URL =
  process.env.APIM_SP_URL ?? "https://svmsapi.sinokor.co.kr/sso/v1/internal";
const APIM_PORTAL_KEY = process.env.APIM_PORTAL_KEY ?? "";

// 서버 메모리 토큰 캐시 (인스턴스별). key=refresh_token.
const apimTokenCache = new Map<string, { token: string; exp: number }>();

/** refresh_token → APIM(audience) access_token 교환 (캐시 적용). */
export async function getApimAccessToken(refreshToken: string): Promise<string> {
  const now = Date.now();
  const cached = apimTokenCache.get(refreshToken);
  if (cached && cached.exp > now + 60_000) return cached.token;

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: `${APIM_SCOPE} offline_access`,
      }),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "APIM 토큰 교환 실패");
  }
  const ttl = (data.expires_in ?? 3600) * 1000;
  apimTokenCache.set(refreshToken, { token: data.access_token, exp: now + ttl });
  return data.access_token;
}

export interface ApimEnvelope<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** SSO 토큰으로 SP 게이트웨이 호출.
 *  subscriptionKey: 병행 기간(구독 필수 ON)에만. acceptLanguage: 데이터 언어. */
export async function callInternalSso(
  body: unknown,
  refreshToken: string,
  subscriptionKey?: string,
  acceptLanguage?: string,
): Promise<{ status: number; json: ApimEnvelope | { message: string } }> {
  const token = await getApimAccessToken(refreshToken);
  const subKey = subscriptionKey?.trim() || APIM_PORTAL_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (subKey) headers["Ocp-Apim-Subscription-Key"] = subKey;
  if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;

  const res = await fetch(APIM_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({
    message: `APIM 응답 파싱 실패 (HTTP ${res.status})`,
  }))) as ApimEnvelope;
  return { status: res.status, json };
}
