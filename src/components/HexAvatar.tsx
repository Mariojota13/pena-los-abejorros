import { avatarUrl } from '../lib/avatar'
import type { Profile } from '../types'

export function HexAvatar({ profile }: { profile: Profile }) {
  const photo = avatarUrl(profile.avatar_path)
  if (photo) return <img src={photo} alt="" className="hex-cell h-10 w-10 shrink-0 object-cover" />
  return (
    <div className="hex-cell flex h-10 w-10 shrink-0 items-center justify-center bg-black text-sm font-bold text-white">
      {profile.name.charAt(0).toUpperCase()}
    </div>
  )
}
