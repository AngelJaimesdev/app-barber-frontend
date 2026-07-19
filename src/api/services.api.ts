import api from './client'
import type { Service } from '@/types'

export const servicesApi = {
  getAll: (barbershopId?: string) =>
    api.get<{ data: Service[] }>('/services', { params: barbershopId ? { barbershopId } : {} }),
  getOne: (id: string) => api.get<{ data: Service }>(`/services/${id}`),
  create: (data: { name: string; price: number; durationMins: number; barbershopId: string; description?: string }) =>
    api.post('/services', data),
  update: (id: string, data: Partial<Service>) => api.patch(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
}
