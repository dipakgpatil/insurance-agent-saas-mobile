import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import type { AuthSessionResult } from 'expo-auth-session'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import type { GoogleAuthResponse } from '@/api/types'
import { useAuth } from '@/context/useAuth'
import { googleClientIds } from '@/lib/config'

WebBrowser.maybeCompleteAuthSession()

const MISSING_GOOGLE_CLIENT_ID = 'google-client-id-not-configured'

type GoogleAuthFlowOptions = {
  verb: 'sign in' | 'sign up'
  onAuthenticated: (response: GoogleAuthResponse) => void
}

function currentPlatformClientId() {
  if (Platform.OS === 'android') return googleClientIds.android.trim()
  if (Platform.OS === 'ios') return googleClientIds.ios.trim()
  return googleClientIds.web.trim()
}

function missingClientMessage() {
  if (Platform.OS === 'android') {
    return 'Google sign in needs EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for package com.policyoffice.mobile.'
  }
  if (Platform.OS === 'ios') {
    return 'Google sign in needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for bundle com.policyoffice.mobile.'
  }
  return 'Google sign in needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
}

function extractIdToken(response: AuthSessionResult) {
  if (response.type !== 'success') return null
  return (
    response.authentication?.idToken ??
    (typeof response.params.id_token === 'string' ? response.params.id_token : null)
  )
}

export function useGoogleAuthFlow({ verb, onAuthenticated }: GoogleAuthFlowOptions) {
  const { loginWithGoogle } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformClientId = useMemo(() => currentPlatformClientId(), [])
  const isConfigured = platformClientId.length > 0

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: isConfigured ? platformClientId : MISSING_GOOGLE_CLIENT_ID,
    androidClientId: googleClientIds.android.trim() || undefined,
    iosClientId: googleClientIds.ios.trim() || undefined,
    webClientId: googleClientIds.web.trim() || undefined,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  })

  useEffect(() => {
    let cancelled = false

    async function handleResponse() {
      if (!response) return

      if (response.type === 'cancel' || response.type === 'dismiss') {
        setSubmitting(false)
        return
      }

      if (response.type === 'error') {
        setError(response.error?.message ?? `Google ${verb} failed. Please try again.`)
        setSubmitting(false)
        return
      }

      const idToken = extractIdToken(response)
      if (!idToken) {
        setError('Google did not return an identity token. Check the OAuth client configuration.')
        setSubmitting(false)
        return
      }

      try {
        const authResponse = await loginWithGoogle(idToken)
        if (!cancelled) onAuthenticated(authResponse)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : `Google ${verb} failed`)
      } finally {
        if (!cancelled) setSubmitting(false)
      }
    }

    void handleResponse()

    return () => {
      cancelled = true
    }
  }, [loginWithGoogle, onAuthenticated, response, verb])

  const start = useCallback(async () => {
    setError(null)
    if (!isConfigured) {
      setError(missingClientMessage())
      return
    }
    setSubmitting(true)
    const result = await promptAsync()
    if (result.type !== 'success') {
      setSubmitting(false)
    }
  }, [isConfigured, promptAsync])

  return {
    request,
    submitting,
    error,
    start,
    clearError: () => setError(null),
  }
}
