import { supabase } from './supabase'

export const AVATARS_BUCKET = 'avatars'

export function avatarUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl
}
