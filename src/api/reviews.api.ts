import api from './client'

export const reviewsApi = {
  getMine: () => api.get('/reviews/my'),
  getByBarbershop: (id: string) => api.get(`/reviews/barbershop/${id}`),
  getByBarber: (id: string) => api.get(`/reviews/barber/${id}`),
  create: (data: { barbershopId?: string; barberId?: string; appointmentId?: string; rating: number; comment?: string }) =>
    api.post('/reviews', data),
}
