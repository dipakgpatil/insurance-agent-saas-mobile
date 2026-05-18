import { Ionicons } from '@expo/vector-icons'
import * as Google from 'expo-auth-session/providers/google'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { googleClientIds } from '@/lib/config'
import { colors, spacing, typography } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

export default function SignupScreen() {
  const { loginWithGoogle } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    androidClientId: googleClientIds.android || undefined,
    iosClientId: googleClientIds.ios || undefined,
    webClientId: googleClientIds.web || undefined,
    scopes: ['openid', 'profile', 'email'],
  })

  const googleConfigured = Boolean(
    googleClientIds.web || googleClientIds.android || googleClientIds.ios,
  )

  useEffect(() => {
    let cancelled = false
    async function handleGoogleResponse() {
      if (!googleResponse) return
      if (googleResponse.type !== 'success') {
        setSubmitting(false)
        return
      }
      const idToken =
        googleResponse.authentication?.idToken ??
        (typeof googleResponse.params.id_token === 'string' ? googleResponse.params.id_token : null)
      if (!idToken) {
        setError('Google did not return an identity token. Check the OAuth client configuration.')
        setSubmitting(false)
        return
      }
      try {
        const response = await loginWithGoogle(idToken)
        if (cancelled) return
        if (response.onboarding_required || response.user.tenant_id === null) {
          router.replace('/onboarding/agency')
        } else {
          router.replace('/(tabs)')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Google signup failed')
      } finally {
        if (!cancelled) setSubmitting(false)
      }
    }
    void handleGoogleResponse()
    return () => {
      cancelled = true
    }
  }, [googleResponse, loginWithGoogle])

  const handleSignup = async () => {
    setError(null)
    if (!googleConfigured) {
      setError('Google signup is not configured yet. Add Android/iOS client IDs in app config.')
      return
    }
    setSubmitting(true)
    const result = await promptGoogle()
    if (result.type !== 'success') setSubmitting(false)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>P</Text>
          </View>
          <Text style={styles.brandText}>PolicyPulse</Text>
        </View>

        <Text style={styles.title}>Start your agency workspace</Text>
        <Text style={styles.subtitle}>
          Create an account with Google, set up your free plan, then upload your Excel
          sheet to onboard customers and policies from mobile.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        <Card style={styles.card}>
          <View style={styles.stepRow}>
            <Ionicons name="logo-google" size={18} color={colors.primary} />
            <Text style={styles.stepText}>Sign up securely with Google</Text>
          </View>
          <View style={styles.stepRow}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={styles.stepText}>Create your agency workspace on the free plan</Text>
          </View>
          <View style={styles.stepRow}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={styles.stepText}>Upload Excel and auto-import high-confidence columns</Text>
          </View>
        </Card>

        <Button
          label="Create account with Google"
          onPress={handleSignup}
          loading={submitting}
          disabled={!googleRequest}
          icon="logo-google"
        />

        <Pressable onPress={() => router.replace('/login')} style={styles.footerLink}>
          <Text style={styles.footerText}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
  },
  brandText: {
    ...typography.heading,
    color: colors.text,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  footerLink: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
})
