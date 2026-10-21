import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useToast } from '../context/ToastContext'
import { PageSkeleton } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage, confirmAndDelete } from '../lib/errors'
import { todayStr } from '../lib/birthdays'
import { HexAvatar } from '../components/HexAvatar'
import type { CommunityEvent, EventAttendance, Profile } from '../types'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatTime(time: string | null) {
  if (!time) return null
  return time.slice(0, 5)
}

export default function Events() {
  const { profile: me } = useSession()
  const { showToast } = useToast()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  // null = la tabla de asistencia aún no existe en Supabase: se oculta esa parte
  const [attendance, setAttendance] = useState<EventAttendance[] | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [showPast, setShowPast] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [eventsRes, attendanceRes, membersRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date').order('event_time'),
      supabase.from('event_attendance').select('*'),
      supabase.from('profiles').select('*').order('name'),
    ])
    setEvents(!eventsRes.error && eventsRes.data ? (eventsRes.data as CommunityEvent[]) : [])
    setAttendance(attendanceRes.error ? null : ((attendanceRes.data as EventAttendance[]) ?? []))
    setMembers((membersRes.data as Profile[]) ?? [])
  }

  async function handleRsvp(eventId: string, status: EventAttendance['status']) {
    if (!me || !attendance) return
    const current = attendance.find((a) => a.event_id === eventId && a.profile_id === me.id)
    const others = attendance.filter((a) => !(a.event_id === eventId && a.profile_id === me.id))
    const removing = current?.status === status

    // Se actualiza la pantalla al instante y luego se guarda; si falla, se recarga.
    setAttendance(
      removing
        ? others
        : [...others, { event_id: eventId, profile_id: me.id, status, updated_at: new Date().toISOString() }],
    )

    const { error } = removing
      ? await supabase.from('event_attendance').delete().eq('event_id', eventId).eq('profile_id', me.id)
      : await supabase
          .from('event_attendance')
          .upsert({ event_id: eventId, profile_id: me.id, status, updated_at: new Date().toISOString() })

    if (error) {
      const detail = supabaseErrorMessage(error)
      window.alert(`No se pudo guardar tu respuesta${detail ? `: ${detail}` : '.'}`)
      await load()
      return
    }
    showToast(removing ? 'Respuesta quitada' : status === 'voy' ? '¡Apuntado! Nos vemos allí' : 'Anotado que no vas')
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    if (!date) {
      setError('La fecha es obligatoria.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('events').insert({
        title: title.trim(),
        event_date: date,
        event_time: time || null,
        location: location.trim() || null,
        description: description.trim() || null,
        created_by_profile_id: me?.id ?? null,
      })
      if (error) throw error
      setTitle('')
      setDate('')
      setTime('')
      setLocation('')
      setDescription('')
      setShowForm(false)
      showToast('Evento creado')
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo crear el evento${detail ? `: ${detail}` : '. Inténtalo de nuevo.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const deleted = await confirmAndDelete(() => supabase.from('events').delete().eq('id', id).select(), 'este evento')
    if (deleted) {
      showToast('Evento borrado')
      await load()
    }
  }

  if (events === null) {
    return <PageSkeleton cards={3} withAvatar />
  }

  const today = todayStr()
  const upcoming = events.filter((ev) => ev.event_date >= today)
  const past = events.filter((ev) => ev.event_date < today).reverse()

  if (showForm) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Nuevo evento</h1>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del evento"
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
          />
          <div className="flex gap-3">
            <label className="flex-1 text-left text-sm text-neutral-700">
              Fecha
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
              />
            </label>
            <label className="flex-1 text-left text-sm text-neutral-700">
              Hora (opcional)
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
              />
            </label>
          </div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Lugar (opcional)"
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={3}
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
          />
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Crear evento'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-sm text-neutral-500">
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">📅 Eventos</h1>
        <button onClick={() => setShowForm(true)} className="text-sm font-semibold text-black underline">
          + Nuevo
        </button>
      </div>

      {upcoming.length === 0 && (
        <p className="text-center text-sm text-neutral-600">No hay eventos programados todavía.</p>
      )}

      <div className="flex flex-col gap-2">
        {upcoming.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            canDelete={ev.created_by_profile_id === me?.id || !!me?.is_admin}
            onDelete={handleDelete}
            attendance={attendance?.filter((a) => a.event_id === ev.id) ?? null}
            members={members}
            meId={me?.id ?? null}
            onRsvp={handleRsvp}
            isPast={false}
          />
        ))}
      </div>

      {past.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="text-sm text-neutral-600 underline"
          >
            {showPast ? 'Ocultar eventos pasados' : `Ver eventos pasados (${past.length})`}
          </button>
          {showPast && (
            <div className="mt-2 flex flex-col gap-2 opacity-70">
              {past.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  canDelete={ev.created_by_profile_id === me?.id || !!me?.is_admin}
                  onDelete={handleDelete}
                  attendance={attendance?.filter((a) => a.event_id === ev.id) ?? null}
                  members={members}
                  meId={me?.id ?? null}
                  onRsvp={handleRsvp}
                  isPast={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  canDelete,
  onDelete,
  attendance,
  members,
  meId,
  onRsvp,
  isPast,
}: {
  event: CommunityEvent
  canDelete: boolean
  onDelete: (id: string) => void
  attendance: EventAttendance[] | null
  members: Profile[]
  meId: string | null
  onRsvp: (eventId: string, status: EventAttendance['status']) => void
  isPast: boolean
}) {
  const d = parseDate(event.event_date)
  const time = formatTime(event.event_time)

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="hex flex h-12 w-14 shrink-0 flex-col items-center justify-center bg-black leading-none text-[#EAE032]">
          <span className="text-lg font-black">{d.getDate()}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">{MONTH_NAMES[d.getMonth()].slice(0, 3)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-neutral-900">{event.title}</p>
          {(time || event.location) && (
            <p className="text-sm text-neutral-500">{[time, event.location].filter(Boolean).join(' · ')}</p>
          )}
          {event.description && <p className="mt-2 text-sm text-neutral-700">{event.description}</p>}
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="shrink-0 text-xs text-neutral-500 underline"
          >
            Borrar
          </button>
        )}
      </div>
      {attendance && (
        <Attendance
          eventId={event.id}
          attendance={attendance}
          members={members}
          meId={meId}
          onRsvp={onRsvp}
          isPast={isPast}
        />
      )}
    </div>
  )
}

function Attendance({
  eventId,
  attendance,
  members,
  meId,
  onRsvp,
  isPast,
}: {
  eventId: string
  attendance: EventAttendance[]
  members: Profile[]
  meId: string | null
  onRsvp: (eventId: string, status: EventAttendance['status']) => void
  isPast: boolean
}) {
  const [showList, setShowList] = useState(false)
  const byId = new Map(members.map((m) => [m.id, m]))
  const peopleWith = (status: EventAttendance['status']) =>
    attendance
      .filter((a) => a.status === status)
      .map((a) => byId.get(a.profile_id))
      .filter((m): m is Profile => !!m)
  const going = peopleWith('voy')
  const notGoing = peopleWith('no_voy')
  const mine = attendance.find((a) => a.profile_id === meId)?.status ?? null
  const anyAnswer = going.length > 0 || notGoing.length > 0

  const goingVerb = isPast ? (going.length === 1 ? 'fue' : 'fueron') : going.length === 1 ? 'va' : 'van'
  const summary = !anyAnswer
    ? isPast
      ? 'Nadie marcó asistencia'
      : 'Nadie ha respondido todavía'
    : [going.length > 0 && `${going.length} ${goingVerb}`, notGoing.length > 0 && `${notGoing.length} no`]
        .filter(Boolean)
        .join(' · ')

  return (
    <div className="mt-3 border-t border-black/10 pt-3">
      {!isPast && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <RsvpButton active={mine === 'voy'} onClick={() => onRsvp(eventId, 'voy')}>
            ✓ Voy
          </RsvpButton>
          <RsvpButton active={mine === 'no_voy'} onClick={() => onRsvp(eventId, 'no_voy')}>
            ✕ No voy
          </RsvpButton>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowList((v) => !v)}
        disabled={!anyAnswer}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default"
      >
        <div className="flex min-w-0 items-center gap-2">
          {going.length > 0 && (
            <div className="flex -space-x-3">
              {going.slice(0, 5).map((m) => (
                <div key={m.id} className="origin-left scale-75">
                  <HexAvatar profile={m} />
                </div>
              ))}
            </div>
          )}
          <span className="text-sm text-neutral-600">{summary}</span>
        </div>
        {anyAnswer && (
          <span className="shrink-0 text-xs font-semibold text-black underline">{showList ? 'Ocultar' : 'Ver quién'}</span>
        )}
      </button>

      {showList && (
        <div className="mt-3 flex flex-col gap-3 text-sm">
          {going.length > 0 && <NameList title={isPast ? 'Fueron' : 'Van'} people={going} meId={meId} />}
          {notGoing.length > 0 && <NameList title="No van" people={notGoing} meId={meId} />}
        </div>
      )}
    </div>
  )
}

function RsvpButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'border-black bg-black text-[#EAE032]' : 'border-black/15 bg-white text-neutral-700 active:bg-black/5'
      }`}
    >
      {children}
    </button>
  )
}

function NameList({ title, people, meId }: { title: string; people: Profile[]; meId: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title} ({people.length})
      </p>
      <p className="text-neutral-800">
        {people.map((p) => (p.id === meId ? `${p.name} (tú)` : p.name)).join(', ')}
      </p>
    </div>
  )
}
