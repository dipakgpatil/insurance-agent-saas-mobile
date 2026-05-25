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
  id: string
  customer: CustomerRead
  personName: string
  relationship: string | null
  policyNumber: string | null
  nextBirthday: Date
  daysUntil: number
  age: number | null
  bucket: BirthdayBucket
  isPolicyMember: boolean
}

export type InsurerPolicyStat = {
  name: string
  count: number
  percent: number
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

export function buildUpcomingRenewals(
  policies: PolicyRead[],
  customers: CustomerRead[],
  horizonDays = 60,
  today = startOfDay(new Date()),
): RenewalEntry[] {
  return buildRenewals(policies, customers, today).filter(
    (entry) => isOpenPolicyStatus(entry.policy.status) && entry.daysUntil >= 0 && entry.daysUntil <= horizonDays,
  )
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
  policies: PolicyRead[] = [],
  horizonDays = 60,
  today = startOfDay(new Date()),
): BirthdayEntry[] {
  const horizon = addDays(today, horizonDays)
  return birthdayCandidates(customers, policies)
    .map((candidate): BirthdayEntry | null => {
      const dob = parseBirthdayDate(candidate.dateOfBirth)
      if (!dob) return null
      const nextBirthday = new Date(today.getFullYear(), dob.month, dob.day)
      if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1)
      if (nextBirthday > horizon) return null
      const diffDays = Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000)
      const age = dob.year ? nextBirthday.getFullYear() - dob.year : null
      return {
        ...candidate,
        nextBirthday,
        daysUntil: diffDays,
        age: age !== null && age > 0 && age < 130 ? age : null,
        bucket: bucketBirthday(diffDays),
      }
    })
    .filter((entry): entry is BirthdayEntry => entry !== null)
    .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime())
}

export function policiesByInsurer(policies: PolicyRead[], limit = 6): InsurerPolicyStat[] {
  const counts = new Map<string, number>()
  for (const policy of policies) {
    const name = policyInsurerName(policy) ?? 'Unknown insurer'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const total = policies.length || 1
  const sorted = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const visible = sorted.slice(0, limit)
  const hidden = sorted.slice(limit)
  if (hidden.length) {
    visible.push({
      name: 'Other insurers',
      count: hidden.reduce((sum, item) => sum + item.count, 0),
    })
  }
  return visible.map((item) => ({
    ...item,
    percent: Math.round((item.count / total) * 100),
  }))
}

function isOpenPolicyStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').toLowerCase()
  return normalized === '' || normalized === 'active'
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

type BirthdayCandidate = {
  id: string
  customer: CustomerRead
  personName: string
  relationship: string | null
  policyNumber: string | null
  dateOfBirth: string
  isPolicyMember: boolean
}

function birthdayCandidates(customers: CustomerRead[], policies: PolicyRead[]): BirthdayCandidate[] {
  const customerMap = buildCustomerMap(customers)
  const seen = new Set<string>()
  const candidates: BirthdayCandidate[] = []

  for (const customer of customers) {
    if (!customer.date_of_birth) continue
    const key = birthdayKey(customer.id, customer.full_name, customer.date_of_birth)
    seen.add(key)
    candidates.push({
      id: `customer:${customer.id}`,
      customer,
      personName: customer.full_name,
      relationship: null,
      policyNumber: null,
      dateOfBirth: customer.date_of_birth,
      isPolicyMember: false,
    })
  }

  for (const policy of policies) {
    const customer = customerMap.get(policy.customer_id)
    if (!customer) continue
    for (const member of insuredMembers(policy)) {
      if (!member.dateOfBirth) continue
      const key = birthdayKey(customer.id, member.name, member.dateOfBirth)
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({
        id: `policy-member:${policy.id}:${member.name}:${member.dateOfBirth}`,
        customer,
        personName: member.name,
        relationship: member.relationship,
        policyNumber: policy.policy_number,
        dateOfBirth: member.dateOfBirth,
        isPolicyMember: true,
      })
    }
  }

  return candidates
}

function insuredMembers(policy: PolicyRead): { name: string; relationship: string | null; dateOfBirth: string | null }[] {
  const extraction = objectValue(policy.policy_extra_data.document_extraction)
  const raw = objectValue(extraction?.raw_extracted_json) ?? objectValue(policy.policy_extra_data.raw_extracted_json)
  const rawMembers =
    arrayValue(policy.policy_extra_data.insured_members) ??
    arrayValue(extraction?.insured_members) ??
    arrayValue(raw?.insured_members)

  if (!rawMembers) return []
  return rawMembers
    .map((item) => objectValue(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .sort((a, b) => {
      const left = textValue(a.name) ?? ''
      const right = textValue(b.name) ?? ''
      return left.localeCompare(right)
    })
    .flatMap((item) => {
      const name = textValue(item.name)
      if (!name) return []
      return [
        {
          name,
          relationship: textValue(item.relationship) ?? textValue(item.relationship_with_proposer) ?? null,
          dateOfBirth: textValue(item.date_of_birth) ?? textValue(item.dob) ?? textValue(item.birth_date) ?? null,
        },
      ]
    })
}

function policyInsurerName(policy: PolicyRead): string | null {
  const extraction = objectValue(policy.policy_extra_data.document_extraction)
  const raw = objectValue(extraction?.raw_extracted_json) ?? objectValue(policy.policy_extra_data.raw_extracted_json)
  return (
    textValue(policy.policy_extra_data.insurer_name) ??
    textValue(extraction?.insurer_name) ??
    textValue(raw?.insurer_name) ??
    textValue(raw?.detected_insurer) ??
    null
  )
}

function birthdayKey(customerId: string, name: string, dob: string): string {
  const parsed = parseBirthdayDate(dob)
  const birthday = parsed ? `${parsed.month + 1}-${parsed.day}-${parsed.year ?? 'yyyy'}` : dob.toLowerCase()
  return `${customerId}:${name.trim().toLowerCase()}:${birthday}`
}

function parseBirthdayDate(value: string | null | undefined): { day: number; month: number; year: number | null } | null {
  if (!value) return null
  const parsed = parseDate(value)
  if (parsed) return { day: parsed.getDate(), month: parsed.getMonth(), year: parsed.getFullYear() }

  const cleaned = value
    .trim()
    .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')

  const numeric = cleaned.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2]) - 1
    const year = normalizeYear(numeric[3])
    return validDayMonth(day, month) ? { day, month, year } : null
  }

  const monthToken = '(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)'
  const dayMonth = cleaned.match(new RegExp(`^(\\d{1,2})\\s*[- ]?\\s*${monthToken}(?:\\s*[-, ]\\s*(\\d{2,4}))?$`, 'i'))
  if (dayMonth) {
    const day = Number(dayMonth[1])
    const month = monthIndex(dayMonth[2])
    const year = normalizeYear(dayMonth[3])
    return month !== null && validDayMonth(day, month) ? { day, month, year } : null
  }

  const monthDay = cleaned.match(new RegExp(`^${monthToken}\\s*[- ]?\\s*(\\d{1,2})(?:\\s*[-, ]\\s*(\\d{2,4}))?$`, 'i'))
  if (monthDay) {
    const month = monthIndex(monthDay[1])
    const day = Number(monthDay[2])
    const year = normalizeYear(monthDay[3])
    return month !== null && validDayMonth(day, month) ? { day, month, year } : null
  }

  return null
}

function normalizeYear(value: string | undefined): number | null {
  if (!value) return null
  const year = Number(value)
  if (!Number.isFinite(year)) return null
  if (year < 100) return year > 30 ? 1900 + year : 2000 + year
  return year
}

function validDayMonth(day: number, month: number): boolean {
  return Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= 31 && month >= 0 && month <= 11
}

function monthIndex(value: string): number | null {
  const token = value.toLowerCase().slice(0, 3)
  const index = MONTHS_SHORT.findIndex((month) => month.toLowerCase() === token)
  return index >= 0 ? index : null
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function arrayValue(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function textValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return String(value).trim() || undefined
}
