import { apiRequest } from './client'
import type { AgencyOnboardingRequest, AgencyOnboardingResponse } from './types'

export function completeAgencyOnboarding(
  token: string,
  payload: AgencyOnboardingRequest,
): Promise<AgencyOnboardingResponse> {
  return apiRequest<AgencyOnboardingResponse>('/onboarding/agency', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}
