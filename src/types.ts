/** The shapes the API actually returns. Kept beside api.ts, used everywhere. */

export interface Me {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  is_founder: boolean;
  permissions: string[];
}

export interface SecondFactor {
  stage: 'totp' | 'enrol';
  challenge: string;
  message?: string;
  secret?: string;
  secret_formatted?: string;
  account?: string;
}

export interface Dashboard {
  queues: { payments: number; reports: number; listings_pending: number };
  totals: {
    users: number;
    listings: number;
    roommates: number;
    messages: number;
    subscribed: number;
  };
  revenue: { this_month: number; all_time: number };
  signups_14d: { day: string; n: number }[];
}

export interface Payment {
  id: number;
  user: { id: number; name: string | null; phone: string | null; email: string | null };
  purpose: string;
  plan_name: string | null;
  subject: string | null;
  reference_id: number | null;
  amount_uzs: number;
  status: string;
  reference: string;
  receipt_url: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface Report {
  id: number;
  entity_type: string;
  entity_id: number;
  subject: Record<string, unknown> | null;
  reason: string;
  comment: string | null;
  status: string;
  reporter: { id: number; name: string | null; phone: string | null } | null;
  created_at: string;
  handled_at: string | null;
}

export interface TableInfo {
  name: string;
  label: string;
  rows: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: unknown;
}

export interface Admin {
  id: number | null;
  invite_id?: number;
  pending?: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  two_factor: boolean;
  is_founder: boolean;
  permissions: string[];
  appointed_at: string | null;
  appointed_by: string | null;
  note: string | null;
  expires_at?: string | null;
  last_seen_at: string | null;
}

export interface PermissionCatalogue {
  groups: {
    group: string;
    permissions: { slug: string; label: string; note: string | null; sensitive: boolean }[];
  }[];
  presets: { read_only: string[]; moderator: string[]; full: string[] };
  sensitive_tables: string[];
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_json: string | null;
  after_json: string | null;
  ip: string | null;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  has_more: boolean;
}
