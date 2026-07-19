import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Package, Plus, Edit2, Trash2, Loader2,
  AlertTriangle, Wrench, Droplets, Settings, MoreHorizontal,
  Minus, DollarSign,
} from 'lucide-react'
import { inventoryApi } from '@/api/inventory.api'
import { barbershopsApi } from '@/api/barbershops.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import type { InventoryItem, InventoryCategory } from '@/types'

/* ─── Category config ─────────────────────────────────────────── */
const CATEGORIES: { key: InventoryCategory | 'ALL'; label: string; icon: React.ElementType }[] = [
  { key: 'ALL',       label: 'Todos',        icon: Package  },
  { key: 'PRODUCT',   label: 'Productos',    icon: Droplets },
  { key: 'TOOL',      label: 'Herramientas', icon: Wrench   },
  { key: 'EQUIPMENT', label: 'Equipos',      icon: Settings },
  { key: 'OTHER',     label: 'Otros',        icon: MoreHorizontal },
]

const CAT_LABEL: Record<InventoryCategory, string> = {
  PRODUCT:   'Producto',
  TOOL:      'Herramienta',
  EQUIPMENT: 'Equipo',
  OTHER:     'Otro',
}

const CAT_COLOR: Record<InventoryCategory, string> = {
  PRODUCT:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TOOL:      'bg-orange-500/10 text-orange-400 border-orange-500/20',
  EQUIPMENT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OTHER:     'bg-dark-600/50 text-dark-400 border-dark-500/20',
}

/* ─── Schema ──────────────────────────────────────────────────── */
const schema = z.object({
  name:        z.string().min(2, 'Requerido'),
  category:    z.enum(['TOOL', 'PRODUCT', 'EQUIPMENT', 'OTHER']),
  quantity:    z.coerce.number().int().min(0, 'Mínimo 0'),
  minQuantity: z.coerce.number().int().min(0, 'Mínimo 0'),
  unitPrice:   z.coerce.number().min(0).optional(),
  notes:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

/* ─── Main ────────────────────────────────────────────────────── */
export default function OwnerInventoryPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [catFilter, setCatFilter] = useState<InventoryCategory | 'ALL'>('ALL')
  const [modal, setModal] = useState<{ open: boolean; editing?: InventoryItem }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  /* Shop */
  const { data: barbershops, isLoading: loadingShop } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const shop = barbershops?.find((b) => b.ownerId === user?.id)

  /* Items */
  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', shop?.id],
    queryFn: () => inventoryApi.getAll(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  /* Form */
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: modal.editing ? {
      name:        modal.editing.name,
      category:    modal.editing.category,
      quantity:    modal.editing.quantity,
      minQuantity: modal.editing.minQuantity,
      unitPrice:   modal.editing.unitPrice ?? 0,
      notes:       modal.editing.notes ?? '',
    } : { name: '', category: 'PRODUCT', quantity: 0, minQuantity: 0, unitPrice: 0, notes: '' },
  })

  const closeModal = () => { setModal({ open: false }); reset() }

  /* Mutations */
  const save = useMutation({
    mutationFn: (d: FormData & { barbershopId: string }) => {
      return modal.editing
        ? inventoryApi.update(modal.editing.id, d)
        : inventoryApi.create(d)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); closeModal() },
  })

  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => {
      const item = items?.find((i) => i.id === id)!
      const newQty = Math.max(0, item.quantity + delta)
      return inventoryApi.update(id, { quantity: newQty })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setDeleteId(null) },
  })

  if (isLoading || loadingShop) return <PageLoader />

  const all      = items ?? []
  const lowStock = all.filter((i) => i.quantity <= i.minQuantity)
  const filtered = catFilter === 'ALL' ? all : all.filter((i) => i.category === catFilter)
  const totalValue = all.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Inventario</h2>
          <p className="text-dark-400 text-sm mt-0.5">
            {all.length} ítem{all.length !== 1 ? 's' : ''} · {lowStock.length > 0 ? `${lowStock.length} con stock bajo` : 'stock ok'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={18} /> Agregar ítem
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total ítems',  value: all.length,                         color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: Package },
          { label: 'Stock bajo',   value: lowStock.length,                    color: lowStock.length > 0 ? 'text-red-400' : 'text-green-400', bg: lowStock.length > 0 ? 'bg-red-500/10' : 'bg-green-500/10', icon: AlertTriangle },
          { label: 'Valor total',  value: formatCurrency(totalValue),         color: 'text-gold-400',   bg: 'bg-gold-500/10',   icon: DollarSign },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm">Stock bajo en {lowStock.length} ítem{lowStock.length !== 1 ? 's' : ''}</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              {lowStock.map((i) => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const count = key === 'ALL' ? all.length : all.filter((i) => i.category === key).length
          return (
            <button
              key={key}
              onClick={() => setCatFilter(key as InventoryCategory | 'ALL')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                catFilter === key
                  ? 'gold-gradient text-dark-950 border-transparent'
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-500 hover:text-white',
              )}
            >
              <Icon size={14} />
              {label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-bold',
                catFilter === key ? 'bg-dark-950/20' : 'bg-dark-700 text-dark-400',
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Empty */}
      {!all.length && (
        <div className="glass-card">
          <EmptyState
            icon={Package}
            title="Inventario vacío"
            description="Registra productos, herramientas y equipos de tu barbería"
            action={
              <button className="btn-primary mt-2" onClick={() => setModal({ open: true })}>
                <Plus size={16} /> Agregar ítem
              </button>
            }
          />
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Precio unit.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isLow = item.quantity <= item.minQuantity
                return (
                  <tr key={item.id} className={isLow ? 'bg-red-500/5' : ''}>
                    {/* Name */}
                    <td>
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          {item.notes && <p className="text-dark-500 text-xs mt-0.5 truncate max-w-[180px]">{item.notes}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <Badge className={CAT_COLOR[item.category]}>{CAT_LABEL[item.category]}</Badge>
                    </td>

                    {/* Stock */}
                    <td>
                      <div className="flex items-center gap-2">
                        {/* Quick adjust */}
                        <button
                          onClick={() => adjust.mutate({ id: item.id, delta: -1 })}
                          disabled={item.quantity === 0 || adjust.isPending}
                          className="w-6 h-6 rounded-md bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-300 hover:text-white transition-colors disabled:opacity-30"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={cn(
                          'text-sm font-bold w-8 text-center',
                          isLow ? 'text-red-400' : 'text-white',
                        )}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => adjust.mutate({ id: item.id, delta: 1 })}
                          disabled={adjust.isPending}
                          className="w-6 h-6 rounded-md bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-300 hover:text-white transition-colors disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                        {item.minQuantity > 0 && (
                          <span className="text-dark-600 text-xs">/ mín {item.minQuantity}</span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="text-dark-300">
                      {item.unitPrice ? formatCurrency(item.unitPrice) : <span className="text-dark-600">—</span>}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal({ open: true, editing: item })}
                          className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty filtered */}
      {all.length > 0 && filtered.length === 0 && (
        <div className="glass-card py-10 text-center">
          <p className="text-dark-400">Sin ítems en esta categoría</p>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.editing ? 'Editar ítem' : 'Agregar ítem'}
      >
        <form onSubmit={handleSubmit((d) => save.mutate({ ...d, barbershopId: shop!.id }))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nombre *</label>
            <input {...register('name')} className="input-field" placeholder="Ej: Máquina de corte Wahl" />
            {errors.name?.message && <p className="text-red-400 text-xs mt-1">{String(errors.name.message)}</p>}
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Categoría *</label>
            <select {...register('category')} className="input-field">
              <option value="PRODUCT">Producto</option>
              <option value="TOOL">Herramienta</option>
              <option value="EQUIPMENT">Equipo</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Cantidad actual *</label>
              <input {...register('quantity')} type="number" min={0} className="input-field" placeholder="0" />
              {errors.quantity?.message && <p className="text-red-400 text-xs mt-1">{String(errors.quantity.message)}</p>}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Stock mínimo</label>
              <input {...register('minQuantity')} type="number" min={0} className="input-field" placeholder="0" />
              <p className="text-dark-600 text-xs mt-1">Alerta si baja de este valor</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Precio unitario</label>
            <div className="relative">
              <input {...register('unitPrice')} type="number" min={0} step="0.01" className="input-field pl-8" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                <DollarSign size={14} />
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Notas</label>
            <textarea {...register('notes')} className="input-field resize-none" rows={2}
              placeholder="Marca, proveedor, detalles..." />
          </div>

          {save.isError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(save.error as any)?.response?.data?.message ?? 'Error al guardar'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
              {modal.editing ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar ítem" className="max-w-sm">
        <div className="space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <Trash2 size={26} className="text-red-400" />
          </div>
          <p className="text-center text-white">
            ¿Eliminar <span className="font-semibold text-gold-400">
              {all.find((i) => i.id === deleteId)?.name}
            </span>?
          </p>
          <p className="text-center text-dark-400 text-sm -mt-3">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => deleteId && remove.mutate(deleteId)}
              disabled={remove.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {remove.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
