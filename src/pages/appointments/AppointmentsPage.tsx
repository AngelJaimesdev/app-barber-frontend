import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Filter, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { appointmentsApi } from '@/api/appointments.api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from '@/lib/utils'
import type { Appointment, AppointmentStatus } from '@/types'

const STATUS_FILTERS: Array<{ value: AppointmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]

export default function AppointmentsPage() {
  const [filter, setFilter] = useState<AppointmentStatus | 'ALL'>('ALL')
  const [detail, setDetail] = useState<Appointment | null>(null)
  const qc = useQueryClient()

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setDetail(null) },
  })

  if (isLoading) return <PageLoader />

  const filtered = filter === 'ALL' ? appointments : appointments?.filter((a) => a.status === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Citas</h2>
          <p className="text-dark-400 text-sm mt-0.5">{appointments?.length ?? 0} registradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-dark-400" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? 'gold-gradient text-dark-950'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white border border-dark-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {!filtered?.length ? (
        <div className="glass-card">
          <EmptyState icon={CalendarDays} title="Sin citas" description="No hay citas con este filtro" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Barbero</th>
                  <th>Fecha y hora</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((appt) => (
                  <tr key={appt.id}>
                    <td className="text-white font-medium">
                      {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
                      <p className="text-dark-500 text-xs font-normal">{appt.client?.email}</p>
                    </td>
                    <td>{appt.service?.name ?? '—'}</td>
                    <td>{appt.barber?.user ? `${appt.barber.user.firstName} ${appt.barber.user.lastName}` : '—'}</td>
                    <td className="whitespace-nowrap text-dark-300">{formatDateTime(appt.date)}</td>
                    <td>
                      <Badge className={STATUS_COLORS[appt.status]}>
                        {STATUS_LABELS[appt.status]}
                      </Badge>
                    </td>
                    <td>
                      <button
                        onClick={() => setDetail(appt)}
                        className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle de cita" className="max-w-md">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Cliente', value: detail.client ? `${detail.client.firstName} ${detail.client.lastName}` : '—' },
                { label: 'Barbero', value: detail.barber?.user ? `${detail.barber.user.firstName} ${detail.barber.user.lastName}` : '—' },
                { label: 'Servicio', value: detail.service?.name ?? '—' },
                { label: 'Fecha', value: formatDateTime(detail.date) },
                { label: 'Barbería', value: detail.barbershop?.name ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-dark-800 rounded-lg p-3">
                  <p className="text-dark-400 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-dark-400 text-xs mb-1">Estado</p>
                <Badge className={STATUS_COLORS[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
              </div>
            </div>

            {detail.notes && (
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-dark-400 text-xs mb-1">Notas</p>
                <p className="text-dark-200 text-sm">{detail.notes}</p>
              </div>
            )}

            {/* Status actions */}
            {!['COMPLETED', 'CANCELLED'].includes(detail.status) && (
              <div className="space-y-2 pt-2 border-t border-dark-700">
                <p className="text-dark-400 text-xs font-medium uppercase tracking-wide">Cambiar estado</p>
                <div className="flex gap-2 flex-wrap">
                  {detail.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: detail.id, status: 'CONFIRMED' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm hover:bg-blue-500/20 transition-colors"
                    >
                      <CheckCircle size={14} /> Confirmar
                    </button>
                  )}
                  {detail.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: detail.id, status: 'COMPLETED' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-sm hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle size={14} /> Completar
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus.mutate({ id: detail.id, status: 'CANCELLED' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
