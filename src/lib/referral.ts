import AsyncStorage from '@react-native-async-storage/async-storage'

const REFERRAL_CODE_KEY = 'policypulse.referral_code.v1'

export function normalizeReferralCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 32)
}

export async function storeReferralCode(value: string) {
  const normalized = normalizeReferralCode(value)
  if (normalized.length >= 4) {
    await AsyncStorage.setItem(REFERRAL_CODE_KEY, normalized)
  }
  return normalized
}

export async function getStoredReferralCode() {
  return (await AsyncStorage.getItem(REFERRAL_CODE_KEY)) ?? ''
}

export async function clearStoredReferralCode() {
  await AsyncStorage.removeItem(REFERRAL_CODE_KEY)
}
