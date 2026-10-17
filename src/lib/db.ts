import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { ChatMessage, Profile } from "./onboarding";

export type Db = ReturnType<typeof createAdminClient>;
export const db = createAdminClient;

export type ApplicationStatus = "onboarding" | "submitted" | "accepted" | "waitlist" | "rejected" | "blocked";

export type Application = {
  id: string;
  created_at: string;
  status: ApplicationStatus;
  locale: string;
  city: string;
  first_name: string;
  email: string;
  phone: string | null;
  transcript: ChatMessage[];
  profile: Profile | null;
  personality_type: string | null;
  submitted_at: string | null;
  invite_code: string;
  buddy_id: string | null;
  referred_by: string | null;
  photo_path: string | null;
  evaluated_at: string | null;
  evaluation: unknown;
  waitlist_reason: "balance" | "format" | "review" | null;
  accepted_at: string | null;
  available_since: string | null;
  lebenszeichen_at: string | null;
  last_invited_at: string | null;
  missed_bookings: number;
  last_nudge_at: string | null;
  no_shows: number;
  under_review: boolean;
  blocked_at: string | null;
  founder: boolean;
  referral_rewarded_at: string | null;
  magic_token: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  maps_url: string | null;
  email: string | null;
  phone: string | null;
  weekdays: string[];
  start_time: string;
  tables_per_evening: number;
  active: boolean;
};

export type DinnerStatus = "inviting" | "confirmed" | "completed" | "postponed" | "cancelled";

export type Dinner = {
  id: string;
  created_at: string;
  restaurant_id: string;
  starts_at: string;
  status: DinnerStatus;
  matching: unknown;
  reserved_count: number | null;
  feedback_sent_at: string | null;
  wrapped_up_at: string | null;
};

export type SeatStatus =
  | "invited"
  | "offered"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled"
  | "cancelled_late"
  | "attended"
  | "no_show"
  | "postponed"
  | "withdrawn";

/** Plätze, die (noch) zählen: eingeladen, angeboten oder fix */
export const OPEN_SEAT: SeatStatus[] = ["invited", "offered", "confirmed"];
/** Personen, die am Abend dabei waren oder sein werden */
export const TAKING_PART: SeatStatus[] = ["confirmed", "attended"];

export type Seat = {
  id: string;
  created_at: string;
  dinner_id: string;
  application_id: string;
  token: string;
  status: SeatStatus;
  replacement: boolean;
  expires_at: string | null;
  checkout_started_at: string | null;
  confirmed_at: string | null;
  ended_at: string | null;
  price_cents: number | null;
  paid_with: "stripe" | "package" | null;
  payment_id: string | null;
  package_id: string | null;
  discount_id: string | null;
  icebreaker: { fragen: string[] } | null;
};

export type Payment = {
  id: string;
  application_id: string | null;
  seat_id: string | null;
  kind: "seat" | "package";
  amount_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  status: "paid" | "refunded";
};

export type Package = {
  id: string;
  application_id: string;
  total: number;
  remaining: number;
  expires_at: string;
};

export type Discount = {
  id: string;
  application_id: string;
  reason: "referral" | "five_person";
  price_cents: number;
  source_id: string;
  used_at: string | null;
  used_seat_id: string | null;
};

export type Feedback = {
  seat_id: string;
  rating_evening: number | null;
  rating_table: number | null;
  improve: string | null;
  wants_to_see: string[];
  absent: string[];
  share_phone: boolean;
};

/** Wirft bei Datenbankfehlern, statt sie still zu übergehen */
export function must<T>(result: { data: T; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}
