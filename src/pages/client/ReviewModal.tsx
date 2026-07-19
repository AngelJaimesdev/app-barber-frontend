import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { reviewsApi } from '@/api/reviews.api'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types'

interface Props {
  appointment: Appointment | null
  onClose: () => void
}

export default function ReviewModal({ appointment, onClose }: Props) {
  const qc = useQueryClient()
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone]       = useState(false)

  const create = useMutation({
    mutationFn: () => reviewsApi.create({
      barbershopId: appointment!.barbershopId,
      barberId:     appointment!.barberId,
      appointmentId: appointment!.id,
      rating,
      comment: comment.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews-mine'] }); setDone(true) },
  })

  const handleClose = () => {
    onClose(); setRating(0); setHovered(0); setComment(''); setDone(false)
  }

  if (!appointment) return null

  return (
    <Modal open={!!appointment} onClose={handleClose} title="Dejar reseña">
      {done ? (
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <div className="text-5xl">⭐</div>
          <p className="text-white font-bold text-lg">¡Gracias por tu reseña!</p>
          <p className="text-dark-400 text-sm">Tu opinión ayuda a otros clientes a elegir mejor.</p>
          <button onClick={handleClose} className="btn-primary mt-2 px-8">Cerrar</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Barbershop + service info */}
          <div className="bg-dark-800 rounded-xl p-4">
            <p className="text-white font-medium">{appointment.barbershop?.name}</p>
            <p className="text-dark-400 text-sm mt-0.5">
              {appointment.service?.name}
              {appointment.barber?.user && ` · ${appointment.barber.user.firstName} ${appointment.barber.user.lastName}`}
            </p>
          </div>

          {/* Stars */}
          <div>
            <p className="text-sm text-dark-300 mb-3 text-center">¿Cómo calificarías tu experiencia?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={cn(
                      'transition-colors',
                      star <= (hovered || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-dark-600'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm mt-2 text-dark-300">
                {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Cuéntanos tu experiencia..."
              maxLength={300}
            />
            <p className="text-right text-dark-500 text-xs mt-1">{comment.length}/300</p>
          </div>

          {create.isError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Error al enviar la reseña. Intenta de nuevo.
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={handleClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => create.mutate()}
              disabled={rating === 0 || create.isPending}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {create.isPending && <Loader2 size={16} className="animate-spin" />}
              Publicar reseña
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
