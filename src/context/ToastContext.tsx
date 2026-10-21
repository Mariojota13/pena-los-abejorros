import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// Mensajes breves de confirmación ("Evento creado ✓") que aparecen sobre la
// barra inferior y desaparecen solos a los pocos segundos.

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const timers = useRef<number[]>([])

  const showToast = useCallback((text: string) => {
    timers.current.forEach((t) => window.clearTimeout(t))
    setMessage(text)
    setVisible(true)
    timers.current = [
      window.setTimeout(() => setVisible(false), 2500),
      window.setTimeout(() => setMessage(null), 2800),
    ]
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-6"
        >
          <div
            className={`flex max-w-[440px] items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <span className="hex-cell flex h-5 w-5 shrink-0 items-center justify-center bg-[#EAE032] text-[11px] font-black text-black">
              ✓
            </span>
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
