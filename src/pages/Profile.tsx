import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { AVATARS_BUCKET, avatarUrl } from '../lib/avatar'
import DuesProgress from '../components/DuesProgress'
import { ROLE_OPTIONS } from '../lib/roles'
import type { Due, CommunityInfo, Fine, Sanction } from '../types'

function severityClasses(severity: Sanction['severity']) {
  if (severity === 'muy grave') return 'bg-red-100 text-red-700'
  if (severity === 'grave') return 'bg-orange-100 text-orange-700'
  return 'bg-yellow-100 text-yellow-800'
}

function formatDate(date: string | null) {
  if (!date) return null
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

export default function Profile() {
  const { profile, updateProfile, changePassword, signOut } = useSession()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [birthday, setBirthday] = useState(profile?.birthday ?? '')
  const [memberSinceYear, setMemberSinceYear] = useState(profile?.member_since_year?.toString() ?? '')
  const [roleTitle, setRoleTitle] = useState(profile?.role_title ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordDone, setPasswordDone] = useState(false)

  const [dues, setDues] = useState<Due[] | null>(null)
  const [duesTarget, setDuesTarget] = useState<number | null>(null)
  const [fines, setFines] = useState<Fine[] | null>(null)
  const [sanctions, setSanctions] = useState<Sanction[] | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('dues')
      .select('*')
      .eq('profile_id', profile.id)
      .order('paid_on', { ascending: false })
      .then(({ data }) => setDues((data as Due[]) ?? []))
    supabase
      .from('community_info')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setDuesTarget((data as CommunityInfo | null)?.dues_target ?? null))
    supabase
      .from('fines')
      .select('*')
      .eq('profile_id', profile.id)
      .order('issued_on', { ascending: false })
      .then(({ data }) => setFines((data as Fine[]) ?? []))
    supabase
      .from('sanctions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('issued_on', { ascending: false })
      .then(({ data }) => setSanctions((data as Sanction[]) ?? []))
  }, [profile?.id])

  if (!profile) return null

  function startEditing() {
    setName(profile!.name)
    setNickname(profile!.nickname ?? '')
    setBirthday(profile!.birthday ?? '')
    setMemberSinceYear(profile!.member_since_year?.toString() ?? '')
    setRoleTitle(profile!.role_title ?? '')
    setAvatarFile(null)
    setAvatarPreview(null)
    setError(null)
    setEditing(true)
  }

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const yearTrimmed = memberSinceYear.trim()
    const currentYear = new Date().getFullYear()
    if (yearTrimmed && (!/^\d{4}$/.test(yearTrimmed) || Number(yearTrimmed) > currentYear)) {
      setError(`Introduce un año válido (entre 1900 y ${currentYear}).`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      let avatarPath = profile!.avatar_path
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const path = `${profile!.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(AVATARS_BUCKET)
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        avatarPath = path
      }
      await updateProfile({
        name: name.trim(),
        nickname,
        birthday,
        memberSinceYear,
        avatarPath,
        ...(profile!.is_admin ? { roleTitle } : {}),
      })
      setEditing(false)
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo guardar${detail ? `: ${detail}` : '. Inténtalo de nuevo.'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setPasswordSaving(true)
    setPasswordError(null)
    const { error } = await changePassword(newPassword)
    if (error) {
      setPasswordError(error)
    } else {
      setNewPassword('')
      setChangingPassword(false)
      setPasswordDone(true)
      setTimeout(() => setPasswordDone(false), 2000)
    }
    setPasswordSaving(false)
  }

  if (changingPassword) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Cambiar contraseña</h1>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <label className="text-left text-sm text-neutral-700">
            Nueva contraseña
            <input
              autoFocus
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setPasswordError(null)
              }}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
          </label>
          {passwordError && <p className="text-sm font-medium text-red-700">{passwordError}</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
          >
            {passwordSaving ? 'Guardando…' : 'Guardar contraseña'}
          </button>
          <button type="button" onClick={() => setChangingPassword(false)} className="text-sm text-neutral-500">
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  if (editing) {
    const previewSrc = avatarPreview ?? avatarUrl(profile.avatar_path)

    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Editar perfil</h1>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-2">
            {previewSrc ? (
              <img src={previewSrc} alt="" className="hex h-20 w-20 object-cover" />
            ) : (
              <div className="hex flex h-20 w-20 items-center justify-center bg-black text-2xl font-bold text-white">
                {name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <label className="text-sm font-semibold text-black underline">
              Cambiar foto
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>
          <label className="text-left text-sm text-neutral-700">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            Apodo (opcional)
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. Pitufo, Chispas…"
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            Fecha de cumpleaños
            <input
              type="date"
              value={birthday ?? ''}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            🐝 Abejorro desde (año)
            <input
              type="number"
              inputMode="numeric"
              value={memberSinceYear}
              onChange={(e) => setMemberSinceYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
          </label>
          {profile.is_admin && (
            <label className="text-left text-sm text-neutral-700">
              Cargo
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
              >
                <option value="">Selecciona un cargo…</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {roleTitle && !ROLE_OPTIONS.includes(roleTitle) && (
                  <option value={roleTitle}>{roleTitle} (actual)</option>
                )}
              </select>
            </label>
          )}
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

  const photoSrc = avatarUrl(profile.avatar_path)

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="hex h-20 w-20 object-cover" />
        ) : (
          <div className="hex flex h-20 w-20 items-center justify-center bg-black text-2xl font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {profile.name}
            {profile.nickname && <span className="text-neutral-500"> "{profile.nickname}"</span>}
          </h1>
          <p className="text-neutral-500">{profile.role_title ?? 'Sin rol asignado'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-neutral-500">🎂 Cumpleaños</span>
          <span className="font-medium text-neutral-900">{formatDate(profile.birthday) ?? 'Sin fecha guardada'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-black/10 py-1 pt-3">
          <span className="text-neutral-500">🐝 Abejorro desde</span>
          <span className="font-medium text-neutral-900">{profile.member_since_year ?? 'Sin definir'}</span>
        </div>
      </div>

      {dues && (dues.length > 0 || duesTarget) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">💰 Mis cuotas</h2>
          <div className="rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm">
            <DuesProgress paid={dues.reduce((sum, d) => sum + Number(d.amount), 0)} target={duesTarget} />
          </div>
          {dues.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">{d.concept}</p>
                <p className="text-sm text-neutral-500">{formatDate(d.paid_on)}</p>
              </div>
              <span className="font-medium text-neutral-900">{Number(d.amount).toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}

      {fines && fines.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">🚨 Mis multas</h2>
          {fines.map((f) => (
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
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  f.status === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {f.status === 'pagada' ? 'Pagada ✓' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      )}

      {sanctions && sanctions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-600">🚨 Mis sanciones</h2>
          {sanctions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">{s.reason}</p>
                <p className="text-sm text-neutral-500">{formatDate(s.issued_on)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${severityClasses(s.severity)}`}>
                {s.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={startEditing}
        className="w-full rounded-xl border-2 border-black px-4 py-3 font-medium text-black"
      >
        Editar mi perfil
      </button>
      <button
        onClick={() => setChangingPassword(true)}
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-medium text-neutral-800 shadow-sm"
      >
        {passwordDone ? 'Contraseña actualizada ✓' : 'Cambiar contraseña'}
      </button>
      <button onClick={signOut} className="mt-auto text-sm text-neutral-500 underline">
        Cerrar sesión
      </button>
    </div>
  )
}
