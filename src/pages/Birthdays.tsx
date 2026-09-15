import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import type { Profile } from '../types'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface Upcoming {
  profile: Profile
  nextDate: Date
  daysUntil: number
  turningAge: number | null
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function computeUpcoming(profiles: Profile[]): Upcoming[] {
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

function relativeLabel(daysUntil: number) {
  if (daysUntil === 0) return '¡Hoy! 🎉'
  if (daysUntil === 1) return 'Mañana'
  return `En ${daysUntil} días`
}

export default function Birthdays() {
  const { profile: me } = useSession()
  const [upcoming, setUpcoming] = useState<Upcoming[] | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*')
    if (!error && data) setUpcoming(computeUpcoming(data as Profile[]))
    else setUpcoming([])
  }

  if (upcoming === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  const withoutBirthday = upcoming.length === 0

  let lastMonth = -1

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">🎂 Cumpleaños</h1>

      {withoutBirthday && (
        <p className="text-center text-sm text-neutral-600">
          Todavía nadie ha guardado su cumpleaños. Añade el tuyo desde tu perfil.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {upcoming.map((u) => {
          const month = u.nextDate.getMonth()
          const showMonthHeader = month !== lastMonth
          lastMonth = month
          const isMe = u.profile.id === me?.id

          return (
            <div key={u.profile.id}>
              {showMonthHeader && (
                <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-neutral-600 first:mt-0">
                  {MONTH_NAMES[month]}
                </p>
              )}
              <div
                className={`flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm ${
                  u.daysUntil === 0 ? 'border-black bg-[#EAE032]' : 'border-black/10 bg-white'
                }`}
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {u.profile.name}
                    {isMe && <span className="text-neutral-500"> (tú)</span>}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {u.nextDate.getDate()} de {MONTH_NAMES[month]}
                    {u.turningAge !== null && ` · cumple ${u.turningAge}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    u.daysUntil === 0 ? 'text-black' : 'text-neutral-400'
                  }`}
                >
                  {relativeLabel(u.daysUntil)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
