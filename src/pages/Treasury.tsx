import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import { formatDuesLabel } from '../lib/dues'
import DuesProgress from '../components/DuesProgress'
import type { Profile, Due, CommunityInfo } from '../types'

function formatDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export default function Treasury() {
  const { profile: me } = useSession()
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [dues, setDues] = useState<Due[] | null>(null)
  const [info, setInfo] = useState<CommunityInfo | null>(null)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetValue, setTargetValue] = useState('')
  const [targetSaving, setTargetSaving] = useState(false)
  const [targetError, setTargetError] = useState<string | null>(null)

  const isTreasurer = me?.role_title === 'Tesorero'
  const isAdmin = !!me?.is_admin

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [{ data: profilesData }, { data: duesData }, { data: infoData }] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('dues').select('*').order('paid_on', { ascending: false }),
      supabase.from('community_info').select('*').eq('id', 1).maybeSingle(),
    ])
    setProfiles((profilesData as Profile[]) ?? [])
    setDues((duesData as Due[]) ?? [])
    setInfo((infoData as CommunityInfo) ?? null)
  }

  if (!isTreasurer && !isAdmin) {
    return <Navigate to="/" replace />
  }

  function openMember(p: Profile) {
    setSelected(p)
    setShowForm(false)
    setError(null)
  }

  function startAdding() {
    setConcept('')
    setAmount('')
    setPaidOn('')
    setError(null)
    setShowForm(true)
  }

  function startEditingTarget() {
    setTargetValue(info?.dues_target?.toString() ?? '')
    setTargetError(null)
    setEditingTarget(true)
  }

  async function handleSaveTarget(e: FormEvent) {
    e.preventDefault()
    const trimmed = targetValue.trim()
    if (trimmed && Number.isNaN(Number(trimmed))) {
      setTargetError('Introduce un importe válido.')
      return
    }
    setTargetSaving(true)
    setTargetError(null)
    try {
      const { data, error } = await supabase
        .from('community_info')
        .update({ dues_target: trimmed ? Number(trimmed) : null })
        .eq('id', 1)
        .select()
        .single()
      if (error) throw error
      setInfo(data as CommunityInfo)
      setEditingTarget(false)
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setTargetError(`No se pudo guardar${detail ? `: ${detail}` : '.'}`)
    } finally {
      setTargetSaving(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!concept.trim() || !amount.trim() || !paidOn) {
      setError('Todos los campos son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('dues').insert({
        profile_id: selected.id,
        concept: concept.trim(),
        amount: Number(amount),
        paid_on: paidOn,
        created_by_profile_id: me?.id ?? null,
      })
      if (error) throw error
      setShowForm(false)
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo guardar${detail ? `: ${detail}` : '.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('dues').delete().eq('id', id)
    await load()
  }

  if (profiles === null || dues === null || info === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  if (selected) {
    const memberDues = dues.filter((d) => d.profile_id === selected.id)
    const total = memberDues.reduce((sum, d) => sum + Number(d.amount), 0)

    if (showForm) {
      return (
        <div className="flex flex-1 flex-col gap-6 px-6 py-8">
          <h1 className="text-xl font-semibold text-neutral-900">Nueva cuota — {selected.name}</h1>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              autoFocus
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Concepto (ej. Cuota anual 2026)"
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
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
            {error && <p className="text-sm font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cuota'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-neutral-500">
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
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{selected.name}</h1>
          <div className="mt-2">
            <DuesProgress paid={total} target={info.dues_target} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {memberDues.length === 0 && (
            <p className="text-center text-sm text-neutral-600">Todavía no hay cuotas registradas.</p>
          )}
          {memberDues.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">{d.concept}</p>
                <p className="text-sm text-neutral-500">{formatDate(d.paid_on)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-neutral-900">{Number(d.amount).toFixed(2)} €</span>
                {isTreasurer && (
                  <button onClick={() => handleDelete(d.id)} className="text-xs text-neutral-500 underline">
                    Borrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isTreasurer && (
          <button
            onClick={startAdding}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800"
          >
            + Añadir cuota
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">💰 Cuotas</h1>

      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        {editingTarget ? (
          <form onSubmit={handleSaveTarget} className="flex flex-col gap-3">
            <label className="text-left text-sm text-neutral-700">
              Objetivo de cuota (€)
              <input
                autoFocus
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Ej. 500"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
              />
            </label>
            {targetError && <p className="text-sm font-medium text-red-700">{targetError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={targetSaving}
                className="flex-1 rounded-xl bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {targetSaving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingTarget(false)}
                className="flex-1 rounded-xl border border-black/15 px-4 py-2 text-neutral-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Objetivo de cuota</p>
              <p className="mt-1 font-medium text-neutral-900">
                {info.dues_target ? `${info.dues_target.toFixed(2)} €` : 'Sin definir'}
              </p>
            </div>
            {isTreasurer && (
              <button onClick={startEditingTarget} className="text-sm font-semibold text-black underline">
                Editar
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600">
        {isTreasurer
          ? 'Toca a un miembro para ver o añadir sus cuotas.'
          : 'Vista de administrador (solo lectura, solo el tesorero puede editar).'}
      </p>
      <div className="flex flex-col gap-2">
        {profiles.map((p) => {
          const memberTotal = dues
            .filter((d) => d.profile_id === p.id)
            .reduce((sum, d) => sum + Number(d.amount), 0)
          return (
            <button
              key={p.id}
              onClick={() => openMember(p)}
              className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm active:bg-black/5"
            >
              <span className="font-medium text-neutral-900">{p.name}</span>
              <span className="text-sm text-neutral-500">{formatDuesLabel(memberTotal, info.dues_target)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
