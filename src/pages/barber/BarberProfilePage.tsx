import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Scissors, Star, CalendarDays, CheckCircle2,
  Loader2, Eye, EyeOff, MapPin, Shield, Edit2, X,
  Phone, Mail, BadgeCheck,
} from 'lucide-react'
import { barbersApi } from '@/api/barbers.api'
import { appointmentsApi } from '@/api/appointments.api'
import { authApi } from '@/api/auth.api'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/store/auth.store'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { reviewsApi } from '@/api/reviews.api'

/* ─── Schemas ─────────────────────────────────────────────────── */
const profSchema = z.object({
  specialty: z.string().optional(),
  bio: z.string().max(300, 'Máximo 300 caracteres').optional(),
})

const userSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
})

const passSchema = z
  .object({
    currentPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

/* ─── Star display ───────────────────────────────────────────── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-dark-600'}
        />
      ))}
    </div>
  )
}

/* ─── Inline success message ────────────────────────────────── */
function SavedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-green-400 text-sm">
      <CheckCircle2 size={15} /> Guardado
    </span>
  )
}

/* ─── Section wrapper ────────────────────────────────────────── */
function Section({
  title,
  icon: Icon,
  editing,
  onEdit,
  onCancel,
  children,
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

/* ─── Main page ──────────────────────────────────────────────── */
export default function BarberProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const qc = useQueryClient()

  const [editProf, setEditProf] = useState(false)
  const [editUser, setEditUser] = useState(false)
  const [editPass, setEditPass] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [profSaved, setProfSaved] = useState(false)
  const [userSaved, setUserSaved] = useState(false)
  const [passOk, setPassOk] = useState(false)
  const [passError, setPassError] = useState('')

  /* queries */
  const { data: barber, isLoading } = useQuery({
    queryKey: ['barber-me'],
    queryFn: () => barbersApi.getMe().then((r) => r.data.data),
  })

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews-barber', barber?.id],
    queryFn: () => reviewsApi.getByBarber(barber!.id).then((r) => r.data.data),
    enabled: !!barber?.id,
  })

  /* forms */
  const profForm = useForm({
    resolver: zodResolver(profSchema),
    values: { specialty: barber?.specialty ?? '', bio: barber?.bio ?? '' },
  })

  const userForm = useForm({
    resolver: zodResolver(userSchema),
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  })

  const passForm = useForm({ resolver: zodResolver(passSchema) })

  /* mutations */
  const saveProf = useMutation({
    mutationFn: (d: any) => barbersApi.updateMe(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barber-me'] })
      setEditProf(false)
      setProfSaved(true)
      setTimeout(() => setProfSaved(false), 3000)
    },
  })

  const saveUser = useMutation({
    mutationFn: (d: any) => usersApi.update(user!.id, d),
    onSuccess: (res) => {
      setAuth({ ...user!, ...res.data.data }, accessToken!, refreshToken!)
      setEditUser(false)
      setUserSaved(true)
      setTimeout(() => setUserSaved(false), 3000)
    },
  })

  const savePass = useMutation({
    mutationFn: (d: any) => authApi.changePassword(d.currentPassword, d.newPassword),
    onSuccess: () => {
      setPassOk(true)
      setEditPass(false)
      passForm.reset()
      setTimeout(() => setPassOk(false), 3000)
    },
    onError: (e: any) => setPassError(e.response?.data?.message ?? 'Error al cambiar contraseña'),
  })

  if (isLoading) return <PageLoader />

  const completed = appointments?.filter((a) => a.status === 'COMPLETED') ?? []
  const avgRating =
    reviews?.length
      ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
      : 0

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">

      {/* ── Hero card ───────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl gold-gradient flex items-center justify-center text-dark-950 font-bold text-3xl shadow-xl shadow-gold-900/30">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {barber?.isActive && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-dark-900" title="Activo" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-white">
              {user?.firstName} {user?.lastName}
            </h3>

            {barber?.specialty ? (
              <p className="text-gold-400 font-medium mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Scissors size={14} /> {barber.specialty}
              </p>
            ) : (
              <p className="text-dark-500 text-sm mt-1 italic">Sin especialidad definida</p>
            )}

            {barber?.barbershop?.name && (
              <p className="text-dark-400 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <MapPin size={13} /> {barber.barbershop.name}
              </p>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <Stars rating={avgRating} />
              <span className="text-dark-400 text-sm">
                {avgRating > 0 ? avgRating.toFixed(1) : 'Sin reseñas'}
                {(reviews?.length ?? 0) > 0 && ` (${reviews!.length})`}
              </span>
            </div>
          </div>
        </div>

        {/* Bio (view mode) */}
        {barber?.bio && !editProf && (
          <p className="text-dark-300 text-sm mt-5 leading-relaxed border-l-2 border-gold-600 pl-3 italic">
            "{barber.bio}"
          </p>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Citas totales', value: appointments?.length ?? 0, icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Completadas',   value: completed.length,           icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Reseñas',       value: reviews?.length ?? 0,       icon: Star,         color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
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

      {/* ── Perfil profesional ──────────────────────────────── */}
      <Section
        title="Perfil profesional"
        icon={Scissors}
        editing={editProf}
        onEdit={() => setEditProf(true)}
        onCancel={() => { setEditProf(false); profForm.reset() }}
      >
        {!editProf ? (
          <div className="space-y-3">
            <InfoRow label="Especialidad" value={barber?.specialty || '—'} />
            <InfoRow label="Barbería" value={barber?.barbershop?.name || '—'} />
            <div>
              <p className="text-xs text-dark-500 mb-1">Bio</p>
              <p className="text-dark-300 text-sm leading-relaxed">
                {barber?.bio || <span className="text-dark-600 italic">Sin bio definida</span>}
              </p>
            </div>
            {profSaved && <SavedBadge />}
          </div>
        ) : (
          <form onSubmit={profForm.handleSubmit((d) => saveProf.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Especialidad</label>
              <input
                {...profForm.register('specialty')}
                className="input-field"
                placeholder="Ej: Fade y degradados, Cortes clásicos..."
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Bio profesional</label>
              <textarea
                {...profForm.register('bio')}
                className="input-field resize-none"
                rows={3}
                placeholder="Cuéntale a tus clientes sobre tu experiencia..."
              />
              <p className="text-xs text-dark-500 text-right mt-1">
                {profForm.watch('bio')?.length ?? 0}/300
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setEditProf(false); profForm.reset() }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saveProf.isPending} className="btn-primary flex-1 justify-center">
                {saveProf.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        )}
      </Section>

      {/* ── Información personal ────────────────────────────── */}
      <Section
        title="Información personal"
        icon={User}
        editing={editUser}
        onEdit={() => setEditUser(true)}
        onCancel={() => { setEditUser(false); userForm.reset() }}
      >
        {!editUser ? (
          <div className="space-y-3">
            <InfoRow label="Nombre" value={`${user?.firstName} ${user?.lastName}`} />
            <InfoRow label="Email" value={user?.email ?? '—'} icon={<Mail size={14} className="text-dark-500" />} />
            <InfoRow label="Teléfono" value={user?.phone || '—'} icon={<Phone size={14} className="text-dark-500" />} />
            {userSaved && <SavedBadge />}
          </div>
        ) : (
          <form onSubmit={userForm.handleSubmit((d) => saveUser.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Nombre</label>
                <input {...userForm.register('firstName')} className="input-field" />
                {userForm.formState.errors.firstName?.message && (
                  <p className="text-red-400 text-xs mt-1">{String(userForm.formState.errors.firstName.message)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Apellido</label>
                <input {...userForm.register('lastName')} className="input-field" />
                {userForm.formState.errors.lastName?.message && (
                  <p className="text-red-400 text-xs mt-1">{String(userForm.formState.errors.lastName.message)}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <input value={user?.email} disabled className="input-field opacity-40 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
              <input {...userForm.register('phone')} className="input-field" placeholder="+57 300 000 0000" />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setEditUser(false); userForm.reset() }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saveUser.isPending} className="btn-primary flex-1 justify-center">
                {saveUser.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        )}
      </Section>

      {/* ── Reseñas recibidas ───────────────────────────────── */}
      {(reviews?.length ?? 0) > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Star size={16} className="text-gold-500" /> Reseñas recibidas
          </h3>
          <div className="space-y-3">
            {reviews!.slice(0, 5).map((r: any) => (
              <div key={r.id} className="bg-dark-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center text-dark-950 text-xs font-bold">
                      {r.client?.firstName?.[0]}{r.client?.lastName?.[0]}
                    </div>
                    <span className="text-white text-sm font-medium">
                      {r.client?.firstName} {r.client?.lastName}
                    </span>
                  </div>
                  <Stars rating={r.rating} size={13} />
                </div>
                {r.comment && (
                  <p className="text-dark-400 text-sm italic">"{r.comment}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seguridad ────────────────────────────────────────── */}
      <Section
        title="Seguridad"
        icon={Shield}
        editing={editPass}
        onEdit={() => setEditPass(true)}
        onCancel={() => { setEditPass(false); passForm.reset(); setPassError('') }}
      >
        {!editPass ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-dark-800 flex items-center justify-center">
              <BadgeCheck size={18} className="text-dark-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Contraseña</p>
              <p className="text-dark-500 text-xs">••••••••</p>
            </div>
            {passOk && <SavedBadge />}
          </div>
        ) : (
          <form
            onSubmit={passForm.handleSubmit((d) => { setPassError(''); savePass.mutate(d) })}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Contraseña actual</label>
              <input
                {...passForm.register('currentPassword')}
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
              {passForm.formState.errors.currentPassword?.message && (
                <p className="text-red-400 text-xs mt-1">{String(passForm.formState.errors.currentPassword.message)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input
                    {...passForm.register('newPassword')}
                    type={showNew ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passForm.formState.errors.newPassword?.message && (
                  <p className="text-red-400 text-xs mt-1">{String(passForm.formState.errors.newPassword.message)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Confirmar</label>
                <input
                  {...passForm.register('confirm')}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {passForm.formState.errors.confirm?.message && (
                  <p className="text-red-400 text-xs mt-1">{String(passForm.formState.errors.confirm.message)}</p>
                )}
              </div>
            </div>
            {passError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {passError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setEditPass(false); passForm.reset(); setPassError('') }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button type="submit" disabled={savePass.isPending} className="btn-primary flex-1 justify-center">
                {savePass.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Actualizar
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  )
}

/* ─── Helper component ───────────────────────────────────────── */
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
      <span className="text-dark-500 text-sm flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-dark-200 text-sm font-medium">{value}</span>
    </div>
  )
}
