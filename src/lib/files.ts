export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200) || 'document'
}

export function extensionForMime(mime: string | null | undefined, fallback = 'bin'): string {
  if (!mime) return fallback
  const lower = mime.toLowerCase()
  if (lower.includes('pdf')) return 'pdf'
  if (lower.includes('jpeg')) return 'jpg'
  if (lower.includes('png')) return 'png'
  if (lower.includes('webp')) return 'webp'
  if (lower.includes('csv')) return 'csv'
  if (lower.includes('spreadsheet') || lower.includes('excel')) return 'xlsx'
  if (lower.includes('msword') || lower.includes('word')) return 'docx'
  return fallback
}
