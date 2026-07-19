import api from './client'
import type { User } from '@/types'

export const usersApi = {
  getAll: () => api.get<{ data: User[] }>('/users'),
  getOne: (id: string) => api.get<{ data: User }>(`/users/${id}`),
  create: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string; role: string }) =>
    api.post('/users', data),
  update: (id: string, data: Partial<User>) => api.patch(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
}
