import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/context/useAuth'
import { colors, spacing, typography } from '@/theme'

void WebBrowser.maybeCompleteAuthSession()

const CALLBACK_SETTLE_MS = 1800

export default function OAuthRedirectScreen() {
  const { user, initializing } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (initializing) return

      if (!user) {
        router.replace('/login')
        return
      }

      if (!user.tenant_id && user.user_type !== 'platform_admin') {
        router.replace('/onboarding/agency')
        return
      }

      router.replace('/(tabs)')
    }, CALLBACK_SETTLE_MS)

    return () => clearTimeout(timer)
  }, [initializing, user])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Finishing Google sign in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  text: {
    ...typography.body,
    color: colors.textMuted,
  },
})
