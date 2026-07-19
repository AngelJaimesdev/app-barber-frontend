import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays, Store, Scissors, Zap,
  TrendingUp, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { appointmentsApi } from '@/api/appointments.api'
import { barbershopsApi } from '@/api/barbershops.api'
import { barbersApi } from '@/api/barbers.api'
import { servicesApi } from '@/api/services.api'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const chartData = [
  { name: 'Lun', citas: 4 }, { name: 'Mar', citas: 7 },
  { name: 'Mié', citas: 5 }, { name: 'Jue', citas: 9 },
  { name: 'Vie', citas: 12 }, { name: 'Sáb', citas: 15 },
  { name: 'Dom', citas: 6 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })
  const { data: barbershops } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.getAll().then((r) => r.data.data),
  })
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll().then((r) => r.data.data),
  })

  if (loadingAppts) return <PageLoader />

  const todayAppts = appointments?.filter((a) => isToday(parseISO(a.date))) ?? []
  const confirmedToday = todayAppts.filter((a) => a.status === 'CONFIRMED').length
  const completedTotal = appointments?.filter((a) => a.status === 'COMPLETED').length ?? 0
  const pendingTotal = appointments?.filter((a) => a.status === 'PENDING').length ?? 0

  const stats = [
    {
      label: 'Citas hoy',
      value: todayAppts.length,
      icon: CalendarDays,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      sub: `${confirmedToday} confirmadas`,
    },
    {
      label: 'Barberías',
      value: barbershops?.length ?? 0,
      icon: Store,
      color: 'text-gold-400',
      bg: 'bg-gold-500/10',
      sub: 'Activas en plataforma',
    },
    {
      label: 'Barberos',
      value: barbers?.length ?? 0,
      icon: Scissors,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      sub: 'Profesionales activos',
    },
    {
      label: 'Servicios',
      value: services?.length ?? 0,
      icon: Zap,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      sub: 'Servicios disponibles',
    },
  ]

  const recent = appointments?.slice(0, 8) ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Buenos días, <span className="text-gold-gradient">{user?.firstName}</span> 👋
        </h2>
        <p className="text-dark-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <s.icon size={20} className={s.color} />
              </div>
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-dark-400 text-xs mt-0.5">{s.label}</p>
            </div>
            <p className="text-xs text-dark-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Citas esta semana</h3>
              <p className="text-dark-400 text-xs mt-0.5">Distribución por día</p>
            </div>
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
              +12% vs semana anterior
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9941a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9941a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="citas" stroke="#c9941a" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-white font-semibold">Resumen de citas</h3>
          <div className="space-y-3">
            {[
              { label: 'Completadas', value: completedTotal, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Pendientes', value: pendingTotal, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Canceladas', value: appointments?.filter((a) => a.status === 'CANCELLED').length ?? 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon size={16} className={item.color} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-dark-300">{item.label}</p>
                </div>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Barber pole decoration */}
          <div className="h-1 rounded-full barber-pole opacity-50 mt-4" />

          <p className="text-xs text-dark-500 text-center">Total acumulado</p>
          <p className="text-center text-2xl font-bold text-white">{appointments?.length ?? 0} <span className="text-dark-400 text-sm font-normal">citas</span></p>
        </div>
      </div>

      {/* Recent appointments */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Citas recientes</h3>
          <span className="text-xs text-dark-400">{appointments?.length ?? 0} total</span>
        </div>

        {recent.length === 0 ? (
          <div className="py-12 text-center text-dark-500">No hay citas registradas aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Barbero</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((appt) => (
                  <tr key={appt.id} className="transition-colors">
                    <td className="text-white font-medium">
                      {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
                    </td>
                    <td>{appt.service?.name ?? '—'}</td>
                    <td>{appt.barber?.user ? `${appt.barber.user.firstName} ${appt.barber.user.lastName}` : '—'}</td>
                    <td className="whitespace-nowrap">{formatDateTime(appt.date)}</td>
                    <td>
                      <Badge className={STATUS_COLORS[appt.status]}>
                        {STATUS_LABELS[appt.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
