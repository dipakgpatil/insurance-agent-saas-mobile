export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return startOfDay(parsed)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const SHORT_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
})

export function formatDate(date: Date): string {
  return DATE_FMT.format(date)
}

export function formatDateShort(date: Date): string {
  return SHORT_FMT.format(date)
}

export function relativeRenewal(renewal: Date, today = startOfDay(new Date())): string {
  const diff = daysBetween(today, renewal)
  if (diff < -1) return `${Math.abs(diff)}d overdue`
  if (diff === -1) return 'Yesterday'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return `In ${diff} days`
  if (diff <= 30) return `In ${diff} days`
  return formatDate(renewal)
}
