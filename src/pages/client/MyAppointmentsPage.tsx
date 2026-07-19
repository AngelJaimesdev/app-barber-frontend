import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, XCircle, Eye, RefreshCw,
  User, Scissors, MapPin, DollarSign, AlertTriangle, CheckCircle2, Star, Clock
} from 'lucide-react'
import { appointmentsApi } from '@/api/appointments.api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { DateTimePicker } from '@/components/shared/DateTimePicker'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime, formatCurrency, cn } from '@/lib/utils'
import ReviewModal from './ReviewModal'
import type { Appointment } from '@/types'

type ModalType = 'detail' | 'cancel' | 'reschedule' | null

export default function MyAppointmentsPage() {
  const qc = useQueryClient()
  const [selected, setSelected]   = useState<Appointment | null>(null)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [newDate, setNewDate]     = useState('')
  const [reviewing, setReviewing] = useState<Appointment | null>(null)

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); closeModal() },
  })

  const reschedule = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      appointmentsApi.reschedule(id, date),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); closeModal() },
  })

  const openModal = (appt: Appointment, type: ModalType) => {
    setSelected(appt); setModalType(type); setNewDate('')
  }
  const closeModal = () => { setSelected(null); setModalType(null); setNewDate('') }

  if (isLoading) return <PageLoader />

  const upcoming = appointments?.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)) ?? []
  const past     = appointments?.filter((a) => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) ?? []

  const canCancel     = (a: Appointment) => ['PENDING', 'CONFIRMED'].includes(a.status)
  const canReschedule = (a: Appointment) => ['PENDING', 'CONFIRMED'].includes(a.status)

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Mis Citas</h2>
        <p className="text-dark-400 text-sm mt-0.5">{appointments?.length ?? 0} citas en total</p>
      </div>

      {/* Upcoming */}
      <section>
        <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
          Próximas ({upcoming.length})
        </h3>
        {!upcoming.length ? (
          <div className="glass-card">
            <EmptyState icon={CalendarDays} title="Sin citas próximas" description="Explora barberías y reserva tu cita" />
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard
                key={appt.id} appt={appt}
                onView={() => openModal(appt, 'detail')}
                onCancel={() => openModal(appt, 'cancel')}
                onReschedule={() => openModal(appt, 'reschedule')}
                canCancel={canCancel(appt)}
                canReschedule={canReschedule(appt)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Historial ({past.length})
          </h3>
          <div className="space-y-2">
            {past.map((appt) => (
              <AppointmentCard
                key={appt.id} appt={appt}
                onView={() => openModal(appt, 'detail')}
                onReview={appt.status === 'COMPLETED' ? () => setReviewing(appt) : undefined}
                canCancel={false} canReschedule={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal: Detalle */}
      <Modal open={modalType === 'detail'} onClose={closeModal} title="Detalle de cita">
        {selected && (
          <div className="space-y-4">
            <div className={cn('rounded-xl p-4 border flex items-center gap-3', STATUS_COLORS[selected.status])}>
              <CalendarDays size={20} />
              <div>
                <p className="font-semibold">{STATUS_LABELS[selected.status]}</p>
                <p className="text-xs opacity-80">{formatDateTime(selected.date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: User,    label: 'Barbero',  value: selected.barber?.user ? `${selected.barber.user.firstName} ${selected.barber.user.lastName}` : '—' },
                { icon: MapPin,  label: 'Barbería', value: selected.barbershop?.name ?? '—' },
                { icon: Scissors,label: 'Servicio', value: selected.service?.name ?? '—' },
                { icon: Clock,   label: 'Duración', value: selected.service?.durationMins ? `${selected.service.durationMins} min` : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-dark-800 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-dark-400 text-xs mb-1"><Icon size={12} />{label}</div>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            {selected.service?.price && (
              <div className="flex items-center justify-between bg-gold-500/10 border border-gold-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <DollarSign size={15} className="text-gold-500" /> Total
                </div>
                <span className="text-gold-400 font-bold text-lg">{formatCurrency(selected.service.price)}</span>
              </div>
            )}

            {selected.notes && (
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-dark-400 text-xs mb-1">Notas</p>
                <p className="text-dark-200 text-sm italic">"{selected.notes}"</p>
              </div>
            )}

            {/* Reseñar si completada */}
            {selected.status === 'COMPLETED' && (
              <button
                onClick={() => { closeModal(); setTimeout(() => setReviewing(selected), 100) }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm hover:bg-yellow-500/20 transition-colors"
              >
                <Star size={14} fill="currentColor" /> Dejar reseña de esta cita
              </button>
            )}

            {(canCancel(selected) || canReschedule(selected)) && (
              <div className="flex gap-2 border-t border-dark-700 pt-2">
                {canReschedule(selected) && (
                  <button
                    onClick={() => { closeModal(); setTimeout(() => openModal(selected, 'reschedule'), 100) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm hover:bg-blue-500/20 transition-colors"
                  >
                    <RefreshCw size={14} /> Reprogramar
                  </button>
                )}
                {canCancel(selected) && (
                  <button
                    onClick={() => { closeModal(); setTimeout(() => openModal(selected, 'cancel'), 100) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle size={14} /> Cancelar cita
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Cancelar */}
      <Modal open={modalType === 'cancel'} onClose={closeModal} title="Cancelar cita">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertTriangle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold">¿Cancelar esta cita?</p>
                <p className="text-dark-400 text-sm mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 space-y-2 text-sm">
              {[
                ['Servicio', selected.service?.name],
                ['Barbero', selected.barber?.user ? `${selected.barber.user.firstName} ${selected.barber.user.lastName}` : '—'],
                ['Fecha', formatDateTime(selected.date)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-dark-400">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Mantener cita</button>
              <button
                onClick={() => cancel.mutate(selected.id)}
                disabled={cancel.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {cancel.isPending ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Reseña */}
      <ReviewModal appointment={reviewing} onClose={() => setReviewing(null)} />

      {/* Modal: Reprogramar */}
      <Modal open={modalType === 'reschedule'} onClose={closeModal} title="Reprogramar cita" className="max-w-lg">
        {selected && (
          <div className="space-y-5">
            <div className="bg-dark-800 rounded-xl p-3 text-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RefreshCw size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Nueva fecha y hora</p>
                <p className="text-dark-400 text-xs">Barbero y servicio no cambian</p>
              </div>
            </div>

            <DateTimePicker
              onChange={(iso) => setNewDate(iso)}
              durationMins={selected.service?.durationMins}
            />

            {reschedule.isError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                Error al reprogramar. Intenta de nuevo.
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button
                disabled={!newDate || reschedule.isPending}
                onClick={() => reschedule.mutate({ id: selected.id, date: newDate })}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {reschedule.isPending ? 'Guardando...' : 'Confirmar cambio'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AppointmentCard({
  appt, onView, onCancel, onReschedule, onReview, canCancel, canReschedule,
}: {
  appt: Appointment
  onView: () => void
  onCancel?: () => void
  onReschedule?: () => void
  onReview?: () => void
  canCancel: boolean
  canReschedule: boolean
}) {
  const date = new Date(appt.date)
  return (
    <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="text-center bg-dark-800 rounded-xl px-4 py-3 min-w-[72px] flex-shrink-0">
        <p className="text-gold-400 font-bold text-2xl leading-none">{date.getDate()}</p>
        <p className="text-dark-400 text-xs mt-0.5 uppercase">{date.toLocaleString('es', { month: 'short' })}</p>
        <p className="text-dark-300 text-sm font-medium mt-0.5">{date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="text-white font-semibold">{appt.service?.name ?? 'Servicio'}</p>
          <Badge className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-dark-400 text-xs">
          {appt.barbershop?.name && <span className="flex items-center gap-1"><MapPin size={11} />{appt.barbershop.name}</span>}
          {appt.barber?.user && <span className="flex items-center gap-1"><User size={11} />{appt.barber.user.firstName} {appt.barber.user.lastName}</span>}
          {appt.service?.price && <span className="flex items-center gap-1 text-gold-400 font-medium"><DollarSign size={11} />{formatCurrency(appt.service.price)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onView} title="Ver detalle"
          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
          <Eye size={17} />
        </button>
        {onReview && (
          <button onClick={onReview} title="Dejar reseña"
            className="p-2 rounded-lg hover:bg-yellow-500/10 text-dark-400 hover:text-yellow-400 transition-colors">
            <Star size={17} />
          </button>
        )}
        {canReschedule && (
          <button onClick={onReschedule} title="Reprogramar"
            className="p-2 rounded-lg hover:bg-blue-500/10 text-dark-400 hover:text-blue-400 transition-colors">
            <RefreshCw size={17} />
          </button>
        )}
        {canCancel && (
          <button onClick={onCancel} title="Cancelar"
            className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
            <XCircle size={17} />
          </button>
        )}
      </div>
    </div>
  )
}
