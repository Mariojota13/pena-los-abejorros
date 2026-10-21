import { Link } from 'react-router-dom'
import beeMark from '../assets/bee-mark.png'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b-2 border-black bg-[#EAE032]">
      <Link to="/" className="flex items-center gap-3 px-5 py-2.5" aria-label="Ir a Inicio">
        <img src={beeMark} alt="" className="h-10 w-auto" />
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/70">Peña</span>
          <span className="text-lg font-black uppercase tracking-wide text-black">Los Abejorros</span>
        </span>
      </Link>
    </header>
  )
}
