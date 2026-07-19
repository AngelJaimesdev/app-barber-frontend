import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, User, CalendarDays, DollarSign, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { appointmentsApi } from '@/api/appointments.api'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime, formatCurrency } from '@/lib/utils'
import type { Appointment } from '@/types'

interface ClientGroup {
  client: Appointment['client']
  appointments: Appointment[]
  completed: number
  totalSpent: number
  lastVisit: string
}

export default function BarberClientsPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  if (isLoading) return <PageLoader />

  // Agrupar por cliente único
  const clientMap = new Map<string, ClientGroup>()
  for (const appt of appointments ?? []) {
    if (!appt.client) continue
    const existing = clientMap.get(appt.clientId)
    if (existing) {
      existing.appointments.push(appt)
      if (appt.status === 'COMPLETED') {
        existing.completed++
        existing.totalSpent += Number(appt.service?.price ?? 0)
      }
      if (new Date(appt.date) > new Date(existing.lastVisit)) existing.lastVisit = appt.date
    } else {
      clientMap.set(appt.clientId, {
        client: appt.client,
        appointments: [appt],
        completed: appt.status === 'COMPLETED' ? 1 : 0,
        totalSpent: appt.status === 'COMPLETED' ? Number(appt.service?.price ?? 0) : 0,
        lastVisit: appt.date,
      })
    }
  }

  const clients = Array.from(clientMap.values())
    .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Mis Clientes</h2>
        <p className="text-dark-400 text-sm mt-0.5">{clients.length} clientes atendidos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Clientes únicos', value: clients.length, color: 'text-blue-400' },
          { label: 'Citas completadas', value: clients.reduce((s, c) => s + c.completed, 0), color: 'text-green-400' },
          { label: 'Total facturado', value: formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0)), color: 'text-gold-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {!clients.length ? (
        <div className="glass-card">
          <EmptyState icon={Users} title="Sin clientes aún"
            description="Aquí aparecerán los clientes que hayas atendido" />
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((group) => {
            const isOpen = expanded === group.client?.id
            const initials = `${group.client?.firstName?.[0] ?? ''}${group.client?.lastName?.[0] ?? ''}`

            return (
              <div key={group.client?.id} className="glass-card overflow-hidden">
                {/* Client row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : group.client!.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-dark-800/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center text-dark-950 font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white font-semibold">
                      {group.client?.firstName} {group.client?.lastName}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-dark-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />{group.appointments.length} citas
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-green-400" />{group.completed} completadas
                      </span>
                      {group.totalSpent > 0 && (
                        <span className="flex items-center gap-1 text-gold-400 font-medium">
                          <DollarSign size={11} />{formatCurrency(group.totalSpent)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Frecuencia badge */}
                  {group.completed >= 3 && (
                    <span className="text-xs bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-full hidden sm:block">
                      ⭐ Frecuente
                    </span>
                  )}

                  {isOpen ? <ChevronUp size={16} className="text-dark-400 flex-shrink-0" />
                           : <ChevronDown size={16} className="text-dark-400 flex-shrink-0" />}
                </button>

                {/* Appointment history */}
                {isOpen && (
                  <div className="border-t border-dark-700">
                    <div className="px-4 py-2 bg-dark-800/30">
                      <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Historial de citas</p>
                    </div>
                    {group.appointments
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((appt, i) => (
                        <div key={appt.id}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            i < group.appointments.length - 1 ? 'border-b border-dark-800' : ''
                          }`}
                        >
                          <div className="text-center min-w-[52px]">
                            <p className="text-gold-400 font-bold text-lg leading-none">
                              {new Date(appt.date).getDate()}
                            </p>
                            <p className="text-dark-500 text-xs">
                              {new Date(appt.date).toLocaleString('es', { month: 'short' })}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{appt.service?.name ?? '—'}</p>
                            <p className="text-dark-500 text-xs">{formatDateTime(appt.date)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {appt.service?.price && (
                              <span className="text-dark-300 text-sm">{formatCurrency(appt.service.price)}</span>
                            )}
                            <Badge className={STATUS_COLORS[appt.status]}>
                              {STATUS_LABELS[appt.status]}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
