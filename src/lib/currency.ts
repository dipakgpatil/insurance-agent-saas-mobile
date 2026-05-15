export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const amount = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: string | number | null | undefined): string {
  return INR.format(toNumber(value))
}

export function compactCurrency(value: string | number | null | undefined): string {
  const amount = toNumber(value)
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(amount % 10_000_000 === 0 ? 0 : 1)}Cr`
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(amount % 100_000 === 0 ? 0 : 1)}L`
  }
  if (amount >= 1_000) {
    return `₹${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`
  }
  return formatCurrency(amount)
}
