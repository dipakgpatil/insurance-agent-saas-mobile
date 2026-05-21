/**
 * Title-case a name. Excel imports often arrive in SCREAMING_CASE
 * ("YOGESH JYOTI DESHMUKH") which feels shouty in dense UI. We
 * normalise to "Yogesh Jyoti Deshmukh" while preserving things
 * that look intentional (mixed-case with at least one lowercase).
 */
export function titleCaseName(input: string | null | undefined): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (!trimmed) return ''
  const hasLower = /[a-z]/.test(trimmed)
  const hasUpper = /[A-Z]/.test(trimmed)
  if (hasLower && hasUpper) return trimmed
  return trimmed
    .toLowerCase()
    .replace(/(^|\s|[-'])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}
