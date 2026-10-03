export interface TicketPreviewData {
  number: string;
  subject: string;
  status: string;
  priority: string;
  queue: string;
  customer: string | null;
  contact: string | null;
  assignee: string | null;
  brief: string;
  latest: { body: string; author: string; internal: boolean } | null;
  attachmentCount: number;
  loggedMinutes: number;
  lastActivityAt: string;
}
