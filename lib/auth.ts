import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const TENANT = process.env.ENTRA_TENANT_ID ?? "";
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET ?? "";
// secret 이 있으면 confidential(운영 배포), 없으면 public+PKCE(로컬 개발 — secret 노출 0).
// 같은 코드가 .env 의 secret 유무로 두 모드를 자동 전환한다.
const IS_CONFIDENTIAL = CLIENT_SECRET.length > 0;

// 로그인 위임 스코프. Graph User.Read = 헤더 프로필(부서·직책)용.
// APIM 스코프는 여기 넣지 않는다 — 한 토큰=한 audience 라, APIM 토큰은
// lib/apim.ts 에서 refresh_token 으로 별도 교환한다.
const DELEGATED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "https://graph.microsoft.com/User.Read",
  // Teams 안읽음 채팅(헤더 드롭다운). 공유 앱 등록은 Chat.Read 관리자 동의 완료.
  "https://graph.microsoft.com/Chat.Read",
  // M365 — 메일(읽기·발신)·일정(읽기). 앱 등록에 위임 권한 + 관리자 동의 필요.
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Calendars.Read",
  // Teams 1:1 알림 발송. Chat.Create(채팅 생성) + ChatMessage.Send(메시지 전송) 위임.
  "https://graph.microsoft.com/Chat.Create",
  "https://graph.microsoft.com/ChatMessage.Send",
].join(" ");

// ── 역할 판정 ───────────────────────────────────────────────
export type PortalRole = "guest" | "employee" | "builder" | "admin";

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
function roleForEntraEmail(email: string | null | undefined): PortalRole {
  return email && adminEmails.has(email.toLowerCase()) ? "admin" : "employee";
}

// 부서 기반 관리자(기본 "전산팀", ADMIN_DEPARTMENTS 로 복수 지정).
const adminDepartments = new Set(
  (process.env.ADMIN_DEPARTMENTS ?? "전산팀")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean),
);
function isAdminDepartment(dept: string | null | undefined): boolean {
  return Boolean(dept && adminDepartments.has(dept.trim()));
}

/** 역할 판정용 Graph /me (부서=관리자, userType=게스트). 실패 시 빈 값. */
async function fetchMeProfile(
  accessToken: string,
): Promise<{ department: string | null; userType: string | null }> {
  try {
    const res = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=department,userType",
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!res.ok) return { department: null, userType: null };
    const data = (await res.json()) as {
      department?: string | null;
      userType?: string | null;
    };
    return { department: data.department ?? null, userType: data.userType ?? null };
  } catch {
    return { department: null, userType: null };
  }
}

async function refreshAccessToken(refreshToken: string) {
  // 퍼블릭 클라이언트(secret 없음)는 refresh 그랜트에서 client_secret 을 보내지 않는다.
  const params = new URLSearchParams({
    client_id: process.env.ENTRA_CLIENT_ID ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: DELEGATED_SCOPES,
  });
  if (IS_CONFIDENTIAL) params.set("client_secret", CLIENT_SECRET);
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "refresh failed");
  return {
    accessToken: data.access_token as string,
    accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
    refreshToken: (data.refresh_token as string) ?? refreshToken,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.ENTRA_CLIENT_ID ?? "",
      clientSecret: CLIENT_SECRET,
      tenantId: process.env.ENTRA_TENANT_ID ?? "",
      authorization: { params: { scope: DELEGATED_SCOPES } },
      // PKCE 명시 (azure-ad 는 기본 checks=["state"]만 → pkce 직접 추가).
      checks: ["pkce", "state"],
      // 퍼블릭 모드: 토큰 엔드포인트에 client_secret 미전송(secret 없이 로그인).
      ...(IS_CONFIDENTIAL
        ? {}
        : { client: { token_endpoint_auth_method: "none" } }),
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      // 최초 로그인: account 에 토큰이 담겨 옴 + 역할 판정
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600_000;
        // 1차: 이메일 허용목록 → 2차: Graph 프로필(부서/게스트)로 보정
        token.role = roleForEntraEmail(token.email as string | undefined);
        if (account.access_token) {
          const { department, userType } = await fetchMeProfile(account.access_token);
          token.department = department ?? undefined;
          if (userType && userType.toLowerCase() === "guest") token.role = "guest";
          else if (isAdminDepartment(department)) token.role = "admin";
        }
        return token;
      }
      // 아직 유효하면 그대로
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 60_000
      ) {
        return token;
      }
      // 만료 → refresh_token 으로 갱신
      try {
        if (token.refreshToken) {
          const r = await refreshAccessToken(token.refreshToken);
          token.accessToken = r.accessToken;
          token.accessTokenExpires = r.accessTokenExpires;
          token.refreshToken = r.refreshToken;
          delete token.error;
        }
      } catch {
        token.error = "RefreshAccessTokenError";
      }
      if (!token.role) token.role = "employee";
      return token;
    },
    async session({ session, token }) {
      session.error = token.error;
      if (session.user) {
        session.user.role = token.role ?? "employee";
        session.user.department = token.department ?? null;
      }
      return session;
    },
  },
};
