import { apiRequest } from './client'
import type { PolicyRead } from './types'

export function listPolicies(token: string): Promise<PolicyRead[]> {
  return apiRequest<PolicyRead[]>('/policies?limit=1000', { token })
}

export function fetchPolicy(token: string, policyId: string): Promise<PolicyRead> {
  return apiRequest<PolicyRead>(`/policies/${policyId}`, { token })
}

export function listUpcomingRenewals(token: string): Promise<PolicyRead[]> {
  return apiRequest<PolicyRead[]>('/policies/renewals/upcoming', { token })
}
