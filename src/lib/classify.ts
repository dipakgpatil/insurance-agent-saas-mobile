import type { PolicyRead } from '@/api/types'

export type PolicyCategory = 'health' | 'car' | 'bike' | 'life' | 'other'

export const CATEGORIES: PolicyCategory[] = ['health', 'car', 'bike', 'life', 'other']

export const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  health: 'Health',
  car: 'Car',
  bike: 'Bike',
  life: 'Life',
  other: 'Other',
}

export function classifyPolicy(policy: PolicyRead): PolicyCategory {
  const haystack = [
    policy.policy_name ?? '',
    JSON.stringify(policy.policy_extra_data ?? {}),
  ]
    .join(' ')
    .toLowerCase()

  const hasMotor = /motor|vehicle/.test(haystack)
  const hasBike = /bike|two[-_ ]?wheeler|scooter|2w|motorcycle/.test(haystack)
  const hasCar = /\bcar\b|four[-_ ]?wheeler|comprehensive|third[-_ ]?party|4w/.test(haystack)
  const hasHealth = /health|mediclaim|hospital|floater/.test(haystack)
  const hasLife = /\blife\b|term[-_ ]?life|term plan|endowment/.test(haystack)

  if (hasBike) return 'bike'
  if (hasCar) return 'car'
  if (hasMotor) return 'car'
  if (hasHealth) return 'health'
  if (hasLife) return 'life'
  return 'other'
}
