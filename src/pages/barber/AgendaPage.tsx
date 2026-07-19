import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Clock, CheckCircle2, Scissors,
  User, Phone, AlertCircle, XCircle, UserX, CalendarClock,
} from 'lucide-react'
import { appointmentsApi } from '@/api/appointments.api'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { STATUS_COLORS, STATUS_LABELS, formatTime, formatCurrency, cn } from '@/lib/utils'
import {
  format, isToday, isTomorrow, parseISO,
  startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Appointment, AppointmentStatus } from '@/types'

/* ─── Status stepper ─────────────────────────────────────────── */
const FLOW = [
  { status: 'PENDING',   step: 1 },
  { status: 'CONFIRMED', step: 2 },
  { status: 'COMPLETED', step: 3 },
]

function StatusStepper({ status }: { status: AppointmentStatus }) {
  const cur = FLOW.find((s) => s.status === status)?.step ?? 0
  return (
    <div className="flex items-center gap-1">
      {FLOW.map((s, i) => (
        <div key={s.status} className="flex items-center gap-1">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all',
            cur >= s.step
              ? s.step === 3 ? 'bg-green-500 text-white'
              : s.step === 2 ? 'bg-blue-500 text-white'
              : 'bg-yellow-500 text-dark-950'
              : 'bg-dark-700 text-dark-500',
          )}>
            {cur > s.step ? <CheckCircle2 size={12} /> : s.step}
          </div>
          {i < FLOW.length - 1 && (
            <div className={cn('w-6 h-px transition-all', cur > s.step ? 'bg-green-500/50' : 'bg-dark-700')} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Date label helper ──────────────────────────────────────── */
function dateLabel(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d))    return { text: 'Hoy',     color: 'text-gold-400 bg-gold-500/10 border-gold-500/20' }
  if (isTomorrow(d)) return { text: 'Mañana',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
  return {
    text: format(d, 'EEE d MMM', { locale: es }),
    color: 'text-dark-400 bg-dark-800 border-dark-700',
  }
}

/* ─── Filter tabs ────────────────────────────────────────────── */
type Filter = 'today' | 'tomorrow' | 'week' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today',    label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'week',     label: 'Esta semana' },
  { key: 'all',      label: 'Todas' },
]

function filterAppointments(appointments: Appointment[], filter: Filter) {
  const now = new Date()
  switch (filter) {
    case 'today':
      return appointments.filter((a) => isToday(parseISO(a.date)))
    case 'tomorrow':
      return appointments.filter((a) => isTomorrow(parseISO(a.date)))
    case 'week':
      return appointments.filter((a) =>
        isWithinInterval(parseISO(a.date), {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end:   endOfWeek(now,   { weekStartsOn: 1 }),
        }),
      )
    default:
      return appointments
  }
}

/* ─── Group by date ──────────────────────────────────────────── */
function groupByDate(appointments: Appointment[]) {
  const map = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const key = startOfDay(parseISO(a.date)).toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

function groupDateHeader(isoKey: string) {
  const d = parseISO(isoKey)
  if (isToday(d))    return 'Hoy — ' + format(d, "EEEE d 'de' MMMM", { locale: es })
  if (isTomorrow(d)) return 'Mañana — ' + format(d, "EEEE d 'de' MMMM", { locale: es })
  return format(d, "EEEE d 'de' MMMM", { locale: es })
}

/* ─── Main page ──────────────────────────────────────────────── */
type Action = 'confirm' | 'complete' | 'cancel' | 'noshow'

export default function AgendaPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('today')
  const [modal, setModal] = useState<{ open: boolean; appt: Appointment | null; action: Action | null }>({
    open: false, appt: null, action: null,
  })

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setModal({ open: false, appt: null, action: null })
    },
  })

  const all = appointments ?? []

  /* Filtered appointments (active only: pending + confirmed) */
  const active = useMemo(() => {
    const base = all.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status))
    return filterAppointments(base, filter).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [all, filter])

  /* Historial of the selected filter (done/cancelled) */
  const history = useMemo(() => {
    const base = all.filter((a) => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status))
    return filterAppointments(base, filter).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [all, filter])

  if (isLoading) return <PageLoader />

  /* Stats — always from today */
  const todayAll       = all.filter((a) => isToday(parseISO(a.date)))
  const pendingToday   = todayAll.filter((a) => a.status === 'PENDING')
  const confirmedToday = todayAll.filter((a) => a.status === 'CONFIRMED')
  const completedToday = todayAll.filter((a) => a.status === 'COMPLETED')

  const grouped = filter === 'all' || filter === 'week' ? groupByDate(active) : null

  const openAction = (appt: Appointment, action: Action) =>
    setModal({ open: true, appt, action })

  const executeAction = () => {
    if (!modal.appt || !modal.action) return
    const map: Record<Action, AppointmentStatus> = {
      confirm:  'CONFIRMED',
      complete: 'COMPLETED',
      cancel:   'CANCELLED',
      noshow:   'NO_SHOW',
    }
    updateStatus.mutate({ id: modal.appt.id, status: map[modal.action] })
  }

  const todayFormatted = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Mi Agenda</h2>
        <p className="text-dark-400 text-sm mt-0.5 capitalize">{todayFormatted}</p>
      </div>

      {/* Stats — hoy siempre */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendientes hoy',   value: pendingToday.length,   color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle },
          { label: 'Confirmadas hoy',  value: confirmedToday.length, color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: CheckCircle2 },
          { label: 'Completadas hoy',  value: completedToday.length, color: 'text-green-400',  bg: 'bg-green-500/10',  icon: Scissors },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = filterAppointments(
            all.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)),
            f.key,
          ).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                filter === f.key
                  ? 'gold-gradient text-dark-950 border-transparent shadow-md shadow-gold-900/20'
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-500 hover:text-white',
              )}
            >
              {f.label}
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  filter === f.key ? 'bg-dark-950/20' : 'bg-dark-700 text-dark-300',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Citas activas */}
      <section>
        <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
          Citas activas ({active.length})
        </h3>

        {!active.length ? (
          <div className="glass-card py-10 text-center">
            <CalendarClock size={32} className="text-dark-600 mx-auto mb-3" />
            <p className="text-white font-medium">Sin citas activas</p>
            <p className="text-dark-400 text-sm mt-1">
              {filter === 'today' ? '¡Todo al día por hoy! ✂️' : 'No hay citas para este período'}
            </p>
          </div>
        ) : grouped ? (
          /* Vista agrupada por fecha (semana / todas) */
          <div className="space-y-5">
            {grouped.map(([key, appts]) => (
              <div key={key}>
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 capitalize">
                  {groupDateHeader(key)}
                </p>
                <div className="space-y-3">
                  {appts.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      showDate={false}
                      onConfirm={() => openAction(appt, 'confirm')}
                      onComplete={() => openAction(appt, 'complete')}
                      onCancel={() => openAction(appt, 'cancel')}
                      onNoShow={() => openAction(appt, 'noshow')}
                      loading={updateStatus.isPending && modal.appt?.id === appt.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista plana con badge de fecha en cada tarjeta (hoy / mañana) */
          <div className="space-y-3">
            {active.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                showDate={filter !== 'today'}
                onConfirm={() => openAction(appt, 'confirm')}
                onComplete={() => openAction(appt, 'complete')}
                onCancel={() => openAction(appt, 'cancel')}
                onNoShow={() => openAction(appt, 'noshow')}
                loading={updateStatus.isPending && modal.appt?.id === appt.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Historial del período seleccionado */}
      {history.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Historial ({history.length})
          </h3>
          <div className="glass-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((appt) => {
                  const dl = dateLabel(appt.date)
                  return (
                    <tr key={appt.id}>
                      <td>
                        <span className={cn('text-xs px-2 py-0.5 rounded-lg border font-medium capitalize', dl.color)}>
                          {dl.text}
                        </span>
                      </td>
                      <td className="text-gold-400 font-mono font-semibold">{formatTime(appt.date)}</td>
                      <td className="text-white font-medium">
                        {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
                      </td>
                      <td>{appt.service?.name ?? '—'}</td>
                      <td>
                        <Badge className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal de confirmación */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, appt: null, action: null })}
        title={
          modal.action === 'confirm'  ? 'Confirmar llegada' :
          modal.action === 'complete' ? 'Finalizar corte'   :
          modal.action === 'noshow'   ? 'No se presentó'    : 'Cancelar cita'
        }
        className="max-w-sm"
      >
        {modal.appt && (
          <div className="space-y-5">
            {/* Icono */}
            <div className={cn(
              'flex items-center justify-center w-14 h-14 rounded-2xl mx-auto',
              modal.action === 'confirm'  ? 'bg-blue-500/10'   :
              modal.action === 'complete' ? 'bg-green-500/10'  :
              modal.action === 'noshow'   ? 'bg-dark-700'      : 'bg-red-500/10',
            )}>
              {modal.action === 'confirm'  && <CheckCircle2 size={28} className="text-blue-400" />}
              {modal.action === 'complete' && <Scissors size={28} className="text-green-400" />}
              {modal.action === 'noshow'   && <UserX size={28} className="text-dark-400" />}
              {modal.action === 'cancel'   && <XCircle size={28} className="text-red-400" />}
            </div>

            {/* Mensaje */}
            <p className="text-center text-white font-medium">
              {modal.action === 'confirm'  && '¿Confirmar la llegada del cliente?'}
              {modal.action === 'complete' && '¿El corte ha finalizado?'}
              {modal.action === 'noshow'   && '¿El cliente no se presentó?'}
              {modal.action === 'cancel'   && '¿Cancelar esta cita?'}
            </p>

            {/* Resumen */}
            <div className="bg-dark-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Fecha</span>
                <span className="text-white font-medium capitalize">
                  {dateLabel(modal.appt.date).text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Hora</span>
                <span className="text-white font-medium">{formatTime(modal.appt.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Cliente</span>
                <span className="text-white font-medium">
                  {modal.appt.client?.firstName} {modal.appt.client?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Servicio</span>
                <span className="text-white font-medium">{modal.appt.service?.name}</span>
              </div>
              {modal.appt.service?.price && (
                <div className="flex justify-between border-t border-dark-700 pt-2">
                  <span className="text-dark-400">Total</span>
                  <span className="text-gold-400 font-bold">{formatCurrency(modal.appt.service.price)}</span>
                </div>
              )}
            </div>

            {/* Stepper — solo para flujo normal */}
            {(modal.action === 'confirm' || modal.action === 'complete') && (
              <div className="flex justify-center">
                <StatusStepper status={modal.action === 'confirm' ? 'CONFIRMED' : 'COMPLETED'} />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ open: false, appt: null, action: null })}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={executeAction}
                disabled={updateStatus.isPending}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm',
                  modal.action === 'confirm'  ? 'bg-blue-500 hover:bg-blue-400 text-white' :
                  modal.action === 'complete' ? 'gold-gradient text-dark-950'              :
                  modal.action === 'noshow'   ? 'bg-dark-600 hover:bg-dark-500 text-dark-200' :
                                               'bg-red-500 hover:bg-red-400 text-white',
                )}
              >
                {modal.action === 'confirm'  && <><CheckCircle2 size={16} /> Confirmar</>}
                {modal.action === 'complete' && <><Scissors size={16} /> Finalizar</>}
                {modal.action === 'noshow'   && <><UserX size={16} /> Marcar ausente</>}
                {modal.action === 'cancel'   && <><XCircle size={16} /> Sí, cancelar</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ─── Appointment card ───────────────────────────────────────── */
function AppointmentCard({ appt, showDate, onConfirm, onComplete, onCancel, onNoShow, loading }: {
  appt: Appointment
  showDate: boolean
  onConfirm: () => void
  onComplete: () => void
  onCancel: () => void
  onNoShow: () => void
  loading: boolean
}) {
  const isPending   = appt.status === 'PENDING'
  const isConfirmed = appt.status === 'CONFIRMED'
  const isCancelled = appt.status === 'CANCELLED'
  const dl = dateLabel(appt.date)

  return (
    <div className={cn(
      'glass-card overflow-hidden transition-all',
      isPending   && 'border-yellow-500/20',
      isConfirmed && 'border-blue-500/20',
    )}>
      {/* Top color bar */}
      <div className={cn(
        'h-1',
        isPending   && 'bg-yellow-500/40',
        isConfirmed && 'bg-blue-500/40',
        isCancelled && 'bg-dark-600',
      )} />

      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Hora + fecha */}
          <div className="text-center bg-dark-800 rounded-xl px-4 py-3 min-w-[80px] flex-shrink-0">
            <p className="text-gold-400 font-bold text-xl leading-none">{formatTime(appt.date)}</p>
            <p className="text-dark-500 text-xs mt-1">{appt.service?.durationMins ?? '—'}min</p>
            {showDate && (
              <p className={cn('text-xs font-semibold mt-1.5 capitalize', dl.color.split(' ')[0])}>
                {dl.text}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-white font-semibold text-base">{appt.service?.name ?? 'Servicio'}</p>
              <Badge className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
              {/* Badge de fecha cuando el filtro es "hoy" pero igual mostramos indicador visual */}
              {!showDate && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-lg border font-medium capitalize hidden sm:inline-flex',
                  dl.color,
                )}>
                  {dl.text}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-300">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-gold-500" />
                {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
              </span>
              {appt.client?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-gold-500" />
                  {appt.client.phone}
                </span>
              )}
            </div>

            {appt.notes && (
              <p className="text-dark-500 text-xs italic">📝 "{appt.notes}"</p>
            )}

            {!isCancelled && (
              <div className="pt-1">
                <StatusStepper status={appt.status} />
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {appt.service?.price && (
              <span className="text-white font-bold">{formatCurrency(appt.service.price)}</span>
            )}

            {isPending && (
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                <CheckCircle2 size={15} /> Confirmar llegada
              </button>
            )}

            {isConfirmed && (
              <button
                onClick={onComplete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-dark-950 font-bold text-sm hover:shadow-lg hover:shadow-gold-900/30 disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                <Scissors size={15} /> Finalizar corte ✓
              </button>
            )}

            {/* No se presentó + Cancelar */}
            {(isPending || isConfirmed) && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={onNoShow}
                  className="flex items-center gap-1.5 text-xs text-dark-500 hover:text-dark-300 transition-colors"
                  title="No se presentó"
                >
                  <UserX size={13} /> No vino
                </button>
                <span className="text-dark-700">·</span>
                <button
                  onClick={onCancel}
                  className="text-xs text-dark-500 hover:text-red-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
