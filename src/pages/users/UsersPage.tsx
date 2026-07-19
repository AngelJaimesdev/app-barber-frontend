import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, UserX, UserPlus, Loader2, Scissors, Store, User } from 'lucide-react'
import { usersApi } from '@/api/users.api'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ROLE_LABELS, formatDate, cn } from '@/lib/utils'
import type { Role } from '@/types'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
  OWNER: 'bg-gold-500/10 text-gold-400 border-gold-500/20',
  BARBER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CLIENT: 'bg-dark-600/50 text-dark-400 border-dark-500/20',
}

const ROLE_OPTIONS: Array<{ value: Role; label: string; sub: string; icon: React.ReactNode }> = [
  { value: 'CLIENT',     label: 'Cliente',     sub: 'Puede reservar citas',         icon: <User size={20} /> },
  { value: 'BARBER',     label: 'Barbero',     sub: 'Atiende citas en barbería',    icon: <Scissors size={20} /> },
  { value: 'OWNER',      label: 'Propietario', sub: 'Administra su barbería',       icon: <Store size={20} /> },
  { value: 'SUPER_ADMIN',label: 'Super Admin', sub: 'Acceso total a la plataforma', icon: <Users size={20} /> },
]

const schema = z.object({
  firstName: z.string().min(2, 'Requerido'),
  lastName:  z.string().min(2, 'Requerido'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  phone:     z.string().optional(),
  role:      z.enum(['CLIENT', 'BARBER', 'OWNER', 'SUPER_ADMIN']),
})
type FormData = z.infer<typeof schema>

export default function UsersPage() {
  const [modal, setModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>('CLIENT')
  const qc = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CLIENT' },
  })

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setValue('role', role)
  }

  const create = useMutation({
    mutationFn: (data: FormData) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModal(false)
      reset()
      setSelectedRole('CLIENT')
    },
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  if (isLoading) return <PageLoader />

  const closeModal = () => { setModal(false); reset(); setSelectedRole('CLIENT') }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Usuarios</h2>
          <p className="text-dark-400 text-sm mt-0.5">{users?.length ?? 0} registrados</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <UserPlus size={18} /> Crear usuario
        </button>
      </div>

      {!users?.length ? (
        <div className="glass-card">
          <EmptyState icon={Users} title="Sin usuarios" description="Crea el primer usuario de la plataforma" action={
            <button className="btn-primary mt-2" onClick={() => setModal(true)}><UserPlus size={16} /> Crear usuario</button>
          } />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-dark-950 font-bold text-xs flex-shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-white font-medium">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="text-dark-300">{u.email}</td>
                    <td className="text-dark-300">{u.phone ?? '—'}</td>
                    <td>
                      <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td>
                      <Badge className={u.isActive
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-dark-600/50 text-dark-400 border-dark-500/20'}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="text-dark-400 text-xs">{formatDate(u.createdAt)}</td>
                    <td>
                      {u.isActive && (
                        <button
                          onClick={() => deactivate.mutate(u.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                          title="Desactivar usuario"
                        >
                          <UserX size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create user modal */}
      <Modal open={modal} onClose={closeModal} title="Crear usuario" className="max-w-lg">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">Tipo de usuario *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleRoleSelect(opt.value)}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left',
                    selectedRole === opt.value
                      ? 'border-gold-500 bg-gold-500/10'
                      : 'border-dark-600 bg-dark-800/50 hover:border-dark-500 hover:bg-dark-800'
                  )}
                >
                  {selectedRole === opt.value && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold-500" />
                  )}
                  <div className={cn(
                    'p-2 rounded-lg flex-shrink-0',
                    selectedRole === opt.value ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-700 text-dark-400'
                  )}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', selectedRole === opt.value ? 'text-white' : 'text-dark-300')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-dark-500">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('role')} />
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

          {/* Email */}
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Email *</label>
            <input {...register('email')} type="email" className="input-field" placeholder="juan@email.com" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Password + phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Contraseña *</label>
              <input {...register('password')} type="password" className="input-field" placeholder="••••••••" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
              <input {...register('phone')} className="input-field" placeholder="+57 300..." />
            </div>
          </div>

          {create.isError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {(create.error as any)?.response?.data?.message ?? 'Error al crear usuario'}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1 justify-center">
              {create.isPending && <Loader2 size={16} className="animate-spin" />}
              Crear {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
