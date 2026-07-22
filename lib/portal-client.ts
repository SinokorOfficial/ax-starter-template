// 브라우저용 BFF 호출 클라이언트 — M365(메일·일정). 클라이언트 컴포넌트 전용.
// 브라우저는 Graph 를 직접 호출하지 않고, 항상 /api/me/* BFF 라우트를 거친다.

import type { MailMessage, MailDetail, MailFolder, CalendarEvent } from "./types";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(
      body?.message || body?.error || `요청 실패 (HTTP ${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

/** GET /api/me/mailFolders → 본인 Outlook 메일 폴더 트리 */
export async function fetchMailFolders(): Promise<MailFolder[]> {
  const res = await fetch("/api/me/mailFolders", { credentials: "same-origin" });
  const data = await asJson<{ folders: MailFolder[] }>(res);
  return data.folders ?? [];
}

/** GET /api/me/mailFolders?parentId= → 특정 폴더의 하위 폴더(펼칠 때 lazy 로드) */
export async function fetchChildFolders(
  parentId: string,
): Promise<MailFolder[]> {
  const res = await fetch(
    `/api/me/mailFolders?parentId=${encodeURIComponent(parentId)}`,
    { credentials: "same-origin" },
  );
  const data = await asJson<{ folders: MailFolder[] }>(res);
  return data.folders ?? [];
}

/** GET /api/me/messages → 본인 받은 메일 목록(폴더 지정 가능) */
export async function fetchMyMessages(
  folderId?: string,
): Promise<MailMessage[]> {
  const res = await fetch(
    `/api/me/messages${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ""}`,
    { credentials: "same-origin" },
  );
  const data = await asJson<{ messages: MailMessage[] }>(res);
  return data.messages;
}

/** GET /api/me/messages/:id → 본인 메일 단건 본문 */
export async function fetchMessage(id: string): Promise<MailDetail> {
  const res = await fetch(`/api/me/messages/${encodeURIComponent(id)}`, {
    credentials: "same-origin",
  });
  const data = await asJson<{ message: MailDetail }>(res);
  return data.message;
}

/** 사내 수신자(사람) 검색 결과 한 건. */
export interface DirectoryHit {
  kind: "user" | "group";
  name: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  groupType: string | null;
}

/** GET /api/directory/people → 이름/이메일로 사내 사람 검색(수신자 선택용). */
export async function searchRecipients(
  q: string,
  signal?: AbortSignal,
): Promise<DirectoryHit[]> {
  const res = await fetch(`/api/directory/people?q=${encodeURIComponent(q)}`, {
    credentials: "same-origin",
    signal,
  });
  const data = await asJson<{ recipients: DirectoryHit[] }>(res);
  return data.recipients;
}

/** POST /api/me/messages/send → 본인 명의 메일 발송 */
export async function sendMail(input: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}): Promise<void> {
  const res = await fetch("/api/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  await asJson<{ ok: true }>(res);
}

/** POST /api/me/messages/:id/reply → 본인 메일 회신 */
export async function replyMail(
  id: string,
  input: { comment: string; replyAll?: boolean },
): Promise<void> {
  const res = await fetch(`/api/me/messages/${encodeURIComponent(id)}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  await asJson<{ ok: true }>(res);
}

/** POST /api/me/teams-message → 직원(들)에게 Teams 1:1 알림 발송(본인 명의, 여러 명 가능). */
export async function sendTeamsNotify(input: {
  to: string;
  text: string;
}): Promise<{ ok: boolean; sent: string[]; failed: { to: string; error?: string }[] }> {
  const res = await fetch("/api/me/teams-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return asJson(res);
}

/** GET /api/me/events → 본인 일정. range(start/end, ISO) 주면 그 기간(캘린더 월 보기). */
export async function fetchMyEvents(range?: {
  start: string;
  end: string;
}): Promise<CalendarEvent[]> {
  const qs = range
    ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
    : "";
  const res = await fetch(`/api/me/events${qs}`, { credentials: "same-origin" });
  const data = await asJson<{ events: CalendarEvent[] }>(res);
  return data.events;
}
