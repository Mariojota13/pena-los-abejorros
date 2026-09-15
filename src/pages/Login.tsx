import { useState, type FormEvent } from 'react'
import { useSession } from '../context/SessionContext'
import logo from '../assets/logo.jpeg'

export default function Login() {
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await login(email.trim(), password)
    if (error) setError(error)
    setLoading(false)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-[#EAE032] px-6 py-10">
      <img src={logo} alt="Peña Los Abejorros" className="w-full max-w-[280px] object-cover" />

      <form onSubmit={handleSubmit} className="flex w-full max-w-[340px] flex-col gap-3 text-left">
        <div className="flex h-12 items-center gap-2 rounded-xl border border-black/15 bg-white px-4 shadow-sm">
          <span className="text-sm">✉️</span>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            placeholder="Email"
            className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex h-12 items-center gap-2 rounded-xl border border-black/15 bg-white px-4 shadow-sm">
          <span className="text-sm">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            placeholder="Contraseña"
            className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 text-sm"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <p className="text-sm font-medium text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 items-center justify-center rounded-xl bg-black font-bold tracking-wide text-white active:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'ENTRANDO…' : 'ENTRAR'}
        </button>

        <p className="mt-1 text-center text-sm text-neutral-800">
          ¿No tienes cuenta?{' '}
          <span className="font-bold text-black underline">Pídesela al administrador</span>
        </p>
      </form>

      <div className="mt-2 flex flex-col items-center gap-1.5">
        <div className="hex-cell h-6 w-6 bg-black/80" />
        <p className="text-xs font-medium text-neutral-800">Peña los Abejorros</p>
      </div>
    </div>
  )
}
