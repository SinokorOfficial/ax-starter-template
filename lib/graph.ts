// 서버 전용 — 본인 Graph 프로필 (헤더 부서·직책 표시용).

export interface MeProfile {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
}

/** GET /me (User.Read). 토큰 없거나 실패 시 빈 객체 — 예외 던지지 않음. */
export async function getMyProfile(accessToken?: string): Promise<MeProfile> {
  if (!accessToken) return {};
  try {
    const res = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,jobTitle,department",
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!res.ok) return {};
    return (await res.json()) as MeProfile;
  } catch {
    return {};
  }
}
