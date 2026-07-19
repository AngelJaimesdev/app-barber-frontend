import api from './client'
import type { Barbershop } from '@/types'

export const barbershopsApi = {
  getAll: () => api.get<{ data: Barbershop[] }>('/barbershops'),
  getOne: (id: string) => api.get<{ data: Barbershop }>(`/barbershops/${id}`),
  create: (data: Partial<Barbershop>) => api.post('/barbershops', data),
  update: (id: string, data: Partial<Barbershop>) => api.patch(`/barbershops/${id}`, data),
  delete: (id: string) => api.delete(`/barbershops/${id}`),
  getReports: (id: string) => api.get(`/barbershops/${id}/reports`),
}
