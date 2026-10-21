import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { AlertIcon, CakeIcon, CalendarIcon, HomeIcon, UserIcon, UsersIcon, WalletIcon } from './Icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>
type NavItem = { to: string; label: string; icon: Icon; end?: boolean }

const BASE_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/cumpleanos', label: 'Cumples', icon: CakeIcon },
  { to: '/eventos', label: 'Eventos', icon: CalendarIcon },
  { to: '/miembros', label: 'Miembros', icon: UsersIcon },
]

const PROFILE_ITEM: NavItem = { to: '/perfil', label: 'Perfil', icon: UserIcon }

export default function BottomNav() {
  const { profile } = useSession()
  const isAdmin = !!profile?.is_admin
  const canSeeTreasury = isAdmin || profile?.role_title === 'Tesorero'

  const middleItems: NavItem[] = [
    ...(canSeeTreasury ? [{ to: '/cuotas', label: 'Cuotas', icon: WalletIcon }] : []),
    ...(isAdmin ? [{ to: '/multas', label: 'Multas', icon: AlertIcon }] : []),
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
            `flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 pt-2 pb-2.5 text-[10px] ${
              isActive ? 'font-bold text-black' : 'text-neutral-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-[#EAE032]' : ''
                }`}
              >
                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
