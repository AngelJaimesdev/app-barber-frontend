import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Bell, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/store/auth.store'

const PAGE_TITLES: Record<string, string> = {
  '/client/explore': 'Explorar', '/client/appointments': 'Mis Citas', '/client/book': 'Detalle de Barbería',
  '/client/history': 'Historial', '/client/reviews': 'Reseñas', '/client/profile': 'Mi Perfil',
  '/barber/agenda': 'Mi Agenda', '/barber/clients': 'Mis Clientes',
  '/barber/services': 'Mis Servicios', '/barber/profile': 'Mi Perfil',
  '/owner/dashboard': 'Dashboard', '/owner/barbershop': 'Mi Barbería',
  '/owner/team': 'Barberos', '/owner/services': 'Servicios',
  '/owner/appointments': 'Citas', '/owner/promotions': 'Promociones',
  '/owner/inventory': 'Inventario', '/owner/reports': 'Reportes',
  '/admin/dashboard': 'Dashboard', '/admin/barbershops': 'Barberías',
  '/admin/barbers': 'Barberos', '/admin/services': 'Servicios',
  '/admin/appointments': 'Citas', '/admin/users': 'Usuarios',
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  const title = PAGE_TITLES[pathname] ?? 'BarberPro'

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main */}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Top Header */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0 sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Search - hidden on small mobile */}
            <div className="hidden sm:flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5">
              <Search size={15} className="text-dark-400" />
              <input
                className="bg-transparent text-sm text-white placeholder-dark-500 outline-none w-36"
                placeholder="Buscar..."
              />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold-500" />
            </button>

            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-dark-950 font-bold text-xs cursor-pointer">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
