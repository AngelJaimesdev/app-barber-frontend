import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Zap, Clock, DollarSign, Edit2, Trash2, Loader2 } from 'lucide-react'
import { servicesApi } from '@/api/services.api'
import { barbershopsApi } from '@/api/barbershops.api'
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
  barbershopId: z.string().uuid('Selecciona una barbería'),
})
type FormData = z.infer<typeof schema>

export default function ServicesPage() {
  const [modal, setModal] = useState<{ open: boolean; editing?: Service }>({ open: false })
  const qc = useQueryClient()

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll().then((r) => r.data.data),
  })
  const { data: barbershops } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: modal.editing
      ? { name: modal.editing.name, description: modal.editing.description ?? '', price: modal.editing.price, durationMins: modal.editing.durationMins, barbershopId: modal.editing.barbershopId }
      : undefined,
  })

  const save = useMutation({
    mutationFn: (data: FormData) =>
      modal.editing ? servicesApi.update(modal.editing!.id, data) : servicesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setModal({ open: false }); reset() },
  })

  const remove = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Servicios</h2>
          <p className="text-dark-400 text-sm mt-0.5">{services?.length ?? 0} disponibles</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={18} /> Nuevo servicio
        </button>
      </div>

      {!services?.length ? (
        <div className="glass-card">
          <EmptyState icon={Zap} title="Sin servicios" description="Crea los servicios que ofrece tu barbería" action={
            <button className="btn-primary mt-2" onClick={() => setModal({ open: true })}><Plus size={16} /> Crear servicio</button>
          } />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Barbería</th>
                <th>Precio</th>
                <th>Duración</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id}>
                  <td>
                    <div>
                      <p className="text-white font-medium">{svc.name}</p>
                      {svc.description && <p className="text-dark-500 text-xs mt-0.5">{svc.description}</p>}
                    </div>
                  </td>
                  <td>{svc.barbershop?.name ?? '—'}</td>
                  <td>
                    <div className="flex items-center gap-1.5 text-gold-400 font-semibold">
                      <DollarSign size={14} />
                      {formatCurrency(svc.price)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-dark-300">
                      <Clock size={14} />
                      {svc.durationMins} min
                    </div>
                  </td>
                  <td>
                    <Badge className={svc.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-dark-600/50 text-dark-400 border-dark-500/20'}>
                      {svc.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ open: true, editing: svc })} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => remove.mutate(svc.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} onClose={() => { setModal({ open: false }); reset() }} title={modal.editing ? 'Editar servicio' : 'Nuevo servicio'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
            <input {...register('name')} className="input-field" placeholder="Corte de cabello clásico" />
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
            <label className="block text-sm text-dark-300 mb-1.5">Barbería *</label>
            <select {...register('barbershopId')} className="input-field">
              <option value="">Seleccionar barbería...</option>
              {barbershops?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.barbershopId && <p className="text-red-400 text-xs mt-1">{errors.barbershopId.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
            <textarea {...register('description')} className="input-field resize-none" rows={2} placeholder="Descripción del servicio..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setModal({ open: false }); reset() }} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending && <Loader2 size={16} className="animate-spin" />}
              {modal.editing ? 'Guardar' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
