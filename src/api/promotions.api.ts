import api from './client'

export const promotionsApi = {
  getAll: (barbershopId: string) => api.get('/promotions', { params: { barbershopId } }),
  create: (data: any) => api.post('/promotions', data),
  update: (id: string, data: any) => api.patch(`/promotions/${id}`, data),
  remove: (id: string) => api.delete(`/promotions/${id}`),
}
