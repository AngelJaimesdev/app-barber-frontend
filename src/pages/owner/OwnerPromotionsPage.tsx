import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Tag, Plus, Edit2, Loader2, CalendarDays,
  ToggleLeft, ToggleRight, Percent,
} from 'lucide-react'
import { promotionsApi } from '@/api/promotions.api'
import { barbershopsApi } from '@/api/barbershops.api'
import { useAuthStore } from '@/store/auth.store'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Promotion } from '@/types'

/* ─── Schema ──────────────────────────────────────────────────── */
const schema = z.object({
  title:          z.string().min(2, 'Requerido'),
  description:    z.string().optional(),
  discountPercent: z.coerce.number().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
  validFrom:      z.string().min(1, 'Requerido'),
  validTo:        z.string().min(1, 'Requerido'),
}).refine((d) => new Date(d.validTo) > new Date(d.validFrom), {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['validTo'],
})
type FormData = z.infer<typeof schema>

/* ─── Promotion status ────────────────────────────────────────── */
function promoStatus(p: Promotion): 'active' | 'upcoming' | 'expired' | 'disabled' {
  if (!p.isActive) return 'disabled'
  const now = new Date()
  if (isBefore(now, parseISO(p.validFrom))) return 'upcoming'
  if (isAfter(now, parseISO(p.validTo)))   return 'expired'
  return 'active'
}

const STATUS_CONFIG = {
  active:   { label: 'Activa',      color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  upcoming: { label: 'Próxima',     color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  expired:  { label: 'Expirada',    color: 'bg-dark-600/50 text-dark-400 border-dark-500/20' },
  disabled: { label: 'Desactivada', color: 'bg-dark-600/50 text-dark-400 border-dark-500/20' },
}

function formatRange(from: string, to: string) {
  return `${format(parseISO(from), 'd MMM', { locale: es })} – ${format(parseISO(to), 'd MMM yyyy', { locale: es })}`
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function OwnerPromotionsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; editing?: Promotion }>({ open: false })

  /* Find owner's shop */
  const { data: barbershops, isLoading: loadingShop } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })
  const shop = barbershops?.find((b) => b.ownerId === user?.id)

  const { data: promos, isLoading } = useQuery<Promotion[]>({
    queryKey: ['promotions', shop?.id],
    queryFn: () => promotionsApi.getAll(shop!.id).then((r) => r.data.data),
    enabled: !!shop?.id,
  })

  /* Form */
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: modal.editing ? {
      title:          modal.editing.title,
      description:    modal.editing.description ?? '',
      discountPercent: modal.editing.discountPercent,
      validFrom:      modal.editing.validFrom.slice(0, 10),
      validTo:        modal.editing.validTo.slice(0, 10),
    } : undefined,
  })

  const closeModal = () => { setModal({ open: false }); reset() }

  /* Mutations */
  const save = useMutation({
    mutationFn: (d: FormData) => {
      const payload = { ...d, barbershopId: shop!.id }
      return modal.editing
        ? promotionsApi.update(modal.editing.id, payload)
        : promotionsApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions'] }); closeModal() },
  })

  const toggle = useMutation({
    mutationFn: (p: Promotion) => promotionsApi.update(p.id, { isActive: !p.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })

  if (isLoading || loadingShop) return <PageLoader />

  const active   = (promos ?? []).filter((p: Promotion) => promoStatus(p) === 'active')
  const upcoming = (promos ?? []).filter((p: Promotion) => promoStatus(p) === 'upcoming')
  const rest     = (promos ?? []).filter((p: Promotion) => ['expired', 'disabled'].includes(promoStatus(p)))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-bold text-white">Promociones</h2>
          <p className="text-dark-400 text-sm mt-0.5">
            {active.length} activa{active.length !== 1 ? 's' : ''} · {promos?.length ?? 0} en total
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={18} /> Nueva promoción
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Activas',   value: active.length,   color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Próximas',  value: upcoming.length, color: 'text-blue-400',  bg: 'bg-blue-500/10' },
          { label: 'Historial', value: rest.length,     color: 'text-dark-400',  bg: 'bg-dark-700' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-dark-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Empty */}
      {!promos?.length && (
        <div className="glass-card">
          <EmptyState
            icon={Tag}
            title="Sin promociones"
            description="Crea tu primera promoción para atraer más clientes"
            action={
              <button className="btn-primary mt-2" onClick={() => setModal({ open: true })}>
                <Plus size={16} /> Crear promoción
              </button>
            }
          />
        </div>
      )}

      {/* Active + upcoming */}
      {[...active, ...upcoming].length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Vigentes ({[...active, ...upcoming].length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...active, ...upcoming].map((p) => (
              <PromoCard key={p.id} promo={p}
                onEdit={() => setModal({ open: true, editing: p })}
                onToggle={() => toggle.mutate(p)}
                toggling={toggle.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expired / disabled */}
      {rest.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Historial ({rest.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rest.map((p) => (
              <PromoCard key={p.id} promo={p}
                onEdit={() => setModal({ open: true, editing: p })}
                onToggle={() => toggle.mutate(p)}
                toggling={toggle.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.editing ? 'Editar promoción' : 'Nueva promoción'}
      >
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Título *</label>
            <input {...register('title')} className="input-field" placeholder="Ej: Descuento de verano" />
            {errors.title?.message && (
              <p className="text-red-400 text-xs mt-1">{String(errors.title.message)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
            <textarea {...register('description')} className="input-field resize-none" rows={2}
              placeholder="Detalle de la promoción..." />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descuento *</label>
            <div className="relative">
              <input
                {...register('discountPercent')}
                type="number" min={1} max={100}
                className="input-field pr-10"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
                <Percent size={16} />
              </span>
            </div>
            {errors.discountPercent?.message && (
              <p className="text-red-400 text-xs mt-1">{String(errors.discountPercent.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Válida desde *</label>
              <input {...register('validFrom')} type="date" className="input-field" />
              {errors.validFrom?.message && (
                <p className="text-red-400 text-xs mt-1">{String(errors.validFrom.message)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Válida hasta *</label>
              <input {...register('validTo')} type="date" className="input-field" />
              {errors.validTo?.message && (
                <p className="text-red-400 text-xs mt-1">{String(errors.validTo.message)}</p>
              )}
            </div>
          </div>

          {save.isError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(save.error as any)?.response?.data?.message ?? 'Error al guardar'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {modal.editing ? 'Guardar cambios' : 'Crear promoción'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ─── Promo card ──────────────────────────────────────────────── */
function PromoCard({ promo, onEdit, onToggle, toggling }: {
  promo: Promotion
  onEdit: () => void
  onToggle: () => void
  toggling: boolean
}) {
  const status = promoStatus(promo)
  const cfg    = STATUS_CONFIG[status]
  const isOn   = promo.isActive

  return (
    <div className={cn(
      'glass-card p-5 flex flex-col gap-4 transition-colors',
      status === 'active' && 'border-green-500/20',
      status === 'upcoming' && 'border-blue-500/20',
    )}>
      <div className="flex items-start gap-4">
        {/* Discount circle */}
        <div className={cn(
          'w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-bold shadow-lg',
          status === 'active'   ? 'gold-gradient text-dark-950 shadow-gold-900/30' :
          status === 'upcoming' ? 'bg-blue-500/20 text-blue-300' :
                                   'bg-dark-700 text-dark-500',
        )}>
          <span className="text-xl leading-none">{promo.discountPercent}%</span>
          <span className="text-xs font-normal opacity-70">OFF</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white font-semibold truncate">{promo.title}</h4>
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </div>
          {promo.description && (
            <p className="text-dark-400 text-sm mt-1 leading-relaxed line-clamp-2">{promo.description}</p>
          )}
          <p className="text-dark-500 text-xs mt-2 flex items-center gap-1.5">
            <CalendarDays size={12} /> {formatRange(promo.validFrom, promo.validTo)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-dark-800">
        <button
          onClick={onToggle}
          disabled={toggling || status === 'expired'}
          className={cn(
            'flex items-center gap-2 text-sm transition-colors disabled:opacity-40',
            isOn ? 'text-green-400 hover:text-red-400' : 'text-dark-500 hover:text-green-400',
          )}
        >
          {isOn
            ? <ToggleRight size={20} className="text-green-400" />
            : <ToggleLeft size={20} />
          }
          {isOn ? 'Activa' : 'Inactiva'}
        </button>

        <button onClick={onEdit} className="btn-secondary text-xs py-1.5 px-3">
          <Edit2 size={13} /> Editar
        </button>
      </div>
    </div>
  )
}
