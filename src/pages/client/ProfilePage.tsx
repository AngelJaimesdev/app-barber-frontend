import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, Shield, Loader2, CheckCircle2, Eye, EyeOff, CalendarDays, DollarSign, Star } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { usersApi } from '@/api/users.api'
import { authApi } from '@/api/auth.api'
import { appointmentsApi } from '@/api/appointments.api'
import { reviewsApi } from '@/api/reviews.api'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, ROLE_LABELS } from '@/lib/utils'

const profileSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName:  z.string().min(2, 'Mínimo 2 caracteres'),
  phone:     z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const passSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(6, 'Mínimo 6 caracteres'),
  confirm:         z.string(),
}).refine((d) => d.newPassword === d.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] })
type PassForm = z.infer<typeof passSchema>

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const qc = useQueryClient()

  const [profileOk, setProfileOk] = useState(false)
  const [passOk, setPassOk]       = useState(false)
  const [passError, setPassError] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })
  const { data: reviews } = useQuery({
    queryKey: ['reviews-mine'],
    queryFn: () => reviewsApi.getMine().then((r) => r.data.data),
  })

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' },
  })

  const passForm = useForm<PassForm>({ resolver: zodResolver(passSchema) })

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => usersApi.update(user!.id, data),
    onSuccess: (res) => {
      setAuth({ ...user!, ...res.data.data }, accessToken!, refreshToken!)
      setProfileOk(true)
      setTimeout(() => setProfileOk(false), 3000)
    },
  })

  const changePass = useMutation({
    mutationFn: (data: PassForm) => authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => { setPassOk(true); passForm.reset(); setTimeout(() => setPassOk(false), 3000) },
    onError: (err: any) => setPassError(err.response?.data?.message ?? 'Error al cambiar contraseña'),
  })

  // Stats
  const completed  = appointments?.filter((a) => a.status === 'COMPLETED') ?? []
  const totalSpent = completed.reduce((s, a) => s + (Number(a.service?.price) || 0), 0)
  const avgRating  = reviews?.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  const stats = [
    { icon: CalendarDays, label: 'Citas completadas', value: completed.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: DollarSign,   label: 'Total gastado',     value: formatCurrency(totalSpent), color: 'text-gold-400', bg: 'bg-gold-500/10' },
    { icon: Star,         label: 'Rating promedio',   value: avgRating, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
        <p className="text-dark-400 text-sm mt-0.5">Gestiona tu información personal</p>
      </div>

      {/* Avatar + identity */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center text-dark-950 font-bold text-2xl flex-shrink-0 shadow-xl shadow-gold-900/30">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h3>
          <p className="text-dark-400 text-sm mt-0.5">{user?.email}</p>
          <div className="mt-2">
            <Badge className="bg-gold-500/10 text-gold-400 border-gold-500/20">
              <Shield size={11} className="mr-1" />
              {ROLE_LABELS[user?.role ?? 'CLIENT']}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit profile */}
      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <User size={16} className="text-gold-500" /> Información personal
        </h3>
        <form onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Nombre</label>
              <input {...profileForm.register('firstName')} className="input-field" />
              {profileForm.formState.errors.firstName && (
                <p className="text-red-400 text-xs mt-1">{profileForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Apellido</label>
              <input {...profileForm.register('lastName')} className="input-field" />
              {profileForm.formState.errors.lastName && (
                <p className="text-red-400 text-xs mt-1">{profileForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              <Mail size={13} className="inline mr-1" />Email
            </label>
            <input value={user?.email} disabled className="input-field opacity-50 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              <Phone size={13} className="inline mr-1" />Teléfono
            </label>
            <input {...profileForm.register('phone')} className="input-field" placeholder="+57 300..." />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
              {updateProfile.isPending && <Loader2 size={15} className="animate-spin" />}
              Guardar cambios
            </button>
            {profileOk && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={15} /> Guardado
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Shield size={16} className="text-gold-500" /> Cambiar contraseña
        </h3>
        <form onSubmit={passForm.handleSubmit((d) => { setPassError(''); changePass.mutate(d) })} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Contraseña actual</label>
            <div className="relative">
              <input
                {...passForm.register('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passForm.formState.errors.newPassword && (
                <p className="text-red-400 text-xs mt-1">{passForm.formState.errors.newPassword.message}</p>
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
              {passForm.formState.errors.confirm && (
                <p className="text-red-400 text-xs mt-1">{passForm.formState.errors.confirm.message}</p>
              )}
            </div>
          </div>

          {passError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{passError}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={changePass.isPending} className="btn-primary">
              {changePass.isPending && <Loader2 size={15} className="animate-spin" />}
              Actualizar contraseña
            </button>
            {passOk && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={15} /> Actualizada
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
