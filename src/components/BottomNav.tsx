import { NavLink } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

type NavItem = { to: string; label: string; icon: string; end?: boolean }

const BASE_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/cumpleanos', label: 'Cumples', icon: '🎂' },
  { to: '/eventos', label: 'Eventos', icon: '📅' },
  { to: '/miembros', label: 'Miembros', icon: '👥' },
]

const PROFILE_ITEM: NavItem = { to: '/perfil', label: 'Perfil', icon: '👤' }

export default function BottomNav() {
  const { profile } = useSession()
  const isAdmin = !!profile?.is_admin
  const canSeeTreasury = isAdmin || profile?.role_title === 'Tesorero'

  const middleItems: NavItem[] = [
    ...(canSeeTreasury ? [{ to: '/cuotas', label: 'Cuotas', icon: '💰' }] : []),
    ...(isAdmin ? [{ to: '/multas', label: 'Multas', icon: '🚨' }] : []),
  ]

  const visibleItems = [...BASE_ITEMS, ...middleItems, PROFILE_ITEM]

  return (
    <nav className="sticky bottom-0 flex border-t border-black/10 bg-white">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              isActive ? 'font-bold text-black' : 'text-neutral-400'
            }`
          }
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
