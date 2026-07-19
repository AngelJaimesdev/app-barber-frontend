import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Scissors, Edit2, Trash2, Loader2, User } from 'lucide-react'
import { barbersApi } from '@/api/barbers.api'
import { barbershopsApi } from '@/api/barbershops.api'
import { usersApi } from '@/api/users.api'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'

const schema = z.object({
  userId: z.string().uuid('Selecciona un usuario'),
  barbershopId: z.string().uuid('Selecciona una barbería'),
  specialty: z.string().optional(),
  bio: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BarbersPage() {
  const [modal, setModal] = useState(false)
  const qc = useQueryClient()

  const { data: barbers, isLoading } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.getAll().then((r) => r.data.data),
  })
  const { data: barbershops } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const create = useMutation({
    mutationFn: (data: FormData) => barbersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); setModal(false); reset() },
  })

  const remove = useMutation({
    mutationFn: (id: string) => barbersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })

  if (isLoading) return <PageLoader />

  const clientUsers = users?.filter((u) => u.role === 'BARBER' || u.role === 'CLIENT') ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Barberos</h2>
          <p className="text-dark-400 text-sm mt-0.5">{barbers?.length ?? 0} profesionales</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={18} /> Agregar barbero
        </button>
      </div>

      {!barbers?.length ? (
        <div className="glass-card">
          <EmptyState icon={Scissors} title="Sin barberos" description="Agrega tu primer barbero para comenzar" action={
            <button className="btn-primary mt-2" onClick={() => setModal(true)}><Plus size={16} /> Agregar barbero</button>
          } />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {barbers.map((barber) => (
            <div key={barber.id} className="glass-card p-5 flex flex-col gap-4 hover:border-gold-700/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0">
                  {barber.avatarUrl ? (
                    <img src={barber.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <User size={24} className="text-gold-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">
                    {barber.user ? `${barber.user.firstName} ${barber.user.lastName}` : '—'}
                  </h3>
                  <p className="text-dark-400 text-sm truncate">{barber.specialty ?? 'Sin especialidad'}</p>
                  <Badge className={barber.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20 mt-1' : 'bg-dark-600/50 text-dark-400 border-dark-500/20 mt-1'}>
                    {barber.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <button onClick={() => remove.mutate(barber.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors self-start">
                  <Trash2 size={15} />
                </button>
              </div>

              {barber.bio && <p className="text-dark-400 text-sm leading-relaxed">{barber.bio}</p>}

              <div className="pt-3 border-t border-dark-700">
                <p className="text-xs text-dark-500">
                  Barbería: <span className="text-dark-300">{barber.barbershop?.name ?? '—'}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Agregar barbero">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Usuario *</label>
            <select {...register('userId')} className="input-field">
              <option value="">Seleccionar usuario...</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
              ))}
            </select>
            {errors.userId && <p className="text-red-400 text-xs mt-1">{errors.userId.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Barbería *</label>
            <select {...register('barbershopId')} className="input-field">
              <option value="">Seleccionar barbería...</option>
              {barbershops?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.barbershopId && <p className="text-red-400 text-xs mt-1">{errors.barbershopId.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Especialidad</label>
            <input {...register('specialty')} className="input-field" placeholder="Ej: Cortes clásicos, Fade..." />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Bio</label>
            <textarea {...register('bio')} className="input-field resize-none" rows={3} placeholder="Descripción del barbero..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setModal(false); reset() }} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1 justify-center">
              {create.isPending && <Loader2 size={16} className="animate-spin" />}
              Agregar barbero
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
