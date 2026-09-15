import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import type { Profile, Fine, Sanction } from '../types'

const SEVERITY_OPTIONS: Sanction['severity'][] = ['leve', 'grave', 'muy grave']

function formatDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function severityClasses(severity: Sanction['severity']) {
  if (severity === 'muy grave') return 'bg-red-100 text-red-700'
  if (severity === 'grave') return 'bg-orange-100 text-orange-700'
  return 'bg-yellow-100 text-yellow-800'
}

export default function Sanctions() {
  const { profile: me } = useSession()
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [fines, setFines] = useState<Fine[] | null>(null)
  const [sanctions, setSanctions] = useState<Sanction[] | null>(null)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [addingType, setAddingType] = useState<'fine' | 'sanction' | null>(null)

  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [severity, setSeverity] = useState<Sanction['severity']>('leve')
  const [issuedOn, setIssuedOn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = !!me?.is_admin

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [{ data: profilesData }, { data: finesData }, { data: sanctionsData }] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('fines').select('*').order('issued_on', { ascending: false }),
      supabase.from('sanctions').select('*').order('issued_on', { ascending: false }),
    ])
    setProfiles((profilesData as Profile[]) ?? [])
    setFines((finesData as Fine[]) ?? [])
    setSanctions((sanctionsData as Sanction[]) ?? [])
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  function openMember(p: Profile) {
    setSelected(p)
    setAddingType(null)
    setError(null)
  }

  function startAdding(type: 'fine' | 'sanction') {
    setReason('')
    setAmount('')
    setSeverity('leve')
    setIssuedOn('')
    setError(null)
    setAddingType(type)
  }

  async function handleCreateFine(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!reason.trim() || !amount.trim() || !issuedOn) {
      setError('Todos los campos son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('fines').insert({
        profile_id: selected.id,
        reason: reason.trim(),
        amount: Number(amount),
        issued_on: issuedOn,
        status: 'pendiente',
        created_by_profile_id: me?.id ?? null,
      })
      if (error) throw error
      setAddingType(null)
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo guardar${detail ? `: ${detail}` : '.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateSanction(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!reason.trim() || !issuedOn) {
      setError('Todos los campos son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('sanctions').insert({
        profile_id: selected.id,
        reason: reason.trim(),
        severity,
        issued_on: issuedOn,
        created_by_profile_id: me?.id ?? null,
      })
      if (error) throw error
      setAddingType(null)
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo guardar${detail ? `: ${detail}` : '.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function toggleFineStatus(fine: Fine) {
    const newStatus = fine.status === 'pendiente' ? 'pagada' : 'pendiente'
    await supabase.from('fines').update({ status: newStatus }).eq('id', fine.id)
    await load()
  }

  async function handleDeleteFine(id: string) {
    await supabase.from('fines').delete().eq('id', id)
    await load()
  }

  async function handleDeleteSanction(id: string) {
    await supabase.from('sanctions').delete().eq('id', id)
    await load()
  }

  if (profiles === null || fines === null || sanctions === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  if (selected) {
    const memberFines = fines.filter((f) => f.profile_id === selected.id)
    const memberSanctions = sanctions.filter((s) => s.profile_id === selected.id)
    const pendingTotal = memberFines
      .filter((f) => f.status === 'pendiente')
      .reduce((sum, f) => sum + Number(f.amount), 0)

    if (addingType === 'fine') {
      return (
        <div className="flex flex-1 flex-col gap-6 px-6 py-8">
          <h1 className="text-xl font-semibold text-neutral-900">Nueva multa — {selected.name}</h1>
          <form onSubmit={handleCreateFine} className="flex flex-col gap-3">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (ej. Retraso en la reunión)"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Importe (€)"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
            <input
              type="date"
              value={issuedOn}
              onChange={(e) => setIssuedOn(e.target.value)}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
            {error && <p className="text-sm font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar multa'}
            </button>
            <button type="button" onClick={() => setAddingType(null)} className="text-sm text-neutral-500">
              Cancelar
            </button>
          </form>
        </div>
      )
    }

    if (addingType === 'sanction') {
      return (
        <div className="flex flex-1 flex-col gap-6 px-6 py-8">
          <h1 className="text-xl font-semibold text-neutral-900">Nueva sanción — {selected.name}</h1>
          <form onSubmit={handleCreateSanction} className="flex flex-col gap-3">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (ej. Conducta antideportiva)"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Sanction['severity'])}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={issuedOn}
              onChange={(e) => setIssuedOn(e.target.value)}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
            {error && <p className="text-sm font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar sanción'}
            </button>
            <button type="button" onClick={() => setAddingType(null)} className="text-sm text-neutral-500">
              Cancelar
            </button>
          </form>
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <button onClick={() => setSelected(null)} className="self-start text-sm font-semibold text-black underline">
          ‹ Todos los miembros
        </button>
        <h1 className="text-xl font-semibold text-neutral-900">{selected.name}</h1>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">
              Multas · pendiente {pendingTotal.toFixed(2)} €
            </h2>
          </div>
          {memberFines.length === 0 && (
            <p className="text-center text-sm text-neutral-600">Sin multas registradas.</p>
          )}
          {memberFines.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">{f.reason}</p>
                <p className="text-sm text-neutral-500">
                  {formatDate(f.issued_on)} · {Number(f.amount).toFixed(2)} €
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFineStatus(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    f.status === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {f.status === 'pagada' ? 'Pagada ✓' : 'Pendiente'}
                </button>
                <button onClick={() => handleDeleteFine(f.id)} className="text-xs text-neutral-500 underline">
                  Borrar
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => startAdding('fine')}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800"
          >
            + Añadir multa
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">Sanciones</h2>
          {memberSanctions.length === 0 && (
            <p className="text-center text-sm text-neutral-600">Sin sanciones registradas.</p>
          )}
          {memberSanctions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">{s.reason}</p>
                <p className="text-sm text-neutral-500">{formatDate(s.issued_on)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${severityClasses(s.severity)}`}>
                  {s.severity}
                </span>
                <button onClick={() => handleDeleteSanction(s.id)} className="text-xs text-neutral-500 underline">
                  Borrar
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => startAdding('sanction')}
            className="w-full rounded-xl border-2 border-black px-4 py-3 font-medium text-black"
          >
            + Añadir sanción
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">🚨 Multas y sanciones</h1>
      <p className="text-xs text-neutral-600">Toca a un miembro para ver o añadir sus multas y sanciones.</p>
      <div className="flex flex-col gap-2">
        {profiles.map((p) => {
          const memberFines = fines.filter((f) => f.profile_id === p.id)
          const memberSanctions = sanctions.filter((s) => s.profile_id === p.id)
          const pending = memberFines.filter((f) => f.status === 'pendiente').length
          return (
            <button
              key={p.id}
              onClick={() => openMember(p)}
              className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm active:bg-black/5"
            >
              <span className="font-medium text-neutral-900">{p.name}</span>
              <span className="text-sm text-neutral-500">
                {pending > 0 && `${pending} multa${pending > 1 ? 's' : ''} pend. `}
                {memberSanctions.length > 0 && `· ${memberSanctions.length} sanción${memberSanctions.length > 1 ? 'es' : ''}`}
                {pending === 0 && memberSanctions.length === 0 && 'Sin incidencias'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
