import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import type { CommunityInfo } from '../types'

const STATUTES_BUCKET = 'documents'
const STATUTES_PATH = 'estatutos.pdf'

export default function Home() {
  const { profile: me } = useSession()
  const [info, setInfo] = useState<CommunityInfo | null>(null)
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isAdmin = !!me?.is_admin

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { data } = await supabase.from('community_info').select('*').eq('id', 1).maybeSingle()
    setInfo((data as CommunityInfo) ?? null)
  }

  function startEditing() {
    setEmail(info?.email ?? '')
    setBankAccount(info?.bank_account ?? '')
    setFile(null)
    setError(null)
    setEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let statutesPath = info?.statutes_path ?? null
      if (file) {
        const { error: uploadError } = await supabase.storage
          .from(STATUTES_BUCKET)
          .upload(STATUTES_PATH, file, { upsert: true })
        if (uploadError) throw uploadError
        statutesPath = STATUTES_PATH
      }

      const { data, error } = await supabase
        .from('community_info')
        .update({
          email: email.trim() || null,
          bank_account: bankAccount.trim() || null,
          statutes_path: statutesPath,
        })
        .eq('id', 1)
        .select()
        .single()

      if (error) throw error
      setInfo(data as CommunityInfo)
      setEditing(false)
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo guardar${detail ? `: ${detail}` : '. Inténtalo de nuevo.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyBankAccount() {
    if (!info?.bank_account) return
    try {
      await navigator.clipboard.writeText(info.bank_account)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // El navegador denegó el permiso de portapapeles; el número ya es visible para copiar a mano.
    }
  }

  async function handleDownloadStatutes() {
    if (!info?.statutes_path) return
    const { data, error } = await supabase.storage
      .from(STATUTES_BUCKET)
      .createSignedUrl(info.statutes_path, 60)
    if (!error && data) window.open(data.signedUrl, '_blank')
  }

  if (info === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  if (editing) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Editar información general</h1>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="text-left text-sm text-neutral-700">
            Email de contacto
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="comunidad@ejemplo.com"
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            Número de cuenta bancaria
            <input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="ES00 0000 0000 0000 0000 0000"
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            Estatutos (PDF)
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-700 outline-none focus:border-black"
            />
            {info.statutes_path && !file && (
              <span className="mt-1 block text-xs text-neutral-500">
                Ya hay un PDF subido. Selecciona uno nuevo solo si quieres reemplazarlo.
              </span>
            )}
          </label>
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-neutral-500">
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <p className="text-neutral-700">Hola,</p>
        <h1 className="text-2xl font-semibold text-neutral-900">{me?.name} 👋</h1>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">Información general</h2>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm">
          <span className="text-neutral-500">✉️ Email</span>
          {info.email ? (
            <a href={`mailto:${info.email}`} className="truncate font-semibold text-black underline">
              {info.email}
            </a>
          ) : (
            <span className="text-neutral-400">Sin definir</span>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">🏦 Cuenta bancaria</span>
            {info.bank_account && (
              <button onClick={handleCopyBankAccount} className="shrink-0 text-xs font-semibold text-black underline">
                {copied ? 'Copiado ✓' : 'Copiar'}
              </button>
            )}
          </div>
          <p className="mt-1 break-words font-medium text-neutral-900">
            {info.bank_account || 'Sin definir'}
          </p>
        </div>

        <button
          onClick={handleDownloadStatutes}
          disabled={!info.statutes_path}
          className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm disabled:opacity-50"
        >
          <span className="text-neutral-500">📄 Estatutos</span>
          <span className="font-semibold text-black underline">
            {info.statutes_path ? 'Descargar PDF' : 'No disponible'}
          </span>
        </button>
      </div>

      {isAdmin && (
        <button
          onClick={startEditing}
          className="w-full rounded-xl border-2 border-black px-4 py-3 font-medium text-black"
        >
          Editar información general
        </button>
      )}
    </div>
  )
}
