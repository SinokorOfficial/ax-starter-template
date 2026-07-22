// M365(메일·일정) 공유 타입 — 서버(graph)·클라이언트(portal-client)·페이지가 함께 사용.

export interface MailMessage {
  id: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  webLink: string | null;
}

export interface MailFolder {
  id: string;
  displayName: string;
  unreadCount: number;
  totalCount: number;
  /** 받은 편지함 여부(최상위 트리에서 맨 위·Inbox 아이콘) */
  isInbox?: boolean;
  /** 하위 폴더 존재 여부 — 아직 로드 전이라도 chevron 을 띄워 lazy expand 허용 */
  hasChildren?: boolean;
  /** 초기 트리에서 딸려온 하위 폴더(최상위 1단계). lazy 로드분은 별도 캐시. */
  children?: MailFolder[];
}

export interface MailDetail {
  id: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  toRecipients: string[];
  ccRecipients: string[];
  receivedAt: string;
  isRead: boolean;
  webLink: string | null;
  hasAttachments: boolean;
  body: string;
  bodyType: "html" | "text";
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string | null;
  organizer: string | null;
  webLink: string | null;
}
