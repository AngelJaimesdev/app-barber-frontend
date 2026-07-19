import api from './client'
import type { Barber } from '@/types'

export const barbersApi = {
  getAll: (barbershopId?: string) =>
    api.get<{ data: Barber[] }>('/barbers', { params: barbershopId ? { barbershopId } : {} }),
  getOne: (id: string) => api.get<{ data: Barber }>(`/barbers/${id}`),
  getMe: () => api.get('/barbers/me'),
  updateMe: (data: { specialty?: string; bio?: string }) => api.patch('/barbers/me', data),
  create: (data: { userId: string; barbershopId: string; specialty?: string; bio?: string }) =>
    api.post('/barbers', data),
  update: (id: string, data: Partial<Barber>) => api.patch(`/barbers/${id}`, data),
  delete: (id: string) => api.delete(`/barbers/${id}`),
}
