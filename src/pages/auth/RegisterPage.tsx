import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, Eye, EyeOff, Loader2, User, Store, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import type { Role } from '@/types'

type PublicRole = 'CLIENT' | 'BARBER' | 'OWNER'

const ROLE_OPTIONS: Array<{
  value: PublicRole
  label: string
  sub: string
  icon: React.ReactNode
  perks: string[]
}> = [
  {
    value: 'CLIENT',
    label: 'Cliente',
    sub: 'Quiero reservar citas',
    icon: <User size={24} />,
    perks: ['Reserva citas online', 'Historial de visitas', 'Notificaciones de cita'],
  },
  {
    value: 'BARBER',
    label: 'Barbero',
    sub: 'Soy barbero profesional',
    icon: <Scissors size={24} />,
    perks: ['Gestiona tu agenda', 'Ve tus citas del día', 'Perfil profesional'],
  },
  {
    value: 'OWNER',
    label: 'Propietario',
    sub: 'Tengo una barbería',
    icon: <Store size={24} />,
    perks: ['Administra tu barbería', 'Gestiona barberos', 'Dashboard completo'],
  },
]

const schema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName:  z.string().min(2, 'Mínimo 2 caracteres'),
  email:     z.string().email('Email inválido'),
  phone:     z.string().optional(),
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  confirm:   z.string(),
  role:      z.enum(['CLIENT', 'BARBER', 'OWNER']),
}).refine((d) => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<PublicRole>('CLIENT')
  const [showPass, setShowPass]         = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [error, setError]               = useState('')
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CLIENT' },
  })

  const handleRoleSelect = (role: PublicRole) => {
    setSelectedRole(role)
    setValue('role', role)
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const { confirm, ...payload } = data
      const res = await authApi.register(payload)
      const { user, accessToken, refreshToken } = res.data.data
      setAuth(user, accessToken, refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear la cuenta')
    }
  }

  const active = ROLE_OPTIONS.find((r) => r.value === selectedRole)!

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-barber-pattern bg-dark-900 flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950/90 via-dark-900/70 to-gold-900/20" />
        <div className="absolute top-0 left-0 w-2 h-full barber-pole opacity-60" />

        <div className="relative z-10 flex flex-col justify-center h-full px-10">
          {/* Logo */}
          <Link to="/login" className="flex items-center gap-3 mb-12 w-fit">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <Scissors size={20} className="text-dark-950" />
            </div>
            <span className="text-xl font-bold text-gold-gradient">BarberPro</span>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-3">
            Únete a la<br />
            <span className="text-gold-gradient">comunidad barber</span>
          </h1>
          <p className="text-dark-400 mb-10">
            Más de 500 barberías y profesionales ya gestionan su negocio con BarberPro.
          </p>

          {/* Dynamic perks based on selected role */}
          <div className="space-y-3">
            <p className="text-dark-500 text-xs uppercase tracking-widest font-semibold">
              Como {active.label} tendrás acceso a:
            </p>
            {active.perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-gold-500 flex-shrink-0" />
                <span className="text-dark-300 text-sm">{perk}</span>
              </div>
            ))}
          </div>

          {/* Barber pole */}
          <div className="mt-10 h-1.5 rounded-full barber-pole opacity-40 max-w-xs" />
        </div>

        <div className="relative z-10 p-10 pt-0">
          <p className="text-dark-600 text-xs">© 2026 BarberPro · Todos los derechos reservados</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg py-4">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <Scissors size={20} className="text-dark-950" />
            </div>
            <span className="text-2xl font-bold text-gold-gradient">BarberPro</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
            <p className="text-dark-400 text-sm">¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">¿Cómo quieres usar BarberPro? *</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleSelect(opt.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 text-center',
                      selectedRole === opt.value
                        ? 'border-gold-500 bg-gold-500/10 shadow-lg shadow-gold-900/20'
                        : 'border-dark-600 bg-dark-800/50 hover:border-dark-500 hover:bg-dark-800'
                    )}
                  >
                    {selectedRole === opt.value && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold-500" />
                    )}
                    <div className={cn(
                      'p-2.5 rounded-xl transition-colors',
                      selectedRole === opt.value ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-700 text-dark-400'
                    )}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', selectedRole === opt.value ? 'text-white' : 'text-dark-300')}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-dark-500 leading-tight mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('role')} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-dark-700" />
              <span className="text-dark-500 text-xs">datos personales</span>
              <div className="flex-1 h-px bg-dark-700" />
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
                <input {...register('firstName')} className="input-field" placeholder="Juan" />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Apellido *</label>
                <input {...register('lastName')} className="input-field" placeholder="Pérez" />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email + phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Email *</label>
                <input {...register('email')} type="email" className="input-field" placeholder="tu@email.com" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
                <input {...register('phone')} className="input-field" placeholder="+57 300..." />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Confirmar *</label>
                <div className="relative">
                  <input
                    {...register('confirm')}
                    type={showConfirm ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base">
              {isSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
                : `Registrarme como ${active.label}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
