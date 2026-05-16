import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string
  googleWebClientId?: string
  googleIosClientId?: string
  googleAndroidClientId?: string
}

const fallbackBaseUrl = 'https://insurance-agent-saas-production.up.railway.app/api/v1'

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl

export const API_BASE_URL = (fromEnv && fromEnv.trim().length > 0 ? fromEnv : fallbackBaseUrl).replace(
  /\/+$/,
  '',
)

export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.googleWebClientId ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.googleIosClientId ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.googleAndroidClientId ?? '',
}

