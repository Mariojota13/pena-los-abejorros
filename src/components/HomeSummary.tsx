import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MONTH_NAMES, computeUpcoming, daysFromToday, relativeLabel, todayStr, type Upcoming } from '../lib/birthdays'
import DuesProgress from './DuesProgress'
import { HexAvatar } from './HexAvatar'
import { AlertIcon, CakeIcon, CalendarIcon, WalletIcon } from './Icons'
import type { CommunityEvent, Due, Fine, Profile } from '../types'

// Resumen de Inicio: próximo evento, próximo cumpleaños y estado de mis cuotas.

interface SummaryData {
  nextEvent: CommunityEvent | null
  nextBirthdays: Upcoming[]
  duesPaid: number
  hasDues: boolean
  pendingFines: Fine[]
}

export default function HomeSummary({ me, duesTarget }: { me: Profile; duesTarget: number | null }) {
  const [data, setData] = useState<SummaryData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadSummary() {
      const [eventsRes, profilesRes, duesRes, finesRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('event_date', todayStr())
          .order('event_date')
          .order('event_time')
          .limit(1),
        supabase.from('profiles').select('*'),
        supabase.from('dues').select('*').eq('profile_id', me.id),
        supabase.from('fines').select('*').eq('profile_id', me.id).eq('status', 'pendiente'),
      ])
      if (cancelled) return

      const upcoming = computeUpcoming((profilesRes.data as Profile[]) ?? [])
      const firstDays = upcoming[0]?.daysUntil
      const dues = (duesRes.data as Due[]) ?? []

      setData({
        nextEvent: ((eventsRes.data as CommunityEvent[]) ?? [])[0] ?? null,
        nextBirthdays: upcoming.filter((u) => u.daysUntil === firstDays),
        duesPaid: dues.reduce((sum, d) => sum + Number(d.amount), 0),
        hasDues: dues.length > 0,
        pendingFines: (finesRes.data as Fine[]) ?? [],
      })
    }
    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [me.id])

  if (!data) {
    return (
      <div className="flex animate-pulse flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-black/5 bg-white/70" />
        ))}
      </div>
    )
  }

  const { nextEvent, nextBirthdays, duesPaid, hasDues, pendingFines } = data
  const showDues = hasDues || !!duesTarget || pendingFines.length > 0
  const pendingTotal = pendingFines.reduce((sum, f) => sum + Number(f.amount), 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Próximo evento */}
      <SummaryCard
        to="/eventos"
        icon={CalendarIcon}
        title="Próximo evento"
        aside={nextEvent ? eventRelativeLabel(daysFromToday(nextEvent.event_date)) : undefined}
      >
        {nextEvent ? (
          <div className="flex items-center gap-3">
            <EventDateHex date={nextEvent.event_date} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-900">{nextEvent.title}</p>
              {(nextEvent.event_time || nextEvent.location) && (
                <p className="truncate text-sm text-neutral-500">
                  {[nextEvent.event_time?.slice(0, 5), nextEvent.location].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No hay eventos próximos. ¿Organizas uno?</p>
        )}
      </SummaryCard>

      {/* Próximo cumpleaños */}
      <SummaryCard
        to="/cumpleanos"
        icon={CakeIcon}
        title={nextBirthdays.length > 1 ? 'Próximos cumpleaños' : 'Próximo cumpleaños'}
        aside={nextBirthdays.length > 0 ? relativeLabel(nextBirthdays[0].daysUntil) : undefined}
        highlight={nextBirthdays[0]?.daysUntil === 0}
      >
        {nextBirthdays.length > 0 ? (
          <div className="flex flex-col gap-2">
            {nextBirthdays.map((u) => (
              <div key={u.profile.id} className="flex items-center gap-3">
                <HexAvatar profile={u.profile} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">
                    {u.profile.id === me.id ? '¡Tú! Felicidades 🎉' : u.profile.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {u.nextDate.getDate()} {MONTH_NAMES[u.nextDate.getMonth()].slice(0, 3)}
                    {u.turningAge !== null && ` · cumple ${u.turningAge}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Nadie ha guardado su cumpleaños todavía.</p>
        )}
      </SummaryCard>

      {/* Mis cuotas */}
      {showDues && (
        <SummaryCard to="/perfil" icon={WalletIcon} title="Mis cuotas">
          <DuesProgress paid={duesPaid} target={duesTarget} />
          {pendingFines.length > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertIcon className="h-4 w-4 shrink-0" />
              {pendingFines.length === 1
                ? `Tienes 1 multa pendiente · ${pendingTotal.toFixed(2)} €`
                : `Tienes ${pendingFines.length} multas pendientes · ${pendingTotal.toFixed(2)} €`}
            </p>
          )}
        </SummaryCard>
      )}
    </div>
  )
}

function eventRelativeLabel(days: number) {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}

function EventDateHex({ date }: { date: string }) {
  const [, m, d] = date.split('-').map(Number)
  return (
    <div className="hex flex h-12 w-14 shrink-0 flex-col items-center justify-center bg-black leading-none text-[#EAE032]">
      <span className="text-lg font-black">{d}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider">{MONTH_NAMES[m - 1].slice(0, 3)}</span>
    </div>
  )
}

function SummaryCard({
  to,
  icon: Icon,
  title,
  aside,
  highlight = false,
  children,
}: {
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  aside?: string
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`block rounded-xl border px-4 py-3 shadow-sm active:scale-[0.99] ${
        highlight ? 'border-black bg-[#EAE032]' : 'border-black/10 bg-white'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Icon className="h-4 w-4" />
          {title}
        </span>
        {aside && <span className="shrink-0 text-xs font-bold text-black">{aside}</span>}
      </div>
      {children}
    </Link>
  )
}
