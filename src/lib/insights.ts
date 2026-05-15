import type { CustomerRead, PolicyRead } from '@/api/types'
import { addDays, parseDate, startOfDay } from './dates'

export type RenewalBucket = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'later'

export type RenewalEntry = {
  policy: PolicyRead
  customer: CustomerRead | undefined
  renewalDate: Date
  daysUntil: number
  bucket: RenewalBucket
}

export type BirthdayBucket = 'today' | 'tomorrow' | 'this_week' | 'later'

export type BirthdayEntry = {
  customer: CustomerRead
  nextBirthday: Date
  daysUntil: number
  age: number | null
  bucket: BirthdayBucket
}

export function buildCustomerMap(customers: CustomerRead[]): Map<string, CustomerRead> {
  return new Map(customers.map((customer) => [customer.id, customer]))
}

function bucketRenewal(renewalDate: Date, today = startOfDay(new Date())): RenewalBucket {
  const diff = Math.round((renewalDate.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'this_week'
  if (renewalDate.getFullYear() === today.getFullYear() && renewalDate.getMonth() === today.getMonth())
    return 'this_month'
  return 'later'
}

export function buildRenewals(
  policies: PolicyRead[],
  customers: CustomerRead[],
  today = startOfDay(new Date()),
): RenewalEntry[] {
  const customerMap = buildCustomerMap(customers)
  return policies
    .map((policy) => {
      const renewalDate = parseDate(policy.renewal_date)
      if (!renewalDate) return null
      const daysUntil = Math.round((renewalDate.getTime() - today.getTime()) / 86_400_000)
      return {
        policy,
        customer: customerMap.get(policy.customer_id),
        renewalDate,
        daysUntil,
        bucket: bucketRenewal(renewalDate, today),
      } satisfies RenewalEntry
    })
    .filter((entry): entry is RenewalEntry => entry !== null)
    .sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime())
}

export function renewalsByBucket(entries: RenewalEntry[]): Record<RenewalBucket, RenewalEntry[]> {
  const buckets: Record<RenewalBucket, RenewalEntry[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    this_month: [],
    later: [],
  }
  for (const entry of entries) buckets[entry.bucket].push(entry)
  return buckets
}

function bucketBirthday(diffDays: number): BirthdayBucket {
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'this_week'
  return 'later'
}

export function buildBirthdays(
  customers: CustomerRead[],
  horizonDays = 60,
  today = startOfDay(new Date()),
): BirthdayEntry[] {
  const horizon = addDays(today, horizonDays)
  return customers
    .map((customer): BirthdayEntry | null => {
      const dob = parseDate(customer.date_of_birth)
      if (!dob) return null
      const candidate = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
      if (candidate > horizon) return null
      const diffDays = Math.round((candidate.getTime() - today.getTime()) / 86_400_000)
      const age = candidate.getFullYear() - dob.getFullYear()
      return {
        customer,
        nextBirthday: candidate,
        daysUntil: diffDays,
        age: Number.isFinite(age) && age > 0 && age < 130 ? age : null,
        bucket: bucketBirthday(diffDays),
      }
    })
    .filter((entry): entry is BirthdayEntry => entry !== null)
    .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type MonthlyPoint = { label: string; renewals: number; done: number }

export function monthlyRenewals(
  policies: PolicyRead[],
  year = new Date().getFullYear(),
): MonthlyPoint[] {
  const today = startOfDay(new Date())
  const points: MonthlyPoint[] = MONTHS_SHORT.map((label) => ({ label, renewals: 0, done: 0 }))
  for (const policy of policies) {
    const renewalDate = parseDate(policy.renewal_date)
    if (!renewalDate || renewalDate.getFullYear() !== year) continue
    points[renewalDate.getMonth()].renewals += 1
    if (renewalDate < today || policy.status === 'renewed' || policy.status === 'closed') {
      points[renewalDate.getMonth()].done += 1
    }
  }
  return points
}
