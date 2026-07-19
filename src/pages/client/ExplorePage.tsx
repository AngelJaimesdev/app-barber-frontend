import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Phone, Star, Scissors, ChevronRight } from 'lucide-react'
import { barbershopsApi } from '@/api/barbershops.api'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'

export default function ExplorePage() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const { data: barbershops, isLoading } = useQuery({
    queryKey: ['barbershops'],
    queryFn: () => barbershopsApi.getAll().then((r) => r.data.data),
  })

  const filtered = barbershops?.filter((b) =>
    b.name.toLowerCase().includes(q.toLowerCase()) ||
    b.address.toLowerCase().includes(q.toLowerCase())
  )

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Explorar barberías</h2>
        <p className="text-dark-400 text-sm mt-1">Encuentra tu barbería favorita y reserva una cita</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o dirección..."
          className="input-field pl-11 py-3"
        />
      </div>

      {!filtered?.length ? (
        <div className="glass-card"><EmptyState icon={Scissors} title="No se encontraron barberías" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((shop) => (
            <div
              key={shop.id}
              onClick={() => navigate(`/client/book/${shop.id}`)}
              className="glass-card p-5 cursor-pointer hover:border-gold-600/50 hover:shadow-lg hover:shadow-gold-900/10 transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Scissors size={24} className="text-dark-950" />
                </div>
                <ChevronRight size={18} className="text-dark-500 group-hover:text-gold-400 transition-colors mt-1" />
              </div>

              <h3 className="font-bold text-white text-lg mb-1">{shop.name}</h3>
              {shop.description && <p className="text-dark-400 text-sm mb-3 line-clamp-2">{shop.description}</p>}

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <MapPin size={13} className="text-gold-500" />{shop.address}
                </div>
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <Phone size={13} className="text-gold-500" />{shop.phone}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between">
                <div className="flex items-center gap-1 text-yellow-400 text-sm">
                  <Star size={14} fill="currentColor" /><span className="font-medium">4.8</span>
                  <span className="text-dark-500 text-xs">(24 reseñas)</span>
                </div>
                <span className="text-xs text-dark-400">{shop.services?.length ?? 0} servicios</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
