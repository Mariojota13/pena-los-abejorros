import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import type { Profile } from '../types'

export default function ChooseProfile() {
  const { chooseProfile, createProfile } = useSession()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadProfiles()
  }, [])

  async function loadProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('name')
    if (!error && data) setProfiles(data as Profile[])
    setLoading(false)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createProfile(name.trim(), birthday)
    } catch {
      setError('No se pudo crear el perfil. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-neutral-400">Cargando…</div>
  }

  if (showCreate) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-8 py-12">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Crear tu perfil</h1>
          <p className="mt-1 text-neutral-500">Así te reconocerán en el calendario de cumpleaños y el organigrama</p>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-amber-400"
          />
          <label className="text-left text-sm text-neutral-500">
            Fecha de cumpleaños
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-amber-400"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 font-medium text-white active:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Continuar'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="text-sm text-neutral-400"
          >
            Volver a la lista
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-neutral-900">¿Quién eres?</h1>
        <p className="mt-1 text-neutral-500">Selecciona tu nombre en la lista</p>
      </div>
      <div className="flex flex-col gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => void chooseProfile(p)}
            className="rounded-xl border border-neutral-200 px-4 py-3 text-left active:bg-neutral-50"
          >
            {p.name}
          </button>
        ))}
        {profiles.length === 0 && (
          <p className="text-center text-sm text-neutral-400">Todavía no hay nadie registrado. ¡Sé el primero!</p>
        )}
      </div>
      <button
        onClick={() => setShowCreate(true)}
        className="w-full rounded-xl border border-dashed border-amber-400 px-4 py-3 font-medium text-amber-600"
      >
        + No estoy en la lista
      </button>
    </div>
  )
}
