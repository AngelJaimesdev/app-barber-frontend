import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, MapPin, User, DollarSign, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { appointmentsApi } from '@/api/appointments.api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime, formatCurrency } from '@/lib/utils'
import type { Appointment } from '@/types'
import ReviewModal from './ReviewModal'

export default function HistorialPage() {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [reviewing, setReviewing]         = useState<Appointment | null>(null)

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  if (isLoading) return <PageLoader />

  const past = appointments?.filter((a) =>
    ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
  ) ?? []

  // Agrupar por mes
  const grouped = past.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const key = format(parseISO(appt.date), 'MMMM yyyy', { locale: es })
    if (!acc[key]) acc[key] = []
    acc[key].push(appt)
    return acc
  }, {})

  const months = Object.keys(grouped)
  if (expandedMonth === null && months.length > 0) setExpandedMonth(months[0])

  // Stats
  const completed  = past.filter((a) => a.status === 'COMPLETED')
  const totalSpent = completed.reduce((sum, a) => sum + (Number(a.service?.price) || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Historial</h2>
        <p className="text-dark-400 text-sm mt-0.5">{past.length} citas pasadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total visitas',  value: past.length,       color: 'text-white' },
          { label: 'Completadas',    value: completed.length,  color: 'text-green-400' },
          { label: 'Total gastado',  value: formatCurrency(totalSpent), color: 'text-gold-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {!past.length ? (
        <div className="glass-card">
          <EmptyState icon={History} title="Sin historial" description="Aquí aparecerán tus citas pasadas" />
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => (
            <div key={month} className="glass-card overflow-hidden">
              {/* Month header */}
              <button
                onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold capitalize">{month}</span>
                  <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded-full">
                    {grouped[month].length} citas
                  </span>
                </div>
                {expandedMonth === month
                  ? <ChevronUp size={16} className="text-dark-400" />
                  : <ChevronDown size={16} className="text-dark-400" />
                }
              </button>

              {/* Appointments list */}
              {expandedMonth === month && (
                <div className="border-t border-dark-700">
                  {grouped[month].map((appt, i) => (
                    <div
                      key={appt.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 ${
                        i < grouped[month].length - 1 ? 'border-b border-dark-800' : ''
                      }`}
                    >
                      {/* Date */}
                      <div className="text-center bg-dark-800 rounded-xl px-3 py-2 min-w-[60px] flex-shrink-0">
                        <p className="text-gold-400 font-bold text-xl leading-none">
                          {format(parseISO(appt.date), 'd')}
                        </p>
                        <p className="text-dark-400 text-xs mt-0.5">
                          {format(parseISO(appt.date), 'HH:mm')}
                        </p>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-white font-medium">{appt.service?.name ?? '—'}</p>
                          <Badge className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-dark-400 text-xs">
                          {appt.barbershop?.name && (
                            <span className="flex items-center gap-1"><MapPin size={11} />{appt.barbershop.name}</span>
                          )}
                          {appt.barber?.user && (
                            <span className="flex items-center gap-1">
                              <User size={11} />{appt.barber.user.firstName} {appt.barber.user.lastName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + review */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {appt.service?.price && (
                          <span className="flex items-center gap-1 text-gold-400 font-bold text-sm">
                            <DollarSign size={13} />{formatCurrency(appt.service.price)}
                          </span>
                        )}
                        {appt.status === 'COMPLETED' && (
                          <button
                            onClick={() => setReviewing(appt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs hover:bg-yellow-500/20 transition-colors"
                          >
                            <Star size={12} fill="currentColor" /> Reseñar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReviewModal
        appointment={reviewing}
        onClose={() => setReviewing(null)}
      />
    </div>
  )
}
