export type Role = 'SUPER_ADMIN' | 'OWNER' | 'BARBER' | 'CLIENT'

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface Barbershop {
  id: string
  name: string
  description?: string
  address: string
  phone: string
  email?: string
  logoUrl?: string
  isActive: boolean
  ownerId: string
  workingHours?: Record<string, { open: string; close: string }>
  createdAt: string
  owner?: User
  barbers?: Barber[]
  services?: Service[]
}

export interface Barber {
  id: string
  userId: string
  barbershopId: string
  specialty?: string
  bio?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  user?: User
  barbershop?: Barbershop
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  durationMins: number
  barbershopId: string
  isActive: boolean
  createdAt: string
  barbershop?: Barbershop
}

export interface Appointment {
  id: string
  clientId: string
  barberId: string
  serviceId: string
  barbershopId: string
  date: string
  notes?: string
  status: AppointmentStatus
  createdAt: string
  client?: User
  barber?: Barber
  service?: Service
  barbershop?: Barbershop
}

export type InventoryCategory = 'TOOL' | 'PRODUCT' | 'EQUIPMENT' | 'OTHER'

export interface InventoryItem {
  id: string
  barbershopId: string
  name: string
  category: InventoryCategory
  quantity: number
  minQuantity: number
  unitPrice?: number
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Promotion {
  id: string
  barbershopId: string
  title: string
  description?: string
  discountPercent: number
  validFrom: string
  validTo: string
  isActive: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}
