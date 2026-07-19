import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, Plus, Scissors, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { reviewsApi } from '@/api/reviews.api'
import { appointmentsApi } from '@/api/appointments.api'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ReviewModal from './ReviewModal'
import type { Appointment } from '@/types'

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-dark-600'}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [reviewing, setReviewing] = useState<Appointment | null>(null)

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews-mine'],
    queryFn: () => reviewsApi.getMine().then((r) => r.data.data),
  })

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll().then((r) => r.data.data),
  })

  if (isLoading) return <PageLoader />

  const reviewedIds = new Set(reviews?.map((r: any) => r.appointmentId).filter(Boolean))
  const pendingReview = appointments?.filter(
    (a) => a.status === 'COMPLETED' && !reviewedIds.has(a.id)
  ) ?? []

  const avgRating = reviews?.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Mis Reseñas</h2>
        <p className="text-dark-400 text-sm mt-0.5">{reviews?.length ?? 0} reseñas publicadas</p>
      </div>

      {/* Summary */}
      {reviews?.length > 0 && (
        <div className="glass-card p-5 flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-gold-400">{avgRating.toFixed(1)}</p>
            <StarDisplay rating={Math.round(avgRating)} />
            <p className="text-dark-400 text-xs mt-1">{reviews.length} reseñas</p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r: any) => r.rating === star).length
              const pct   = reviews.length ? (count / reviews.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="text-dark-400 w-3">{star}</span>
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-dark-500 w-4 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending reviews */}
      {pendingReview.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Pendientes de reseñar ({pendingReview.length})
          </h3>
          <div className="space-y-2">
            {pendingReview.map((appt) => (
              <div key={appt.id} className="glass-card p-4 flex items-center gap-4 border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Star size={18} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{appt.service?.name}</p>
                  <p className="text-dark-400 text-xs">
                    {appt.barbershop?.name} · {format(parseISO(appt.date), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                <button
                  onClick={() => setReviewing(appt)}
                  className="btn-primary text-xs py-1.5 whitespace-nowrap"
                >
                  <Plus size={13} /> Reseñar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My reviews */}
      <div>
        <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
          Mis reseñas
        </h3>
        {!reviews?.length ? (
          <div className="glass-card">
            <EmptyState
              icon={Star}
              title="Sin reseñas aún"
              description="Completa una cita y deja tu opinión sobre la barbería"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review: any) => (
              <div key={review.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">
                      {review.barbershop?.name ?? review.barber?.user
                        ? `${review.barber?.user?.firstName} ${review.barber?.user?.lastName}`
                        : 'Barbería'}
                    </p>
                    {review.appointment?.service?.name && (
                      <p className="text-dark-400 text-xs mt-0.5 flex items-center gap-1">
                        <Scissors size={11} />{review.appointment.service.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <StarDisplay rating={review.rating} />
                    <p className="text-dark-500 text-xs mt-1">
                      {format(parseISO(review.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-dark-300 text-sm italic border-l-2 border-gold-600 pl-3">
                    "{review.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewModal appointment={reviewing} onClose={() => setReviewing(null)} />
    </div>
  )
}
