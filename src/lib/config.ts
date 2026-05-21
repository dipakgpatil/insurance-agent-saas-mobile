import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string
  googleWebClientId?: string
  googleIosClientId?: string
  googleAndroidClientId?: string
}

const API_VERSION_PATH = '/api/v1'
const fallbackBaseUrl = 'https://api.policyoffice.in/api/v1'

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl

function normalizeApiBaseUrl(value?: string) {
  const rawValue = value && value.trim().length > 0 ? value : fallbackBaseUrl
  const trimmed = rawValue.replace(/\/+$/, '')
  return /\/api\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}${API_VERSION_PATH}`
}

export const API_BASE_URL = normalizeApiBaseUrl(fromEnv)

export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.googleWebClientId ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.googleIosClientId ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.googleAndroidClientId ?? '',
}
