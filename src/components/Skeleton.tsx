import beeMark from '../assets/bee-mark.png'

// Pantallas de carga: bloques grises que imitan la forma del contenido
// mientras llegan los datos, en lugar de un simple "Cargando…".

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-black/10 ${className}`} />
}

export function PageSkeleton({ cards = 4, withAvatar = false }: { cards?: number; withAvatar?: boolean }) {
  return (
    <div className="flex flex-1 animate-pulse flex-col gap-4 px-6 py-8" aria-busy="true" aria-label="Cargando">
      <Bar className="h-7 w-40" />
      <Bar className="mt-2 h-3 w-24" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/70 px-4 py-4">
            {withAvatar && <div className="hex-cell h-10 w-10 shrink-0 bg-black/10" />}
            <div className="flex flex-1 flex-col gap-2">
              <Bar className="h-4 w-1/2" />
              <Bar className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SplashScreen() {
  return (
    <div className="flex flex-1 items-center justify-center" aria-busy="true" aria-label="Cargando">
      <img src={beeMark} alt="" className="h-20 w-auto animate-pulse" />
    </div>
  )
}
