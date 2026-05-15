export type WishTemplate = {
  id: string
  label: string
  build: (name: string) => string
}

const firstName = (full: string) => {
  const trimmed = full.trim().split(/\s+/)[0]
  return trimmed || full
}

export const BIRTHDAY_WISHES: WishTemplate[] = [
  {
    id: 'warm',
    label: 'Warm & personal',
    build: (name) =>
      `Hi ${firstName(name)}, wishing you a very happy birthday! 🎉\n\nThank you for being a valued part of our family. May this year bring you health, happiness and many memorable moments. Stay blessed!`,
  },
  {
    id: 'short',
    label: 'Short & sweet',
    build: (name) => `Happy birthday ${firstName(name)}! 🎂 Wishing you a fantastic year ahead.`,
  },
  {
    id: 'formal',
    label: 'Formal',
    build: (name) =>
      `Dear ${firstName(name)},\n\nPlease accept our warmest birthday wishes. We sincerely appreciate the trust you place in us and look forward to serving you for many more years.\n\nKind regards`,
  },
  {
    id: 'with_offer',
    label: 'Birthday + check-in',
    build: (name) =>
      `Hi ${firstName(name)}, many happy returns of the day! 🎉\n\nAs you celebrate, it's a great time to review your policies — health, motor or life — and ensure your family stays covered. Reply here if you'd like a quick birthday review and I'll set it up.`,
  },
]

export function buildWishMessage(template: WishTemplate, name: string): string {
  return template.build(name)
}
