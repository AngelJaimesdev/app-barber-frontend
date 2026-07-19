import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Store, Scissors, Zap, CalendarDays,
  Users, LogOut, ChevronLeft, ChevronRight, Menu,
  Home, Star, History, User, Package, Tag, BarChart3, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth.api'
import type { Role } from '@/types'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CLIENT: [
    { to: '/client/explore',      icon: Home,          label: 'Explorar' },
    { to: '/client/appointments', icon: CalendarDays,  label: 'Mis Citas' },
    { to: '/client/history',      icon: History,       label: 'Historial' },
    { to: '/client/reviews',      icon: Star,          label: 'Mis Reseñas' },
    { to: '/client/profile',      icon: User,          label: 'Mi Perfil' },
  ],
  BARBER: [
    { to: '/barber/agenda',   icon: CalendarDays, label: 'Mi Agenda' },
    { to: '/barber/clients',  icon: Users,        label: 'Mis Clientes' },
    { to: '/barber/services', icon: Zap,          label: 'Mis Servicios' },
    { to: '/barber/profile',  icon: User,         label: 'Mi Perfil' },
  ],
  OWNER: [
    { to: '/owner/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/owner/barbershop',   icon: Store,           label: 'Mi Barbería' },
    { to: '/owner/team',         icon: Scissors,        label: 'Barberos' },
    { to: '/owner/services',     icon: Zap,             label: 'Servicios' },
    { to: '/owner/appointments', icon: CalendarDays,    label: 'Citas' },
    { to: '/owner/promotions',   icon: Tag,             label: 'Promociones' },
    { to: '/owner/inventory',    icon: Package,         label: 'Inventario' },
    { to: '/owner/reports',      icon: BarChart3,       label: 'Reportes' },
  ],
  SUPER_ADMIN: [
    { to: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/barbershops',  icon: Store,           label: 'Barberías' },
    { to: '/admin/barbers',      icon: Scissors,        label: 'Barberos' },
    { to: '/admin/services',     icon: Zap,             label: 'Servicios' },
    { to: '/admin/appointments', icon: CalendarDays,    label: 'Citas' },
    { to: '/admin/users',        icon: Users,           label: 'Usuarios' },
  ],
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const navItems = NAV_BY_ROLE[user?.role ?? 'CLIENT']

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-screen bg-dark-900 border-r border-dark-700 z-40 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center h-16 border-b border-dark-700 px-4', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <Scissors size={16} className="text-dark-950" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-gold-gradient font-bold text-lg leading-none">BarberPro</span>
              <p className="text-dark-500 text-[10px] capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          )}
          <button onClick={onToggle} className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn('sidebar-item', isActive && 'sidebar-item-active', collapsed && 'justify-center px-2')
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && <div className="mx-4 my-2 h-1.5 rounded-full barber-pole opacity-40" />}

        {/* User info */}
        <div className={cn('p-4 border-t border-dark-700', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
