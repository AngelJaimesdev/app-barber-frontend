import api from './client'
import type { Appointment, AppointmentStatus } from '@/types'

export const appointmentsApi = {
  getAll: () => api.get<{ data: Appointment[] }>('/appointments'),
  getOne: (id: string) => api.get<{ data: Appointment }>(`/appointments/${id}`),
  create: (data: { barberId: string; serviceId: string; barbershopId: string; date: string; notes?: string }) =>
    api.post('/appointments', data),
  updateStatus: (id: string, status: AppointmentStatus) =>
    api.patch(`/appointments/${id}/status`, { status }),
  reschedule: (id: string, date: string) =>
    api.patch(`/appointments/${id}/reschedule`, { date }),
  cancel: (id: string) => api.patch(`/appointments/${id}/cancel`),
}
