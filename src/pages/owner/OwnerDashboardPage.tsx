import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Scissors, Zap, TrendingUp, DollarSign, BarChart3, Package, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { barbershopsApi } from '@/api/barbershops.api'
import { appointmentsApi } from '@/api/appointments.api'
import { barbersApi } from '@/api/barbers.api'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const weekData = [
  { name: 'Lun', citas: 4 }, { name: 'Mar', citas: 7 }, { name: 'Mié', citas: 5 },
  { name: 'Jue', citas: 9 }, { name: 'Vie', citas: 12 }, { name: 'Sáb', citas: 15 }, { name: 'Dom', citas: 3 },
]
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6']

export default function OwnerDashboardPage() {
  const { user } = useAuthStore()

  const { data: barbershops, isLoading } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })
  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.getAll().then((r) => r.data.data),
  })

  const myShop = barbershops?.find((b) => b.ownerId === user?.id)

  const { data: reports } = useQuery({
    queryKey: ['reports', myShop?.id],
    queryFn: () => barbershopsApi.getReports(myShop!.id).then((r) => r.data.data),
    enabled: !!myShop?.id,
  })

  if (isLoading) return <PageLoader />

  const pieData = [
    { name: 'Completadas', value: reports?.completed ?? 0 },
    { name: 'Pendientes', value: reports?.pending ?? 0 },
    { name: 'Canceladas', value: reports?.cancelled ?? 0 },
    { name: 'Confirmadas', value: reports?.confirmed ?? 0 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Bienvenido, <span className="text-gold-gradient">{user?.firstName}</span>
        </h2>
        <p className="text-dark-400 text-sm mt-0.5">{myShop?.name ?? 'Tu barbería'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total citas', value: reports?.total ?? 0, icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Ingresos', value: formatCurrency(reports?.revenue ?? 0), icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-500/10' },
          { label: 'Barberos', value: barbers?.length ?? 0, icon: Scissors, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Completadas', value: reports?.completed ?? 0, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-dark-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="xl:col-span-2 glass-card p-5">
          <h3 className="text-white font-semibold mb-5">Citas esta semana</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9941a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9941a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="citas" stroke="#c9941a" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold mb-5">Estado de citas</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-dark-400 text-xs">{d.name}</span>
                </div>
                <span className="text-white text-xs font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top services */}
      {reports?.topServices?.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700">
            <h3 className="text-white font-semibold">Servicios más solicitados</h3>
          </div>
          <table className="w-full data-table">
            <thead><tr><th>Servicio</th><th>Citas</th><th>Precio</th></tr></thead>
            <tbody>
              {reports.topServices.map((s: any, i: number) => (
                <tr key={s.serviceId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-dark-950">{i + 1}</span>
                      <span className="text-white font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td><span className="text-gold-400 font-semibold">{s.count} citas</span></td>
                  <td className="text-dark-300">{formatCurrency(s.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
