import api from './client'

export const inventoryApi = {
  getAll: (barbershopId: string) => api.get('/inventory', { params: { barbershopId } }),
  getLowStock: (barbershopId: string) => api.get('/inventory/low-stock', { params: { barbershopId } }),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.patch(`/inventory/${id}`, data),
  remove: (id: string) => api.delete(`/inventory/${id}`),
}
