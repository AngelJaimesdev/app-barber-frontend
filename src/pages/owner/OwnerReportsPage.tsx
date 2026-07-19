import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  DollarSign, CalendarDays, TrendingUp, Scissors,
  Target, Users, BarChart3,
} from 'lucide-react'
import { barbershopsApi } from '@/api/barbershops.api'
import { appointmentsApi } from '@/api/appointments.api'
import { barbersApi } from '@/api/barbers.api'
import { useAuthStore } from '@/store/auth.store'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import {
  startOfWeek, startOfMonth, isAfter, parseISO, format, getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Appointment } from '@/types'

/* ─── Period filter ───────────────────────────────────────────── */
type Period = 'week' | 'month' | 'all'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all',   label: 'Todo el tiempo' },
]

function filterByPeriod(appts: Appointment[], period: Period) {
  if (period === 'all') return appts
  const now = new Date()
  const from = period === 'week'
    ? startOfWeek(now, { weekStartsOn: 1 })
    : startOfMonth(now)
  return appts.filter((a) => isAfter(parseISO(a.date), from))
}

/* ─── Chart tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-dark-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name === 'Ingresos' ? formatCurrency(p.value) : p.value} {p.name !== 'Ingresos' && p.name}
        </p>
      ))}
    </div>
  )
}

/* ─── KPI card ────────────────────────────────────────────────── */
function KpiCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: string | number; icon: React.ElementType
  color: string; bg: string; sub?: string
}) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={color} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold ${color} truncate`}>{value}</p>
        <p className="text-dark-400 text-xs mt-0.5">{label}</p>
        {sub && <p className="text-dark-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Days of week map ────────────────────────────────────────── */
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#6b7280']

/* ─── Main page ───────────────────────────────────────────────── */
export default function OwnerReportsPage() {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<Period>('month')

  /* Queries */
  const { data: barbershops, isLoading: loadingShop } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const shop = barbershops?.find((b) => b.ownerId === user?.id)

  const { data: allAppts, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  const { data: barbers } = useQuery({
    queryKey: ['barbers', shop?.id],
    queryFn: () => barbersApi.getAll(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  const { data: apiReports } = useQuery({
    queryKey: ['reports', shop?.id],
    queryFn: () => barbershopsApi.getReports(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  /* ── Derived metrics ── */
  const metrics = useMemo(() => {
    if (!allAppts || !shop) return null

    const shopAppts = allAppts.filter((a) => a.barbershopId === shop.id)
    const filtered  = filterByPeriod(shopAppts, period)

    const completed  = filtered.filter((a) => a.status === 'COMPLETED')
    const cancelled  = filtered.filter((a) => a.status === 'CANCELLED')
    const pending    = filtered.filter((a) => a.status === 'PENDING')
    const confirmed  = filtered.filter((a) => a.status === 'CONFIRMED')
    const noShow     = filtered.filter((a) => a.status === 'NO_SHOW')

    const revenue    = completed.reduce((s, a) => s + (a.service?.price ?? 0), 0)
    const avgTicket  = completed.length ? revenue / completed.length : 0
    const successRate = filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0

    /* By day of week */
    const dowMap: Record<number, { citas: number; revenue: number }> = {}
    for (let i = 0; i < 7; i++) dowMap[i] = { citas: 0, revenue: 0 }
    for (const a of completed) {
      const d = getDay(parseISO(a.date))
      dowMap[d].citas++
      dowMap[d].revenue += a.service?.price ?? 0
    }
    const dowData = DOW.map((name, i) => ({
      name,
      Citas:    dowMap[i].citas,
      Ingresos: dowMap[i].revenue,
    }))

    /* By barber */
    const barberMap: Record<string, { name: string; completed: number; revenue: number }> = {}
    for (const a of completed) {
      const bid = a.barber?.id ?? 'unknown'
      if (!barberMap[bid]) {
        barberMap[bid] = {
          name: a.barber?.user ? `${a.barber.user.firstName} ${a.barber.user.lastName}` : 'Desconocido',
          completed: 0,
          revenue: 0,
        }
      }
      barberMap[bid].completed++
      barberMap[bid].revenue += a.service?.price ?? 0
    }
    const barberData = Object.values(barberMap).sort((a, b) => b.completed - a.completed)

    /* Pie data */
    const pieData = [
      { name: 'Completadas', value: completed.length },
      { name: 'Pendientes',  value: pending.length },
      { name: 'Canceladas',  value: cancelled.length },
      { name: 'Confirmadas', value: confirmed.length },
      { name: 'No asistió',  value: noShow.length },
    ].filter((d) => d.value > 0)

    return {
      total: filtered.length, completed: completed.length,
      cancelled: cancelled.length, revenue, avgTicket, successRate,
      dowData, barberData, pieData,
    }
  }, [allAppts, shop, period])

  if (loadingShop || loadingAppts) return <PageLoader />
  if (!shop || !metrics) return (
    <div className="glass-card py-16 text-center">
      <BarChart3 size={40} className="text-dark-600 mx-auto mb-4" />
      <p className="text-white font-semibold">Sin datos disponibles</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Reportes</h2>
          <p className="text-dark-400 text-sm mt-0.5">{shop.name}</p>
        </div>
        {/* Period filter */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                period === p.key
                  ? 'gold-gradient text-dark-950 border-transparent'
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-white',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ingresos"         value={formatCurrency(metrics.revenue)}  icon={DollarSign}  color="text-gold-400"   bg="bg-gold-500/10"   />
        <KpiCard label="Citas totales"    value={metrics.total}                     icon={CalendarDays} color="text-blue-400"  bg="bg-blue-500/10"  />
        <KpiCard label="Completadas"      value={metrics.completed}                 icon={TrendingUp}   color="text-green-400" bg="bg-green-500/10" sub={`${metrics.successRate}% de éxito`} />
        <KpiCard label="Ticket promedio"  value={formatCurrency(metrics.avgTicket)} icon={Target}       color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Bar chart — citas por día */}
        <div className="xl:col-span-2 glass-card p-5">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-gold-500" />
            Citas completadas por día de la semana
          </h3>
          {metrics.completed === 0 ? (
            <div className="h-44 flex items-center justify-center">
              <p className="text-dark-500 text-sm">Sin citas completadas en este período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.dowData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="Citas" fill="#c9941a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — estado */}
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <CalendarDays size={16} className="text-gold-500" />
            Estado de citas
          </h3>
          {metrics.total === 0 ? (
            <div className="h-44 flex items-center justify-center">
              <p className="text-dark-500 text-sm">Sin datos</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={metrics.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    dataKey="value" paddingAngle={3}>
                    {metrics.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {metrics.pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-dark-400 text-xs">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-medium">{d.value}</span>
                      <span className="text-dark-600 text-xs">
                        {Math.round((d.value / metrics.total) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barber performance */}
      {metrics.barberData.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
            <Users size={16} className="text-gold-500" />
            <h3 className="text-white font-semibold">Rendimiento por barbero</h3>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Barbero</th>
                <th>Citas completadas</th>
                <th>Ingresos generados</th>
                <th>% del total</th>
              </tr>
            </thead>
            <tbody>
              {metrics.barberData.map((b, i) => (
                <tr key={b.name}>
                  <td>
                    <span className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-dark-950">
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-dark-950 text-xs font-bold flex-shrink-0">
                        {b.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-white font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-green-400 font-semibold">{b.completed}</span>
                  </td>
                  <td>
                    <span className="text-gold-400 font-semibold">{formatCurrency(b.revenue)}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-700 rounded-full max-w-[80px]">
                        <div
                          className="h-full bg-gold-500 rounded-full"
                          style={{ width: `${metrics.completed ? Math.round((b.completed / metrics.completed) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-dark-400 text-xs">
                        {metrics.completed ? Math.round((b.completed / metrics.completed) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top services */}
      {apiReports?.topServices?.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
            <Scissors size={16} className="text-gold-500" />
            <h3 className="text-white font-semibold">Servicios más solicitados</h3>
            <span className="text-dark-500 text-xs ml-1">(histórico total)</span>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr><th>#</th><th>Servicio</th><th>Citas</th><th>Precio</th><th>Ingreso estimado</th></tr>
            </thead>
            <tbody>
              {apiReports.topServices.map((s: any, i: number) => (
                <tr key={s.serviceId}>
                  <td>
                    <span className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-dark-950">
                      {i + 1}
                    </span>
                  </td>
                  <td className="text-white font-medium">{s.name}</td>
                  <td><span className="text-blue-400 font-semibold">{s.count}</span></td>
                  <td className="text-dark-300">{formatCurrency(s.price)}</td>
                  <td className="text-gold-400 font-semibold">{formatCurrency(s.price * s.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
