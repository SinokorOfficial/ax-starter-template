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
