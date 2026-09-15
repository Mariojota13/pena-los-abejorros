import { useSession } from '../context/SessionContext'

export default function NoProfile() {
  const { signOut } = useSession()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-4xl">🤔</span>
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Tu cuenta no tiene un perfil asociado</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Has entrado correctamente, pero no encontramos ninguna ficha de miembro con tu email.
          Contacta con el administrador de la comunidad para que la cree.
        </p>
      </div>
      <button onClick={signOut} className="text-sm font-semibold text-black underline">
        Cerrar sesión
      </button>
    </div>
  )
}
