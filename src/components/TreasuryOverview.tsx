import { useState, type ReactNode } from 'react'
import { HexAvatar } from './HexAvatar'
import type { Due, Profile } from '../types'

// Resumen de tesorería: total recaudado, quién está al día y quién debe.

export interface MemberBalance {
  profile: Profile
  paid: number
  /** Lo que le falta para llegar al objetivo (0 si está al día o no hay objetivo). */
  owed: number
  upToDate: boolean
}

export function computeBalances(profiles: Profile[], dues: Due[], target: number | null): MemberBalance[] {
  const paidBy = new Map<string, number>()
  for (const d of dues) paidBy.set(d.profile_id, (paidBy.get(d.profile_id) ?? 0) + Number(d.amount))
  return profiles.map((profile) => {
    const paid = paidBy.get(profile.id) ?? 0
    const owed = target ? Math.max(0, target - paid) : 0
    return { profile, paid, owed, upToDate: !!target && owed === 0 }
  })
}

const euros = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export function TreasurySummary({ balances, target }: { balances: MemberBalance[]; target: number | null }) {
  const collected = balances.reduce((sum, b) => sum + b.paid, 0)

  if (!target) {
    return (
      <div className="rounded-xl border-2 border-black bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total recaudado</p>
        <p className="mt-1 text-3xl font-black text-neutral-900">{euros(collected)}</p>
        <p className="mt-2 text-sm text-neutral-500">
          Define un objetivo de cuota para ver quién está al día y cuánto falta por cobrar.
        </p>
      </div>
    )
  }

  const expected = target * balances.length
  const pending = balances.reduce((sum, b) => sum + b.owed, 0)
  const upToDate = balances.filter((b) => b.upToDate).length
  const percent = expected > 0 ? Math.min(100, (collected / expected) * 100) : 0

  return (
    <div className="rounded-xl border-2 border-black bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total recaudado</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="text-3xl font-black text-neutral-900">{euros(collected)}</p>
        <p className="text-sm font-semibold text-neutral-500">{Math.round(percent)} %</p>
      </div>
      <p className="text-sm text-neutral-500">de {euros(expected)} esperados</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat value={`${upToDate}`} label="Al día" tone="green" />
        <Stat value={`${balances.length - upToDate}`} label="Pendientes" tone={upToDate < balances.length ? 'red' : 'neutral'} />
        <Stat value={euros(pending)} label="Por cobrar" tone={pending > 0 ? 'red' : 'neutral'} />
      </div>
    </div>
  )
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'green' | 'red' | 'neutral' }) {
  const colors = {
    green: 'bg-green-50 text-green-800',
    red: 'bg-red-50 text-red-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  }[tone]
  return (
    <div className={`rounded-lg px-2 py-2 ${colors}`}>
      <p className="truncate text-base font-bold">{value}</p>
      <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}

type Filter = 'todos' | 'pendientes' | 'al-dia'

export function MemberDuesList({
  balances,
  target,
  onOpen,
  onShare,
}: {
  balances: MemberBalance[]
  target: number | null
  onOpen: (p: Profile) => void
  onShare: (text: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('todos')
  const pendingList = balances.filter((b) => !b.upToDate)
  const upToDateList = balances.filter((b) => b.upToDate)

  const visible =
    filter === 'pendientes'
      ? [...pendingList].sort((a, b) => b.owed - a.owed)
      : filter === 'al-dia'
        ? upToDateList
        : balances

  function sharePending() {
    const lines = [...pendingList]
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name, 'es'))
      .map((b) => `• ${b.profile.name}: faltan ${euros(b.owed)}`)
    onShare(`🐝 Cuotas pendientes (objetivo ${euros(target ?? 0)})\n\n${lines.join('\n')}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {target && (
        <div className="flex items-center gap-1.5">
          <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>
            Todos ({balances.length})
          </Chip>
          <Chip active={filter === 'pendientes'} onClick={() => setFilter('pendientes')}>
            Pendientes ({pendingList.length})
          </Chip>
          <Chip active={filter === 'al-dia'} onClick={() => setFilter('al-dia')}>
            Al día ({upToDateList.length})
          </Chip>
        </div>
      )}

      {filter === 'pendientes' && pendingList.length > 0 && (
        <button
          onClick={sharePending}
          className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-semibold text-black active:bg-black/5"
        >
          Compartir lista de pendientes
        </button>
      )}

      {visible.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-600">
          {filter === 'pendientes' ? '¡Todo el mundo está al día! 🎉' : 'Nadie por aquí todavía.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((b) => (
          <button
            key={b.profile.id}
            onClick={() => onOpen(b.profile)}
            className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm active:bg-black/5"
          >
            <HexAvatar profile={b.profile} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-neutral-900">{b.profile.name}</span>
                {target ? (
                  b.upToDate ? (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Al día ✓
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Faltan {euros(b.owed)}
                    </span>
                  )
                ) : null}
              </div>
              <p className="text-sm text-neutral-500">
                {euros(b.paid)}
                {target ? ` de ${euros(target)}` : ' pagados'}
              </p>
              {target && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className={`h-full rounded-full ${b.upToDate ? 'bg-green-500' : 'bg-black/40'}`}
                    style={{ width: `${Math.min(100, (b.paid / target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-xs font-semibold ${
        active ? 'border-black bg-black text-[#EAE032]' : 'border-black/15 bg-white text-neutral-700'
      }`}
    >
      {children}
    </button>
  )
}
