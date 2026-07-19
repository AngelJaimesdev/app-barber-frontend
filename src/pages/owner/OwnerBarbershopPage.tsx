import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Store, MapPin, Phone, Mail, Clock, Edit2, X,
  Loader2, CheckCircle2, Scissors, Zap, CalendarDays, Link,
} from 'lucide-react'
import { barbershopsApi } from '@/api/barbershops.api'
import { barbersApi } from '@/api/barbers.api'
import { servicesApi } from '@/api/services.api'
import { appointmentsApi } from '@/api/appointments.api'
import { useAuthStore } from '@/store/auth.store'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

/* ─── Schemas ─────────────────────────────────────────────────── */
const infoSchema = z.object({
  name:        z.string().min(2, 'Requerido'),
  description: z.string().optional(),
  address:     z.string().min(5, 'Requerido'),
  phone:       z.string().min(7, 'Requerido'),
  email:       z.string().email('Email inválido').optional().or(z.literal('')),
  logoUrl:     z.string().url('URL inválida').optional().or(z.literal('')),
})
type InfoForm = z.infer<typeof infoSchema>

/* ─── Days config ─────────────────────────────────────────────── */
const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

type DayHours = { open: string; close: string } | null
type WorkingHours = Record<string, DayHours>

/* ─── Saved badge ─────────────────────────────────────────────── */
function SavedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-green-400 text-sm">
      <CheckCircle2 size={15} /> Guardado
    </span>
  )
}

/* ─── Section wrapper ─────────────────────────────────────────── */
function Section({
  title, icon: Icon, editing, onEdit, onCancel, children,
}: {
  title: string
  icon: React.ElementType
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  children: React.ReactNode
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Icon size={16} className="text-gold-500" />
          {title}
        </h3>
        {!editing ? (
          <button onClick={onEdit} className="btn-secondary text-xs py-1.5 px-3">
            <Edit2 size={13} /> Editar
          </button>
        ) : (
          <button onClick={onCancel} className="flex items-center gap-1.5 text-dark-400 hover:text-white text-xs transition-colors">
            <X size={13} /> Cancelar
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

/* ─── Info row ────────────────────────────────────────────────── */
function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
      <span className="text-dark-500 text-sm flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-dark-200 text-sm font-medium text-right max-w-[60%] truncate">
        {value || <span className="text-dark-600 italic">—</span>}
      </span>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function OwnerBarbershopPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [editInfo, setEditInfo]   = useState(false)
  const [editHours, setEditHours] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  /* Queries */
  const { data: barbershops, isLoading } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })

  const shop = barbershops?.find((b) => b.ownerId === user?.id)

  const { data: barbers } = useQuery({
    queryKey: ['barbers', shop?.id],
    queryFn: () => barbersApi.getAll(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  const { data: services } = useQuery({
    queryKey: ['services', shop?.id],
    queryFn: () => servicesApi.getAll(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  /* Info form */
  const infoForm = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    values: shop ? {
      name:        shop.name,
      description: shop.description ?? '',
      address:     shop.address,
      phone:       shop.phone,
      email:       shop.email ?? '',
      logoUrl:     shop.logoUrl ?? '',
    } : undefined,
  })

  /* Working hours local state */
  const [hours, setHours] = useState<WorkingHours>({})
  const initHours = () => {
    const base: WorkingHours = {}
    DAYS.forEach(({ key }) => {
      const h = shop?.workingHours?.[key]
      base[key] = h ? { open: h.open, close: h.close } : null
    })
    setHours(base)
  }

  /* Mutations */
  const saveInfo = useMutation({
    mutationFn: (d: InfoForm) => barbershopsApi.update(shop!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbershops'] })
      setEditInfo(false)
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 3000)
    },
  })

  const saveHours = useMutation({
    mutationFn: () => {
      const wh: Record<string, { open: string; close: string }> = {}
      Object.entries(hours).forEach(([k, v]) => { if (v) wh[k] = v })
      return barbershopsApi.update(shop!.id, { workingHours: wh })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbershops'] })
      setEditHours(false)
      setHoursSaved(true)
      setTimeout(() => setHoursSaved(false), 3000)
    },
  })

  if (isLoading) return <PageLoader />

  if (!shop) {
    return (
      <div className="glass-card py-16 text-center max-w-md mx-auto mt-10">
        <Store size={40} className="text-dark-600 mx-auto mb-4" />
        <h3 className="text-white font-semibold text-lg">Sin barbería registrada</h3>
        <p className="text-dark-400 text-sm mt-2">Contacta al administrador para vincular tu barbería.</p>
      </div>
    )
  }

  const totalAppts    = appointments?.length ?? 0
  const completedAppts = appointments?.filter((a) => a.status === 'COMPLETED').length ?? 0

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">

      {/* ── Hero card ───────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Logo / avatar */}
          <div className="flex-shrink-0">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name}
                className="w-24 h-24 rounded-2xl object-cover border border-dark-700" />
            ) : (
              <div className="w-24 h-24 rounded-2xl gold-gradient flex items-center justify-center text-dark-950 shadow-xl shadow-gold-900/30">
                <Store size={36} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white">{shop.name}</h3>
            <p className="text-dark-400 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <MapPin size={13} /> {shop.address}
            </p>
            <p className="text-dark-400 text-sm mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
              <Phone size={13} /> {shop.phone}
            </p>
            <div className="mt-2">
              <Badge className={shop.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-dark-600/50 text-dark-400 border-dark-500/20'}>
                {shop.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </div>
        </div>

        {shop.description && (
          <p className="text-dark-300 text-sm mt-5 leading-relaxed border-l-2 border-gold-600 pl-3 italic">
            "{shop.description}"
          </p>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Barberos',     value: barbers?.length ?? 0,    icon: Scissors,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Servicios',    value: services?.length ?? 0,   icon: Zap,         color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Citas totales',value: totalAppts,              icon: CalendarDays, color: 'text-gold-400',  bg: 'bg-gold-500/10' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Información general ─────────────────────────────── */}
      <Section
        title="Información general"
        icon={Store}
        editing={editInfo}
        onEdit={() => setEditInfo(true)}
        onCancel={() => { setEditInfo(false); infoForm.reset() }}
      >
        {!editInfo ? (
          <div className="space-y-1">
            <InfoRow label="Nombre"      value={shop.name} />
            <InfoRow label="Dirección"   value={shop.address}     icon={<MapPin size={14} className="text-dark-500" />} />
            <InfoRow label="Teléfono"    value={shop.phone}       icon={<Phone size={14} className="text-dark-500" />} />
            <InfoRow label="Email"       value={shop.email}       icon={<Mail size={14} className="text-dark-500" />} />
            <InfoRow label="Logo URL"    value={shop.logoUrl}     icon={<Link size={14} className="text-dark-500" />} />
            <div className="pt-2">
              <p className="text-dark-500 text-xs mb-1">Descripción</p>
              <p className="text-dark-300 text-sm leading-relaxed">
                {shop.description || <span className="text-dark-600 italic">Sin descripción</span>}
              </p>
            </div>
            {infoSaved && <div className="pt-2"><SavedBadge /></div>}
          </div>
        ) : (
          <form onSubmit={infoForm.handleSubmit((d) => saveInfo.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
              <input {...infoForm.register('name')} className="input-field" placeholder="Barbería El Estilo" />
              {infoForm.formState.errors.name?.message && (
                <p className="text-red-400 text-xs mt-1">{String(infoForm.formState.errors.name.message)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Teléfono *</label>
                <input {...infoForm.register('phone')} className="input-field" placeholder="+57 300..." />
                {infoForm.formState.errors.phone?.message && (
                  <p className="text-red-400 text-xs mt-1">{String(infoForm.formState.errors.phone.message)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Email</label>
                <input {...infoForm.register('email')} type="email" className="input-field" placeholder="info@barberia.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Dirección *</label>
              <input {...infoForm.register('address')} className="input-field" placeholder="Calle 10 #5-20, Bogotá" />
              {infoForm.formState.errors.address?.message && (
                <p className="text-red-400 text-xs mt-1">{String(infoForm.formState.errors.address.message)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">URL del logo</label>
              <input {...infoForm.register('logoUrl')} className="input-field" placeholder="https://..." />
              {infoForm.formState.errors.logoUrl?.message && (
                <p className="text-red-400 text-xs mt-1">{String(infoForm.formState.errors.logoUrl.message)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
              <textarea {...infoForm.register('description')} className="input-field resize-none" rows={3}
                placeholder="Describe tu barbería..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setEditInfo(false); infoForm.reset() }}
                className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={saveInfo.isPending} className="btn-primary flex-1 justify-center">
                {saveInfo.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        )}
      </Section>

      {/* ── Horarios ────────────────────────────────────────── */}
      <Section
        title="Horarios de atención"
        icon={Clock}
        editing={editHours}
        onEdit={() => { initHours(); setEditHours(true) }}
        onCancel={() => setEditHours(false)}
      >
        {!editHours ? (
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const h = shop.workingHours?.[key]
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <span className="text-dark-300 text-sm w-28">{label}</span>
                  {h ? (
                    <span className="text-white text-sm font-medium">
                      {h.open} – {h.close}
                    </span>
                  ) : (
                    <span className="text-dark-600 text-sm italic">Cerrado</span>
                  )}
                </div>
              )
            })}
            {hoursSaved && <div className="pt-2"><SavedBadge /></div>}
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const active = !!hours[key]
              return (
                <div key={key} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  active ? 'border-dark-600 bg-dark-800/40' : 'border-dark-800 bg-transparent opacity-60',
                )}>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setHours((prev) => ({
                        ...prev,
                        [key]: active ? null : { open: '08:00', close: '18:00' },
                      }))
                    }
                    className={cn(
                      'w-9 h-5 rounded-full transition-colors flex-shrink-0 relative',
                      active ? 'bg-gold-500' : 'bg-dark-700',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                      active ? 'left-4' : 'left-0.5',
                    )} />
                  </button>

                  {/* Label */}
                  <span className="text-dark-300 text-sm w-24 flex-shrink-0">{label}</span>

                  {/* Times */}
                  {active ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={hours[key]?.open ?? '08:00'}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [key]: { ...prev[key]!, open: e.target.value },
                          }))
                        }
                        className="input-field py-1.5 text-sm flex-1"
                      />
                      <span className="text-dark-500 text-xs flex-shrink-0">a</span>
                      <input
                        type="time"
                        value={hours[key]?.close ?? '18:00'}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [key]: { ...prev[key]!, close: e.target.value },
                          }))
                        }
                        className="input-field py-1.5 text-sm flex-1"
                      />
                    </div>
                  ) : (
                    <span className="text-dark-600 text-sm italic flex-1">Cerrado</span>
                  )}
                </div>
              )
            })}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditHours(false)}
                className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button
                type="button"
                onClick={() => saveHours.mutate()}
                disabled={saveHours.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {saveHours.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Guardar horarios
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
