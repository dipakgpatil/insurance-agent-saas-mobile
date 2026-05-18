import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
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
import { useGoogleAuthFlow } from '@/hooks/useGoogleAuthFlow'
import type { GoogleAuthResponse } from '@/api/types'
import { colors, radii, spacing, typography } from '@/theme'

const DEMO_EMAIL = 'admin1@demoagt1.test'
const DEMO_PASSWORD = 'DemoPass123!'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleAuthenticated = useCallback((response: GoogleAuthResponse) => {
    if (response.onboarding_required || response.user.tenant_id === null) {
      router.replace('/onboarding/agency')
    } else {
      router.replace('/(tabs)')
    }
  }, [])

  const google = useGoogleAuthFlow({
    verb: 'sign in',
    onAuthenticated: handleGoogleAuthenticated,
  })

  const visibleError = error ?? google.error

  const clearErrors = () => {
    setError(null)
    google.clearError()
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    clearErrors()
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
    await google.start()
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

          {visibleError ? <ErrorBanner message={visibleError} /> : null}

          <Button
            label="Continue with Google"
            onPress={handleGoogle}
            loading={google.submitting}
            disabled={!google.request || submitting}
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
                placeholder="Password"
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
