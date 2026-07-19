import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, Eye, EyeOff, Loader2, User, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

type RoleOption = 'CLIENT' | 'BARBER' | 'OWNER'

const ROLE_OPTIONS: Array<{ value: RoleOption; label: string; sub: string; icon: React.ReactNode }> = [
  {
    value: 'CLIENT',
    label: 'Cliente',
    sub: 'Reserva y gestiona tus citas',
    icon: <User size={22} />,
  },
  {
    value: 'BARBER',
    label: 'Barbero',
    sub: 'Consulta tu agenda del día',
    icon: <Scissors size={22} />,
  },
  {
    value: 'OWNER',
    label: 'Barbería',
    sub: 'Administra tu negocio completo',
    icon: <Store size={22} />,
  },
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleOption>('CLIENT')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const ROLE_MAP: Record<RoleOption, string[]> = {
    CLIENT: ['CLIENT'],
    BARBER: ['BARBER'],
    OWNER: ['OWNER', 'SUPER_ADMIN'],
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.login(data.email, data.password)
      const { user, accessToken, refreshToken } = res.data.data

      const allowedRoles = ROLE_MAP[selectedRole]
      if (!allowedRoles.includes(user.role)) {
        const label = ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label
        setError(`Esta cuenta no tiene acceso como "${label}". Verifica el perfil seleccionado.`)
        return
      }

      setAuth(user, accessToken, refreshToken)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciales inválidas')
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-barber-pattern bg-dark-900">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950/90 via-dark-900/70 to-gold-900/20" />
        <div className="absolute top-0 left-0 w-2 h-full barber-pole opacity-60" />
        <div className="absolute top-0 right-0 w-2 h-full barber-pole opacity-60" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mb-6 shadow-2xl shadow-gold-900/50">
            <Scissors size={36} className="text-dark-950" />
          </div>
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-gold-gradient">Barber</span>
            <span className="text-white">Pro</span>
          </h1>
          <p className="text-dark-400 text-lg mb-12">La plataforma profesional para gestionar tu barbería</p>

          <div className="space-y-4 text-left w-full max-w-sm">
            {[
              ['💈', 'Gestiona múltiples barberías'],
              ['✂️', 'Administra tus barberos y servicios'],
              ['📅', 'Control total de citas y agenda'],
              ['📊', 'Dashboard con métricas en tiempo real'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 bg-dark-800/50 rounded-lg px-4 py-3 border border-dark-700">
                <span className="text-xl">{icon}</span>
                <span className="text-dark-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-dark-600 text-xs">© 2026 BarberPro · Todos los derechos reservados</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <Scissors size={20} className="text-dark-950" />
            </div>
            <span className="text-2xl font-bold text-gold-gradient">BarberPro</span>
          </div>

          <div className="mb-7">
            <h2 className="text-3xl font-bold text-white mb-1">Bienvenido de vuelta</h2>
            <p className="text-dark-400">Selecciona tu perfil e ingresa tus credenciales</p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark-300 mb-3">¿Cómo ingresas?</label>
            <div className="grid grid-cols-3 gap-2.5">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedRole(opt.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center',
                    selectedRole === opt.value
                      ? 'border-gold-500 bg-gold-500/10 text-white shadow-lg shadow-gold-900/20'
                      : 'border-dark-600 bg-dark-800/50 text-dark-400 hover:border-dark-500 hover:text-dark-200 hover:bg-dark-800'
                  )}
                >
                  {/* Active indicator */}
                  {selectedRole === opt.value && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold-500" />
                  )}

                  <div className={cn(
                    'p-2 rounded-lg transition-colors',
                    selectedRole === opt.value ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-700 text-dark-400'
                  )}>
                    {opt.icon}
                  </div>

                  <div>
                    <p className={cn(
                      'text-sm font-semibold',
                      selectedRole === opt.value ? 'text-white' : 'text-dark-300'
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-dark-500 leading-tight mt-0.5 hidden sm:block">
                      {opt.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-dark-700" />
            <span className="text-dark-500 text-xs">credenciales</span>
            <div className="flex-1 h-px bg-dark-700" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                placeholder="tu@email.com"
                className="input-field"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {isSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Ingresando...</>
                : `Ingresar como ${ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}`
              }
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
