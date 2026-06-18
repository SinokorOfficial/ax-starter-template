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

// ── Teams 채팅 (헤더 안읽음 드롭다운) — 스코프 Chat.Read(위임) 필요 ──────────
export interface TeamsChat {
  id: string;
  topic: string | null;
  chatType: string;
  webUrl: string | null;
  fromName: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
}

interface GraphChat {
  id: string;
  topic: string | null;
  chatType: string | null;
  webUrl: string | null;
  viewpoint?: { lastMessageReadDateTime?: string | null } | null;
  lastMessagePreview?: {
    createdDateTime?: string | null;
    body?: { content?: string | null } | null;
    from?: {
      user?: { displayName?: string | null } | null;
      application?: { displayName?: string | null } | null;
    } | null;
  } | null;
}

function toPreviewText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function toChat(c: GraphChat): TeamsChat {
  const lp = c.lastMessagePreview;
  const lastAt = lp?.createdDateTime ?? "";
  const readAt = c.viewpoint?.lastMessageReadDateTime ?? "";
  const unread = Boolean(lastAt) && (!readAt || lastAt > readAt);
  return {
    id: c.id,
    topic: c.topic ?? null,
    chatType: c.chatType ?? "oneOnOne",
    webUrl: c.webUrl ?? null,
    fromName:
      lp?.from?.user?.displayName ?? lp?.from?.application?.displayName ?? "(시스템)",
    preview: toPreviewText(lp?.body?.content ?? ""),
    lastMessageAt: lastAt,
    unread,
  };
}

/** 최근 Teams 채팅(최신순, unread 플래그). Chat.Read 미동의면 throw → 호출부에서 숨김. */
export async function listMyTeamsChats(accessToken?: string): Promise<TeamsChat[]> {
  if (!accessToken) return [];
  const params = new URLSearchParams({
    $expand: "lastMessagePreview",
    $select: "id,topic,chatType,webUrl,viewpoint",
    $top: "50",
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/chats?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/chats ${res.status}: ${detail.slice(0, 120)}`);
  }
  const data = (await res.json()) as { value?: GraphChat[] };
  return (data.value ?? [])
    .map(toChat)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
