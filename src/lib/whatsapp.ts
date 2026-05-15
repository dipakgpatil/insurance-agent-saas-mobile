import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'

export type SendWishOutcome =
  | { kind: 'whatsapp' }
  | { kind: 'sms' }
  | { kind: 'clipboard'; reason: string }
  | { kind: 'failed'; reason: string }

function normalizeMobile(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

/**
 * Try to open WhatsApp prefilled with the message. Fall back to SMS or clipboard.
 * Returns the outcome so the caller can show the user feedback.
 */
export async function sendWish({
  mobile,
  message,
}: {
  mobile: string | null | undefined
  message: string
}): Promise<SendWishOutcome> {
  const phone = normalizeMobile(mobile)
  const encoded = encodeURIComponent(message)

  if (phone) {
    // WhatsApp app deep link
    const waApp = `whatsapp://send?phone=${phone}&text=${encoded}`
    try {
      const supported = await Linking.canOpenURL(waApp)
      if (supported) {
        await Linking.openURL(waApp)
        return { kind: 'whatsapp' }
      }
    } catch {
      // continue to fallbacks
    }

    // WhatsApp web/universal link — works even without the app on iOS
    const waWeb = `https://wa.me/${phone}?text=${encoded}`
    try {
      await Linking.openURL(waWeb)
      return { kind: 'whatsapp' }
    } catch {
      // continue to fallbacks
    }

    // SMS fallback (Android delimiter is `?`, iOS accepts `&`)
    const smsUrl = `sms:${phone}?body=${encoded}`
    try {
      const supported = await Linking.canOpenURL(smsUrl)
      if (supported) {
        await Linking.openURL(smsUrl)
        return { kind: 'sms' }
      }
    } catch {
      // continue to fallbacks
    }
  }

  // Last resort: copy to clipboard so the user can paste anywhere.
  try {
    await Clipboard.setStringAsync(message)
    return {
      kind: 'clipboard',
      reason: phone
        ? 'WhatsApp and SMS were unavailable — message copied to clipboard.'
        : 'No mobile number on this customer — message copied to clipboard.',
    }
  } catch (error) {
    return {
      kind: 'failed',
      reason: error instanceof Error ? error.message : 'Could not send or copy the message.',
    }
  }
}
