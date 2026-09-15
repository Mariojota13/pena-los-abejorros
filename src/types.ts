export interface Profile {
  id: string
  auth_user_id: string | null
  name: string
  nickname: string | null
  birthday: string | null // formato YYYY-MM-DD
  role_title: string | null
  is_admin: boolean
  email: string | null
  member_since_year: number | null
  avatar_path: string | null
  created_at: string
}

export interface CommunityInfo {
  id: number
  email: string | null
  bank_account: string | null
  statutes_path: string | null
  dues_target: number | null
  updated_at: string
}

export interface Due {
  id: string
  profile_id: string
  concept: string
  amount: number
  paid_on: string // formato YYYY-MM-DD
  created_by_profile_id: string | null
  created_at: string
}

export interface Fine {
  id: string
  profile_id: string
  reason: string
  amount: number
  status: 'pendiente' | 'pagada'
  issued_on: string // formato YYYY-MM-DD
  created_by_profile_id: string | null
  created_at: string
}

export interface Sanction {
  id: string
  profile_id: string
  reason: string
  severity: 'leve' | 'grave' | 'muy grave'
  issued_on: string // formato YYYY-MM-DD
  created_by_profile_id: string | null
  created_at: string
}

export interface CommunityEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  event_date: string // formato YYYY-MM-DD
  event_time: string | null // formato HH:MM:SS
  created_by_profile_id: string | null
  created_at: string
}
