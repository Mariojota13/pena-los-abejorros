import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import type { CommunityEvent } from '../types'

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
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date')
      .order('event_time')
    if (!error && data) setEvents(data as CommunityEvent[])
    else setEvents([])
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
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo crear el evento${detail ? `: ${detail}` : '. Inténtalo de nuevo.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('events').delete().eq('id', id)
    await load()
  }

  if (events === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((ev) => ev.event_date >= todayStr)
  const past = events.filter((ev) => ev.event_date < todayStr).reverse()

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
          <EventCard key={ev.id} event={ev} canDelete={ev.created_by_profile_id === me?.id} onDelete={handleDelete} />
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
                <EventCard key={ev.id} event={ev} canDelete={ev.created_by_profile_id === me?.id} onDelete={handleDelete} />
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
}: {
  event: CommunityEvent
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  const d = parseDate(event.event_date)
  const time = formatTime(event.event_time)

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">{event.title}</p>
          <p className="text-sm text-neutral-500">
            {d.getDate()} de {MONTH_NAMES[d.getMonth()]}
            {time && ` · ${time}`}
            {event.location && ` · ${event.location}`}
          </p>
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
    </div>
  )
}
