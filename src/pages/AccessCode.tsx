import { useState, type FormEvent } from 'react'
import { useSession } from '../context/SessionContext'

export default function AccessCode() {
  const { submitCode } = useSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = submitCode(code)
    setError(!ok)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-12 text-center">
      <div className="text-5xl">🐝</div>
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Abejorros</h1>
        <p className="mt-1 text-neutral-500">Introduce el código de la comunidad para entrar</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(false)
          }}
          placeholder="Código de acceso"
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-lg tracking-wide outline-none focus:border-amber-400"
        />
        {error && <p className="text-sm text-red-500">Código incorrecto, inténtalo de nuevo.</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-amber-500 px-4 py-3 font-medium text-white active:bg-amber-600"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
