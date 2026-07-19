import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

// Auth
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Client
import ExplorePage           from '@/pages/client/ExplorePage'
import MyAppointmentsPage    from '@/pages/client/MyAppointmentsPage'
import BarbershopDetailPage  from '@/pages/client/BarbershopDetailPage'
import HistorialPage         from '@/pages/client/HistorialPage'
import ReviewsPage           from '@/pages/client/ReviewsPage'
import ProfilePage           from '@/pages/client/ProfilePage'

// Barber
import AgendaPage          from '@/pages/barber/AgendaPage'
import BarberProfilePage   from '@/pages/barber/BarberProfilePage'
import BarberClientsPage   from '@/pages/barber/BarberClientsPage'
import BarberServicesPage  from '@/pages/barber/BarberServicesPage'

// Owner
import OwnerDashboardPage   from '@/pages/owner/OwnerDashboardPage'
import OwnerBarbershopPage  from '@/pages/owner/OwnerBarbershopPage'
import OwnerPromotionsPage  from '@/pages/owner/OwnerPromotionsPage'
import OwnerInventoryPage   from '@/pages/owner/OwnerInventoryPage'
import OwnerReportsPage     from '@/pages/owner/OwnerReportsPage'

// Admin (reuse existing pages)
import DashboardPage    from '@/pages/dashboard/DashboardPage'
import BarbershopsPage  from '@/pages/barbershops/BarbershopsPage'
import BarbersPage      from '@/pages/barbers/BarbersPage'
import ServicesPage     from '@/pages/services/ServicesPage'
import AppointmentsPage from '@/pages/appointments/AppointmentsPage'
import UsersPage        from '@/pages/users/UsersPage'

import { useAuthStore } from '@/store/auth.store'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function RoleRedirect() {
  const { user } = useAuthStore()
  if (user?.role === 'CLIENT')      return <Navigate to="/client/explore" replace />
  if (user?.role === 'BARBER')      return <Navigate to="/barber/agenda" replace />
  if (user?.role === 'OWNER')       return <Navigate to="/owner/dashboard" replace />
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Auto-redirect based on role */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<RoleRedirect />} />
          </Route>

          {/* CLIENT routes */}
          <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/client/explore"          element={<ExplorePage />} />
              <Route path="/client/book/:id"         element={<BarbershopDetailPage />} />
              <Route path="/client/appointments"     element={<MyAppointmentsPage />} />
              <Route path="/client/history"      element={<HistorialPage />} />
              <Route path="/client/reviews"      element={<ReviewsPage />} />
              <Route path="/client/profile"      element={<ProfilePage />} />
            </Route>
          </Route>

          {/* BARBER routes */}
          <Route element={<ProtectedRoute allowedRoles={['BARBER']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/barber/agenda"   element={<AgendaPage />} />
              <Route path="/barber/clients"  element={<BarberClientsPage />} />
              <Route path="/barber/services" element={<BarberServicesPage />} />
              <Route path="/barber/profile"  element={<BarberProfilePage />} />
            </Route>
          </Route>

          {/* OWNER routes */}
          <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/owner/dashboard"    element={<OwnerDashboardPage />} />
              <Route path="/owner/barbershop"   element={<OwnerBarbershopPage />} />
              <Route path="/owner/team"         element={<BarbersPage />} />
              <Route path="/owner/services"     element={<ServicesPage />} />
              <Route path="/owner/appointments" element={<AppointmentsPage />} />
              <Route path="/owner/promotions"   element={<OwnerPromotionsPage />} />
              <Route path="/owner/inventory"    element={<OwnerInventoryPage />} />
              <Route path="/owner/reports"      element={<OwnerReportsPage />} />
            </Route>
          </Route>

          {/* SUPER_ADMIN routes */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard"    element={<DashboardPage />} />
              <Route path="/admin/barbershops"  element={<BarbershopsPage />} />
              <Route path="/admin/barbers"      element={<BarbersPage />} />
              <Route path="/admin/services"     element={<ServicesPage />} />
              <Route path="/admin/appointments" element={<AppointmentsPage />} />
              <Route path="/admin/users"        element={<UsersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
