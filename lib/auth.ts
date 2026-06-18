import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const TENANT = process.env.ENTRA_TENANT_ID ?? "";

// 로그인 위임 스코프. Graph User.Read = 헤더 프로필(부서·직책)용.
// APIM 스코프는 여기 넣지 않는다 — 한 토큰=한 audience 라, APIM 토큰은
// lib/apim.ts 에서 refresh_token 으로 별도 교환한다.
const DELEGATED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "https://graph.microsoft.com/User.Read",
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
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ENTRA_CLIENT_ID ?? "",
        client_secret: process.env.ENTRA_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: DELEGATED_SCOPES,
      }),
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
      clientSecret: process.env.ENTRA_CLIENT_SECRET ?? "",
      tenantId: process.env.ENTRA_TENANT_ID ?? "",
      authorization: { params: { scope: DELEGATED_SCOPES } },
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
