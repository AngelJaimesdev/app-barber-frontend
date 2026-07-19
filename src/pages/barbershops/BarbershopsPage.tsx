import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Store, MapPin, Phone, Edit2, Trash2, Loader2 } from 'lucide-react'
import { barbershopsApi } from '@/api/barbershops.api'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { Barbershop } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Requerido'),
  address: z.string().min(5, 'Requerido'),
  phone: z.string().min(7, 'Requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BarbershopsPage() {
  const [modal, setModal] = useState<{ open: boolean; editing?: Barbershop }>({ open: false })
  const qc = useQueryClient()

  const { data: barbershops, isLoading } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: modal.editing
      ? { name: modal.editing.name, address: modal.editing.address, phone: modal.editing.phone, email: modal.editing.email ?? '', description: modal.editing.description ?? '' }
      : undefined,
  })

  const save = useMutation({
    mutationFn: (data: FormData) =>
      modal.editing ? barbershopsApi.update(modal.editing.id, data) : barbershopsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbershops'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: (id: string) => barbershopsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbershops'] }),
  })

  const closeModal = () => { setModal({ open: false }); reset() }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Barberías</h2>
          <p className="text-dark-400 text-sm mt-0.5">{barbershops?.length ?? 0} registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={18} /> Nueva barbería
        </button>
      </div>

      {/* Grid */}
      {!barbershops?.length ? (
        <div className="glass-card">
          <EmptyState icon={Store} title="Sin barberías" description="Crea tu primera barbería para comenzar" action={
            <button className="btn-primary mt-2" onClick={() => setModal({ open: true })}><Plus size={16} /> Crear barbería</button>
          } />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {barbershops.map((shop) => (
            <div key={shop.id} className="glass-card p-5 flex flex-col gap-4 hover:border-gold-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                    <Store size={22} className="text-dark-950" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{shop.name}</h3>
                    <Badge className={shop.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-dark-600/50 text-dark-400 border-dark-500/20'}>
                      {shop.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ open: true, editing: shop })} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => remove.mutate(shop.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {shop.description && <p className="text-dark-400 text-sm leading-relaxed">{shop.description}</p>}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <MapPin size={14} className="text-gold-500 flex-shrink-0" />
                  <span className="truncate">{shop.address}</span>
                </div>
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <Phone size={14} className="text-gold-500 flex-shrink-0" />
                  <span>{shop.phone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-700 flex gap-4 text-xs text-dark-500">
                <span>{shop.barbers?.length ?? 0} barberos</span>
                <span>{shop.services?.length ?? 0} servicios</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal.open} onClose={closeModal} title={modal.editing ? 'Editar barbería' : 'Nueva barbería'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
            <input {...register('name')} className="input-field" placeholder="Barbería El Estilo" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Dirección *</label>
            <input {...register('address')} className="input-field" placeholder="Calle 10 #5-20, Bogotá" />
            {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Teléfono *</label>
              <input {...register('phone')} className="input-field" placeholder="+57 300..." />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="info@barberia.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
            <textarea {...register('description')} className="input-field resize-none" rows={3} placeholder="Descripción de la barbería..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {modal.editing ? 'Guardar cambios' : 'Crear barbería'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
