/** Types miroirs des tables Supabase (voir supabase/migrations). */

export type Plan = "starter" | "pro" | "business";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  plan: Plan;
  points_balance: number;
  points_quota: number;
  created_at: string;
}

export type AvatarStatus = "ready" | "processing" | "failed";

export interface Avatar {
  id: string;
  user_id: string | null;
  name: string;
  image_url: string;
  is_default: boolean;
  is_public: boolean;
  status: AvatarStatus;
  created_at: string;
}

export type SwapMode = "mock" | "local" | "cloud";

export interface SwapSession {
  id: string;
  user_id: string;
  avatar_id: string | null;
  mode: SwapMode;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  points_used: number;
  status: "active" | "ended";
  last_heartbeat_at: string;
}

export type TransactionType = "purchase" | "consumption" | "bonus" | "refund";

export interface PointTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  reference: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  provider: "stripe" | "mobile_money";
  provider_ref: string | null;
  amount: number;
  currency: string;
  points_granted: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
}
