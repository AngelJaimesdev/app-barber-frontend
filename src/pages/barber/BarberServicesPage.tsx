import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Zap, Clock, DollarSign, Edit2, Trash2, Loader2 } from 'lucide-react'
import { servicesApi } from '@/api/services.api'
import { barbersApi } from '@/api/barbers.api'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Requerido'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Precio requerido'),
  durationMins: z.coerce.number().int().positive('Duración requerida'),
})
type FormData = z.infer<typeof schema>

export default function BarberServicesPage() {
  const [modal, setModal] = useState<{ open: boolean; editing?: Service }>({ open: false })
  const qc = useQueryClient()

  // Obtener el perfil del barbero para saber su barbershopId
  const { data: barberRes, isLoading: loadingBarber } = useQuery({
    queryKey: ['barber-me'],
    queryFn: () => barbersApi.getMe().then((r) => r.data.data),
  })

  const barbershopId = barberRes?.barbershopId

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', barbershopId],
    queryFn: () => servicesApi.getAll(barbershopId).then((r) => r.data.data),
    enabled: !!barbershopId,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: modal.editing
      ? { name: modal.editing.name, description: modal.editing.description ?? '', price: modal.editing.price, durationMins: modal.editing.durationMins }
      : undefined,
  })

  const save = useMutation({
    mutationFn: (data: FormData) =>
      modal.editing
        ? servicesApi.update(modal.editing!.id, data)
        : servicesApi.create({ ...data, barbershopId: barbershopId! }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })

  const closeModal = () => { setModal({ open: false }); reset() }

  if (isLoading || loadingBarber) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Mis Servicios</h2>
          <p className="text-dark-400 text-sm mt-0.5">
            {barberRes?.barbershop?.name} · {services?.length ?? 0} servicios
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={18} /> Nuevo servicio
        </button>
      </div>

      {!services?.length ? (
        <div className="glass-card">
          <EmptyState icon={Zap} title="Sin servicios" description="Agrega los servicios que ofreces"
            action={<button className="btn-primary mt-2" onClick={() => setModal({ open: true })}><Plus size={16} /> Crear servicio</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="glass-card p-5 flex flex-col gap-3 hover:border-gold-700/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{svc.name}</h3>
                    <Badge className={svc.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-dark-600/50 text-dark-400 border-dark-500/20'}>
                      {svc.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {svc.description && <p className="text-dark-400 text-sm">{svc.description}</p>}
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setModal({ open: true, editing: svc })}
                    className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => remove.mutate(svc.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-dark-700">
                <div className="flex items-center gap-1.5 text-gold-400 font-bold">
                  <DollarSign size={15} />{formatCurrency(svc.price)}
                </div>
                <div className="flex items-center gap-1.5 text-dark-300 text-sm">
                  <Clock size={14} />{svc.durationMins} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal.open} onClose={closeModal} title={modal.editing ? 'Editar servicio' : 'Nuevo servicio'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
            <input {...register('name')} className="input-field" placeholder="Ej: Corte clásico" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Precio (COP) *</label>
              <input {...register('price')} type="number" className="input-field" placeholder="25000" />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Duración (min) *</label>
              <input {...register('durationMins')} type="number" className="input-field" placeholder="30" />
              {errors.durationMins && <p className="text-red-400 text-xs mt-1">{errors.durationMins.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
            <textarea {...register('description')} className="input-field resize-none" rows={2} />
          </div>
          {save.isError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(save.error as any)?.response?.data?.message ?? 'Error al guardar el servicio'}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending && <Loader2 size={16} className="animate-spin" />}
              {modal.editing ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
