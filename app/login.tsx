import { Ionicons } from '@expo/vector-icons'
import * as Google from 'expo-auth-session/providers/google'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { googleClientIds } from '@/lib/config'
import { colors, radii, spacing, typography } from '@/theme'

const DEMO_EMAIL = 'admin1@demoagt1.test'
const DEMO_PASSWORD = 'DemoPass123!'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
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
        setGoogleSubmitting(false)
        return
      }
      const idToken =
        googleResponse.authentication?.idToken ??
        (typeof googleResponse.params.id_token === 'string' ? googleResponse.params.id_token : null)
      if (!idToken) {
        setError('Google did not return an identity token. Check the OAuth client configuration.')
        setGoogleSubmitting(false)
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Google sign in failed')
      } finally {
        if (!cancelled) setGoogleSubmitting(false)
      }
    }
    void handleGoogleResponse()
    return () => {
      cancelled = true
    }
  }, [googleResponse, loginWithGoogle])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
      router.replace('/(tabs)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    if (!googleConfigured) {
      setError('Google sign in is not configured yet. Add the Android/iOS client IDs in .env.')
      return
    }
    setGoogleSubmitting(true)
    const result = await promptGoogle()
    if (result.type !== 'success') {
      setGoogleSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>P</Text>
            </View>
            <Text style={styles.brandText}>PolicyPulse</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to manage renewals, customers, and documents on the go.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <Button
            label="Continue with Google"
            onPress={handleGoogle}
            loading={googleSubmitting}
            disabled={!googleRequest || submitting}
            icon="logo-google"
            variant="secondary"
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or sign in with password</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email or mobile</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@agency.com"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { flex: 1 }]}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={10}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSubtle}
                />
              </Pressable>
            </View>
            <Text style={styles.help}>Demo credentials are pre-filled.</Text>
          </View>

          <Button
            label="Sign in"
            onPress={handleSubmit}
            loading={submitting}
            icon="arrow-forward"
          />

          <Text style={styles.footer}>
            New to PolicyPulse?{' '}
            <Text style={styles.footerLink} onPress={() => router.push('/signup')}>
              Create an account
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: spacing.md,
  },
  field: {
    gap: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  label: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  help: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  footer: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footerLink: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
})
