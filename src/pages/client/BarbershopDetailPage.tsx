import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin, Phone, Clock, Star, Scissors, ChevronLeft,
  Zap, CalendarDays, User, CheckCircle2, Loader2, DollarSign, Tag,
} from 'lucide-react'
import { barbershopsApi } from '@/api/barbershops.api'
import { barbersApi } from '@/api/barbers.api'
import { servicesApi } from '@/api/services.api'
import { appointmentsApi } from '@/api/appointments.api'
import { promotionsApi } from '@/api/promotions.api'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { DateTimePicker } from '@/components/shared/DateTimePicker'
import { formatCurrency, cn } from '@/lib/utils'
import { isAfter, isBefore, parseISO } from 'date-fns'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Barber, Service, Promotion } from '@/types'

const schema = z.object({
  barberId:  z.string().min(1, 'Selecciona un barbero'),
  serviceId: z.string().min(1, 'Selecciona un servicio'),
  date:      z.string().min(1, 'Selecciona una fecha y hora'),
  notes:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

type Tab = 'barbers' | 'services' | 'promos'

const DAYS_ES: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

export default function BarbershopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab]           = useState<Tab>('barbers')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedBarber, setSelectedBarber]   = useState<Barber | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [success, setSuccess]   = useState(false)

  const { data: shopRes, isLoading } = useQuery({
    queryKey: ['barbershop', id],
    queryFn: () => barbershopsApi.getOne(id!).then((r) => r.data.data),
  })
  const { data: barbers } = useQuery({
    queryKey: ['barbers', id],
    queryFn: () => barbersApi.getAll(id).then((r) => r.data.data),
  })
  const { data: services } = useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.getAll(id).then((r) => r.data.data),
  })

  const { data: allPromos } = useQuery({
    queryKey: ['promotions', id],
    queryFn: () => promotionsApi.getAll(id!).then((r) => r.data.data),
  })
  const now = new Date()
  const activePromos: Promotion[] = (allPromos ?? []).filter(
    (p: Promotion) => p.isActive && isBefore(now, parseISO(p.validTo)) && isAfter(now, parseISO(p.validFrom))
  )

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedBarberId  = watch('barberId')
  const watchedServiceId = watch('serviceId')

  const book = useMutation({
    mutationFn: (data: FormData) =>
      appointmentsApi.create({
        barberId:     data.barberId,
        serviceId:    data.serviceId,
        barbershopId: id!,
        date:         new Date(data.date).toISOString(),
        notes:        data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setSuccess(true)
    },
  })

  const handleSelectBarber = (b: Barber) => {
    setSelectedBarber(b)
    setValue('barberId', b.id)
  }
  const handleSelectService = (s: Service) => {
    setSelectedService(s)
    setValue('serviceId', s.id)
  }

  const closeModal = () => {
    setBookingOpen(false)
    setSuccess(false)
    setSelectedBarber(null)
    setSelectedService(null)
    reset()
  }

  if (isLoading) return <PageLoader />
  if (!shopRes) return null
  const shop = shopRes

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-500 transition-all text-sm w-fit"
      >
        <ChevronLeft size={16} /> Volver
      </button>

      {/* Hero */}
      <div className="glass-card overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 relative">
          <div className="absolute inset-0 barber-pole opacity-10" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-dark-900 to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-8 relative">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-4 shadow-xl shadow-gold-900/30">
            <Scissors size={28} className="text-dark-950" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
              {shop.description && <p className="text-dark-400 text-sm mt-1 max-w-lg">{shop.description}</p>}

              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                <div className="flex items-center gap-1.5 text-dark-300 text-sm">
                  <MapPin size={14} className="text-gold-500" />{shop.address}
                </div>
                <div className="flex items-center gap-1.5 text-dark-300 text-sm">
                  <Phone size={14} className="text-gold-500" />{shop.phone}
                </div>
                <div className="flex items-center gap-1.5 text-yellow-400 text-sm">
                  <Star size={14} fill="currentColor" />
                  <span className="font-medium">4.8</span>
                  <span className="text-dark-500">(24 reseñas)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setBookingOpen(true)}
              className="btn-primary whitespace-nowrap self-start"
            >
              <CalendarDays size={18} /> Reservar cita
            </button>
          </div>
        </div>
      </div>

      {/* Horarios */}
      {shop.workingHours && (
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-gold-500" /> Horario de atención
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(shop.workingHours).map(([day, hours]: [string, any]) => (
              <div key={day} className="bg-dark-800/50 rounded-lg px-3 py-2">
                <p className="text-xs text-dark-400 font-medium">{DAYS_ES[day] ?? day}</p>
                <p className="text-white text-sm mt-0.5">{hours.open} – {hours.close}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700">
        {([
          { key: 'barbers',  label: 'Barberos',    icon: Scissors, count: barbers?.length ?? 0 },
          { key: 'services', label: 'Servicios',   icon: Zap,      count: services?.length ?? 0 },
          { key: 'promos',   label: 'Promociones', icon: Tag,      count: activePromos.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-dark-400 hover:text-white'
            )}
          >
            <t.icon size={15} />{t.label}
            <span className={cn('text-xs rounded-full px-1.5 py-0.5',
              tab === t.key ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-700 text-dark-400'
            )}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Barbers tab */}
      {tab === 'barbers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!barbers?.length ? (
            <p className="text-dark-400 col-span-full text-center py-10">Sin barberos registrados</p>
          ) : barbers.map((barber) => (
            <div key={barber.id} className="glass-card p-5 flex flex-col gap-3 hover:border-gold-700/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0">
                  <User size={26} className="text-gold-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {barber.user ? `${barber.user.firstName} ${barber.user.lastName}` : '—'}
                  </p>
                  <p className="text-gold-400 text-xs font-medium mt-0.5">{barber.specialty ?? 'Barbero'}</p>
                </div>
              </div>
              {barber.bio && <p className="text-dark-400 text-sm leading-relaxed">{barber.bio}</p>}
              <button
                onClick={() => { handleSelectBarber(barber); setBookingOpen(true) }}
                className="btn-secondary text-sm justify-center mt-auto"
              >
                <CalendarDays size={14} /> Reservar con este barbero
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Services tab */}
      {tab === 'services' && (
        <div className="glass-card overflow-hidden">
          {!services?.length ? (
            <p className="text-dark-400 text-center py-10">Sin servicios registrados</p>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr><th>Servicio</th><th>Duración</th><th>Precio</th><th></th></tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <p className="text-white font-medium">{svc.name}</p>
                      {svc.description && <p className="text-dark-500 text-xs mt-0.5">{svc.description}</p>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-dark-300">
                        <Clock size={13} />{svc.durationMins} min
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-gold-400 font-bold">
                        <DollarSign size={14} />{formatCurrency(svc.price)}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => { handleSelectService(svc); setBookingOpen(true) }}
                        className="btn-primary text-xs py-1.5"
                      >
                        Reservar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Promos tab */}
      {tab === 'promos' && (
        <div>
          {!activePromos.length ? (
            <div className="glass-card py-12 text-center">
              <Tag size={32} className="text-dark-600 mx-auto mb-3" />
              <p className="text-white font-medium">Sin promociones activas</p>
              <p className="text-dark-400 text-sm mt-1">Esta barbería no tiene descuentos vigentes por ahora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePromos.map((p) => (
                <div key={p.id} className="glass-card p-5 border-green-500/20 flex gap-4 items-start">
                  {/* Discount badge */}
                  <div className="w-16 h-16 rounded-2xl gold-gradient flex flex-col items-center justify-center flex-shrink-0 shadow-lg shadow-gold-900/30 font-bold text-dark-950">
                    <span className="text-xl leading-none">{p.discountPercent}%</span>
                    <span className="text-xs font-normal opacity-70">OFF</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold">{p.title}</h4>
                    {p.description && (
                      <p className="text-dark-400 text-sm mt-1 leading-relaxed">{p.description}</p>
                    )}
                    <p className="text-dark-500 text-xs mt-2 flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      Válida hasta {format(parseISO(p.validTo), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Booking Modal ─── */}
      <Modal open={bookingOpen} onClose={closeModal} title="Reservar cita" className="max-w-lg">
        {success ? (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">¡Cita reservada!</h3>
              <p className="text-dark-400 text-sm">Tu cita está pendiente de confirmación por el barbero.</p>
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button onClick={closeModal} className="btn-secondary flex-1 justify-center">
                Cerrar
              </button>
              <button onClick={() => { closeModal(); navigate('/client/appointments') }} className="btn-primary flex-1 justify-center">
                Ver mis citas
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((d) => book.mutate(d))} className="space-y-5">

            {/* Step 1 – Barber */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">
                1. Elige tu barbero
              </label>
              <div className="space-y-2">
                {barbers?.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBarber(b)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      watchedBarberId === b.id
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-dark-600 bg-dark-800/50 hover:border-dark-500'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                      <User size={18} className={watchedBarberId === b.id ? 'text-gold-400' : 'text-dark-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', watchedBarberId === b.id ? 'text-white' : 'text-dark-300')}>
                        {b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}
                      </p>
                      <p className="text-xs text-dark-500">{b.specialty}</p>
                    </div>
                    {watchedBarberId === b.id && (
                      <CheckCircle2 size={16} className="text-gold-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {errors.barberId && <p className="text-red-400 text-xs mt-1">{errors.barberId.message}</p>}
              <input type="hidden" {...register('barberId')} />
            </div>

            {/* Step 2 – Service */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">
                2. Elige el servicio
              </label>
              <div className="space-y-2">
                {services?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectService(s)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      watchedServiceId === s.id
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-dark-600 bg-dark-800/50 hover:border-dark-500'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', watchedServiceId === s.id ? 'text-white' : 'text-dark-300')}>
                        {s.name}
                      </p>
                      <p className="text-xs text-dark-500">{s.durationMins} min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('font-bold text-sm', watchedServiceId === s.id ? 'text-gold-400' : 'text-dark-400')}>
                        {formatCurrency(s.price)}
                      </span>
                      {watchedServiceId === s.id && (
                        <CheckCircle2 size={16} className="text-gold-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {errors.serviceId && <p className="text-red-400 text-xs mt-1">{errors.serviceId.message}</p>}
              <input type="hidden" {...register('serviceId')} />
            </div>

            {/* Step 3 – Date */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">
                3. Fecha y hora
              </label>
              <DateTimePicker
                value={watch('date')}
                onChange={(iso) => setValue('date', iso)}
                durationMins={selectedService?.durationMins}
                workingHours={shop.workingHours}
              />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date.message}</p>}
              <input type="hidden" {...register('date')} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-dark-400 mb-1.5">Notas (opcional)</label>
              <textarea
                {...register('notes')}
                className="input-field resize-none"
                rows={2}
                placeholder="Ej: Prefiero corte sin gel, alergia a ciertos productos..."
              />
            </div>

            {/* Summary */}
            {(selectedBarber || selectedService) && (
              <div className="bg-dark-800/60 rounded-xl p-4 border border-dark-600 space-y-2">
                <p className="text-xs text-dark-400 font-semibold uppercase tracking-wide">Resumen</p>
                {selectedBarber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Barbero</span>
                    <span className="text-white font-medium">
                      {selectedBarber.user?.firstName} {selectedBarber.user?.lastName}
                    </span>
                  </div>
                )}
                {selectedService && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Servicio</span>
                      <span className="text-white font-medium">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Duración</span>
                      <span className="text-dark-300">{selectedService.durationMins} min</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dark-600 pt-2 mt-2">
                      <span className="text-dark-300 font-medium">Total estimado</span>
                      <span className="text-gold-400 font-bold">{formatCurrency(selectedService.price)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {book.isError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                {(book.error as any)?.response?.data?.message ?? 'Error al crear la cita'}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button type="submit" disabled={book.isPending} className="btn-primary flex-1 justify-center">
                {book.isPending && <Loader2 size={16} className="animate-spin" />}
                Confirmar reserva
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
