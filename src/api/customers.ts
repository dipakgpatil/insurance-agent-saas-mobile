import { apiRequest } from './client'
import type { CustomerRead } from './types'

export function listCustomers(token: string): Promise<CustomerRead[]> {
  return apiRequest<CustomerRead[]>('/customers?limit=1000', { token })
}

export function fetchCustomer(token: string, customerId: string): Promise<CustomerRead> {
  return apiRequest<CustomerRead>(`/customers/${customerId}`, { token })
}
