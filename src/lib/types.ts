export type Source = { id: string; name: string };
export type Farmer = { id: string; name: string };
export type PresetMilestone = { id: string; level: number; price: string; note: string | null };

export type AccountStatus = 'kho' | 'dang_cay' | 'done' | 'da_giao_cho_ben_thu' | 'da_nhan_tien';
export type Account = {
  id: string;
  username: string;
  password?: string | null; // stored account password
  source: string; // uuid FK to sources
  sourceName?: string; // denormalised for display
  status: AccountStatus;
  position: number;
  current_holder: string | null;
  version: number;
  current_level: number;
  image_url: string | null;
  image_expires_at: string | null;
  amount_received: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
  target_milestone_id: string | null;
  added_by?: string | null;
  tag_label?: string | null;
  tag_expires_at?: string | null;
  created_at?: string | null;
};

export type Milestone = {
  id: string;
  account_id: string;
  level: number;
  price: string; // bigint serialised as string
  note: string | null;
};

export type HolderSession = {
  id: string;
  account_id: string;
  holder_name: string;
  started_at: string;
  ended_at: string | null;
  handed_to: string | null;
  duration_seconds: number | null;
};
