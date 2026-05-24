import { apiRequest } from './client'
import type { CustomerRead } from './types'

export type CustomerUpdateInput = {
  mobile?: string | null
  email?: string | null
}

export function listCustomers(token: string): Promise<CustomerRead[]> {
  return apiRequest<CustomerRead[]>('/customers?limit=1000', { token })
}

export function fetchCustomer(token: string, customerId: string): Promise<CustomerRead> {
  return apiRequest<CustomerRead>(`/customers/${customerId}`, { token })
}

export function updateCustomer(
  token: string,
  customerId: string,
  input: CustomerUpdateInput,
): Promise<CustomerRead> {
  return apiRequest<CustomerRead>(`/customers/${customerId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  })
}
