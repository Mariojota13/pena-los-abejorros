import type { Profile } from '../types'

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export interface Upcoming {
  profile: Profile
  nextDate: Date
  daysUntil: number
  turningAge: number | null
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function computeUpcoming(profiles: Profile[]): Upcoming[] {
  const today = startOfDay(new Date())

  return profiles
    .filter((p) => !!p.birthday)
    .map((p) => {
      const [year, month, day] = p.birthday!.split('-').map(Number)
      let next = new Date(today.getFullYear(), month - 1, day)
      if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day)
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
      const turningAge = year ? next.getFullYear() - year : null
      return { profile: p, nextDate: next, daysUntil, turningAge }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

export function relativeLabel(daysUntil: number) {
  if (daysUntil === 0) return '¡Hoy! 🎉'
  if (daysUntil === 1) return 'Mañana'
  return `En ${daysUntil} días`
}

/** Días que faltan desde hoy hasta una fecha YYYY-MM-DD (0 = hoy). */
export function daysFromToday(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const today = startOfDay(new Date())
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000)
}

/** Fecha de hoy en hora local (no UTC), en formato YYYY-MM-DD. */
export function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
