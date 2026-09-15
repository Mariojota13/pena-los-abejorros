import { useEffect, useState, type FormEvent } from 'react'
import { supabase, callEdgeFunction } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { supabaseErrorMessage } from '../lib/errors'
import { AVATARS_BUCKET, avatarUrl } from '../lib/avatar'
import type { Profile } from '../types'
import { ROLE_OPTIONS } from '../lib/roles'

const NO_ROLE = 'Sin cargo asignado'

export default function Members() {
  const { profile: me } = useSession()
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthday, setBirthday] = useState('')
  const [memberSinceYear, setMemberSinceYear] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [isAdminChecked, setIsAdminChecked] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isAdmin = !!me?.is_admin

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('name')
    if (!error && data) setProfiles(data as Profile[])
    else setProfiles([])
  }

  function startEditing(p: Profile) {
    setEditing(p)
    setCreating(false)
    setName(p.name)
    setNickname(p.nickname ?? '')
    setEmail(p.email ?? '')
    setBirthday(p.birthday ?? '')
    setMemberSinceYear(p.member_since_year?.toString() ?? '')
    setRoleTitle(p.role_title ?? '')
    setIsAdminChecked(p.is_admin)
    setAvatarFile(null)
    setAvatarPreview(null)
    setError(null)
    setConfirmingDelete(false)
  }

  function startCreating() {
    setCreating(true)
    setEditing(null)
    setName('')
    setNickname('')
    setEmail('')
    setPassword('')
    setBirthday('')
    setMemberSinceYear('')
    setRoleTitle('')
    setIsAdminChecked(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setError(null)
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
    if (!email.trim()) {
      setError('El email es obligatorio.')
      return
    }
    if (creating && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (creating && !birthday) {
      setError('La fecha de cumpleaños es obligatoria.')
      return
    }
    if (creating && !memberSinceYear.trim()) {
      setError('El año de "Abejorro desde" es obligatorio.')
      return
    }
    if (creating && !roleTitle.trim()) {
      setError('El cargo es obligatorio.')
      return
    }
    const yearTrimmed = memberSinceYear.trim()
    const currentYear = new Date().getFullYear()
    if (yearTrimmed && (!/^\d{4}$/.test(yearTrimmed) || Number(yearTrimmed) > currentYear)) {
      setError(`Introduce un año válido (entre 1900 y ${currentYear}).`)
      return
    }
    const memberSinceValue = yearTrimmed ? Number(yearTrimmed) : null
    setSaving(true)
    setError(null)
    try {
      if (creating) {
        await callEdgeFunction('create-member', {
          name: name.trim(),
          nickname: nickname.trim() || null,
          email: email.trim().toLowerCase(),
          password,
          birthday: birthday || null,
          memberSinceYear: memberSinceValue,
          roleTitle: roleTitle.trim() || null,
        })
      } else if (editing) {
        let avatarPath = editing.avatar_path
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop() || 'jpg'
          const path = `${editing.id}/avatar.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(AVATARS_BUCKET)
            .upload(path, avatarFile, { upsert: true })
          if (uploadError) throw uploadError
          avatarPath = path
        }
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            nickname: nickname.trim() || null,
            email: email.trim().toLowerCase(),
            birthday: birthday || null,
            member_since_year: memberSinceValue,
            role_title: roleTitle.trim() || null,
            is_admin: isAdminChecked,
            avatar_path: avatarPath,
          })
          .eq('id', editing.id)
        if (error) throw error
      }
      setEditing(null)
      setCreating(false)
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(
        creating
          ? `No se pudo crear${detail ? `: ${detail}` : '. Comprueba que el email no esté ya en uso.'}`
          : `No se pudo guardar${detail ? `: ${detail}` : '. Inténtalo de nuevo.'}`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setDeleting(true)
    setError(null)
    try {
      await callEdgeFunction('delete-member', { profileId: editing.id })
      setEditing(null)
      setConfirmingDelete(false)
      await load()
    } catch (err) {
      const detail = supabaseErrorMessage(err)
      setError(`No se pudo eliminar${detail ? `: ${detail}` : '.'}`)
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (profiles === null) {
    return <div className="flex flex-1 items-center justify-center text-neutral-600">Cargando…</div>
  }

  if (creating || editing) {
    const previewSrc = avatarPreview ?? (editing ? avatarUrl(editing.avatar_path) : null)

    return (
      <div className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          {creating ? 'Añadir miembro' : `Editar a ${editing!.name}`}
        </h1>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {editing && (
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
          )}
          <label className="text-left text-sm text-neutral-700">
            Nombre{creating && ' *'}
            <input
              autoFocus
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
            Email{creating && ' *'}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@ejemplo.com"
              disabled={!creating && !!editing?.auth_user_id}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black disabled:opacity-50"
            />
          </label>
          {creating && (
            <label className="text-left text-sm text-neutral-700">
              Contraseña inicial *
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                Compártesela al nuevo miembro por el canal que prefieras. Podrá cambiarla luego desde su Perfil.
              </span>
            </label>
          )}
          <label className="text-left text-sm text-neutral-700">
            Fecha de cumpleaños{creating && ' *'}
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            🐝 Abejorro desde (año){creating && ' *'}
            <input
              type="number"
              inputMode="numeric"
              value={memberSinceYear}
              onChange={(e) => setMemberSinceYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
              className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black"
            />
          </label>
          <label className="text-left text-sm text-neutral-700">
            Cargo{creating && ' *'}
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
          {editing && (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={isAdminChecked}
                  disabled={editing.id === me?.id}
                  onChange={(e) => setIsAdminChecked(e.target.checked)}
                  className="h-4 w-4 accent-black"
                />
                Administrador
              </label>
              {editing.id === me?.id && (
                <p className="text-xs text-neutral-500">
                  No puedes quitarte el rol de administrador a ti mismo. Pídeselo a otro admin.
                </p>
              )}
            </>
          )}
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white active:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setCreating(false)
            }}
            className="text-sm text-neutral-500"
          >
            Cancelar
          </button>
        </form>

        {editing && editing.id !== me?.id && (
          <div className="flex flex-col gap-2 border-t border-black/10 pt-6">
            {confirmingDelete ? (
              <>
                <p className="text-sm text-neutral-700">
                  ¿Seguro que quieres eliminar a {editing.name}? Se borrará también su cuenta de acceso y todos
                  sus datos (cuotas, multas, sanciones). Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white active:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="flex-1 rounded-xl border border-black/15 px-4 py-3 text-neutral-700"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full rounded-xl border-2 border-red-600 px-4 py-3 font-semibold text-red-600 active:bg-red-50"
              >
                Eliminar miembro
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const groups = new Map<string, Profile[]>()
  for (const p of profiles) {
    const key = p.role_title?.trim() || NO_ROLE
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const roleNames = [...groups.keys()].filter((k) => k !== NO_ROLE).sort((a, b) => a.localeCompare(b))
  const orderedGroups = groups.has(NO_ROLE) ? [...roleNames, NO_ROLE] : roleNames

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">👥 Miembros</h1>
        {isAdmin && (
          <button onClick={startCreating} className="text-sm font-semibold text-black underline">
            + Añadir
          </button>
        )}
      </div>

      {isAdmin && (
        <p className="text-xs text-neutral-500">
          Eres administrador: toca a cualquier miembro para editar su nombre, cumpleaños o cargo.
        </p>
      )}

      {profiles.length === 0 && (
        <p className="text-center text-sm text-neutral-600">Todavía no hay miembros registrados.</p>
      )}

      <div className="flex flex-col gap-5">
        {orderedGroups.map((role) => (
          <div key={role}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
              {role} · {groups.get(role)!.length}
            </p>
            <div className="flex flex-col gap-2">
              {groups.get(role)!.map((p) => {
                const photo = avatarUrl(p.avatar_path)
                return (
                  <div
                    key={p.id}
                    onClick={isAdmin ? () => startEditing(p) : undefined}
                    className={`flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm ${
                      isAdmin ? 'cursor-pointer active:bg-black/5' : ''
                    }`}
                  >
                    {photo ? (
                      <img src={photo} alt="" className="hex-cell h-10 w-10 shrink-0 object-cover" />
                    ) : (
                      <div className="hex-cell flex h-10 w-10 shrink-0 items-center justify-center bg-black text-sm font-bold text-white">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {p.name}
                        {p.nickname && <span className="text-neutral-500"> "{p.nickname}"</span>}
                        {p.id === me?.id && <span className="text-neutral-500"> (tú)</span>}
                        {p.is_admin && <span className="ml-1 text-xs font-semibold text-black">🔑 admin</span>}
                        {!p.auth_user_id && (
                          <span className="ml-1 text-xs text-neutral-400">· sin activar</span>
                        )}
                      </p>
                      {p.member_since_year && (
                        <p className="text-xs text-neutral-500">🐝 Abejorro desde {p.member_since_year}</p>
                      )}
                    </div>
                    {isAdmin && <span className="text-neutral-400">›</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
