export interface Room {
  id: string;
  title: string;
  court_fee: number;
  shuttle_fee: number;
  total_fee: number;
  qr_url: string | null;
  target_players?: number | null;
  per_person_fee?: number | null;
  passkey?: string | null;
  host_notes?: string | null;
  created_at?: string;
}

export interface Member {
  id: string;
  room_id: string;
  name: string;
  amount: number;
  is_paid: boolean;
  slip_url?: string | null;
  created_at?: string;
}

export interface CreateRoomInput {
  title: string;
  court_fee: number;
  shuttle_fee: number;
  total_fee: number;
  qr_url: string | null;
  target_players?: number | null;
  per_person_fee?: number | null;
  passkey?: string | null;
  host_notes?: string | null;
}

export interface CreateMemberInput {
  room_id: string;
  name: string;
  amount: number;
  is_paid?: boolean;
  slip_url?: string | null;
}
