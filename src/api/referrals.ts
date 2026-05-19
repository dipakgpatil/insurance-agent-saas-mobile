import { apiRequest } from './client'
import type {
  MyReferralEventsResponse,
  MyReferralResponse,
  MyRewardsResponse,
  ReferralBenefitRead,
  ReferralValidationResponse,
} from './types'

export function validateReferralCode(code: string) {
  return apiRequest<ReferralValidationResponse>(`/referrals/validate?code=${encodeURIComponent(code)}`)
}

export function getMyReferral(token: string) {
  return apiRequest<MyReferralResponse>('/me/referral', { token })
}

export function generateMyReferral(token: string) {
  return apiRequest<MyReferralResponse>('/me/referral/generate', { method: 'POST', token })
}

export function getMyReferralEvents(token: string) {
  return apiRequest<MyReferralEventsResponse>('/me/referral/events', { token })
}

export function getMyRewards(token: string) {
  return apiRequest<MyRewardsResponse>('/me/rewards', { token })
}

export function getReferralBenefit(token: string) {
  return apiRequest<ReferralBenefitRead | null>('/me/referral-benefit', { token })
}
