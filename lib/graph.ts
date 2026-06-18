// 서버 전용 — 본인 Graph 호출 (delegated). 로그인 사용자의 토큰으로 /me/* 접근.
// 헤더 프로필·Teams 채팅 + M365(메일·일정). 토큰 없거나 Graph 실패 시 throw → 호출부(BFF)에서 처리.

import type { MailMessage, MailDetail, CalendarEvent } from "./types";

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

// ── 메일 (Outlook) — Mail.Read / Mail.Send (위임) ────────────────────────────

interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string | null;
  receivedDateTime: string | null;
  isRead: boolean | null;
  webLink: string | null;
  from?: { emailAddress?: { name?: string; address?: string } };
}

function toMail(m: GraphMessage): MailMessage {
  const ea = m.from?.emailAddress;
  return {
    id: m.id,
    subject: m.subject ?? "(제목 없음)",
    fromName: ea?.name ?? ea?.address ?? "(보낸사람 없음)",
    fromAddress: ea?.address ?? "",
    preview: m.bodyPreview ?? "",
    receivedAt: m.receivedDateTime ?? "",
    isRead: m.isRead ?? true,
    webLink: m.webLink ?? null,
  };
}

/** 받은 메일 목록(최신순). GET /me/messages, Mail.Read 위임 필요. */
export async function listMyMessages(
  accessToken: string,
  top = 20,
): Promise<MailMessage[]> {
  const params = new URLSearchParams({
    $select: "id,subject,from,bodyPreview,receivedDateTime,isRead,webLink",
    $top: String(top),
    $orderby: "receivedDateTime desc",
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/messages ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { value?: GraphMessage[] };
  return (data.value ?? []).map(toMail);
}

interface GraphRecipient {
  emailAddress?: { name?: string; address?: string };
}
interface GraphMessageDetail extends GraphMessage {
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  hasAttachments?: boolean | null;
  body?: { content?: string | null; contentType?: string | null } | null;
}

function recipientLabel(r: GraphRecipient): string {
  const ea = r.emailAddress;
  return ea?.name || ea?.address || "";
}

function toMailDetail(m: GraphMessageDetail): MailDetail {
  const ea = m.from?.emailAddress;
  const ct = (m.body?.contentType ?? "text").toLowerCase();
  return {
    id: m.id,
    subject: m.subject ?? "(제목 없음)",
    fromName: ea?.name ?? ea?.address ?? "(보낸사람 없음)",
    fromAddress: ea?.address ?? "",
    toRecipients: (m.toRecipients ?? []).map(recipientLabel).filter(Boolean),
    ccRecipients: (m.ccRecipients ?? []).map(recipientLabel).filter(Boolean),
    receivedAt: m.receivedDateTime ?? "",
    isRead: m.isRead ?? true,
    webLink: m.webLink ?? null,
    hasAttachments: Boolean(m.hasAttachments),
    body: m.body?.content ?? m.bodyPreview ?? "",
    bodyType: ct === "html" ? "html" : "text",
  };
}

/** 메일 단건 본문. GET /me/messages/{id}, Mail.Read 위임 필요. */
export async function getMyMessage(
  id: string,
  accessToken: string,
): Promise<MailDetail> {
  const params = new URLSearchParams({
    $select:
      "id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,isRead,webLink,hasAttachments",
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(id)}?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/messages/${id} ${res.status}: ${detail.slice(0, 200)}`);
  }
  return toMailDetail((await res.json()) as GraphMessageDetail);
}

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  html?: boolean;
}

/** 본인 명의 메일 발송. POST /me/sendMail, Mail.Send 위임 필요. */
export async function sendMyMail(
  accessToken: string,
  input: SendMailInput,
): Promise<void> {
  const message = {
    subject: input.subject,
    body: {
      contentType: input.html ? "HTML" : "Text",
      content: input.body,
    },
    toRecipients: input.to.map((a) => ({ emailAddress: { address: a } })),
    ccRecipients: (input.cc ?? []).map((a) => ({ emailAddress: { address: a } })),
  };
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/sendMail ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/** 메일 회신. POST /me/messages/{id}/reply|replyAll (원문 인용·스레드 유지), Mail.Send 위임. */
export async function replyToMessage(
  accessToken: string,
  id: string,
  comment: string,
  replyAll = false,
): Promise<void> {
  const path = replyAll ? "replyAll" : "reply";
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(id)}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/messages/${id}/${path} ${res.status}: ${detail.slice(0, 200)}`);
  }
}

// ── 일정 (calendar) — Calendars.Read (위임) ──────────────────────────────────

interface GraphEvent {
  id: string;
  subject: string | null;
  isAllDay: boolean | null;
  webLink: string | null;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  location?: { displayName?: string };
  organizer?: { emailAddress?: { name?: string; address?: string } };
}

function toEvent(e: GraphEvent): CalendarEvent {
  return {
    id: e.id,
    subject: e.subject ?? "(제목 없음)",
    start: e.start?.dateTime ?? "",
    end: e.end?.dateTime ?? "",
    isAllDay: e.isAllDay ?? false,
    location: e.location?.displayName || null,
    organizer:
      e.organizer?.emailAddress?.name ??
      e.organizer?.emailAddress?.address ??
      null,
    webLink: e.webLink ?? null,
  };
}

export interface MeEventsOptions {
  /** 조회 기간(일) — 오늘부터 N일 (start/end 미지정 시) */
  days?: number;
  /** 명시적 조회 범위(ISO). 주면 days 대신 사용(캘린더 월 보기 등). */
  start?: string;
  end?: string;
  top?: number;
}

/** 본인 일정. GET /me/calendarView (KST), Calendars.Read 위임 필요. */
export async function listMyEvents(
  accessToken: string,
  opts: MeEventsOptions = {},
): Promise<CalendarEvent[]> {
  const hasRange = Boolean(opts.start && opts.end);
  const top = opts.top ?? (hasRange ? 200 : 20);
  const now = new Date();
  const startDt = opts.start ?? now.toISOString();
  const endDt =
    opts.end ?? new Date(now.getTime() + (opts.days ?? 30) * 86400000).toISOString();
  const params = new URLSearchParams({
    startDateTime: startDt,
    endDateTime: endDt,
    $select: "id,subject,start,end,isAllDay,location,organizer,webLink",
    $orderby: "start/dateTime",
    $top: String(top),
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Korea Standard Time"',
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph /me/calendarView ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { value?: GraphEvent[] };
  return (data.value ?? []).map(toEvent);
}
