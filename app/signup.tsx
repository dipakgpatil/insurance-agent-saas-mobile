import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useGoogleAuthFlow } from '@/hooks/useGoogleAuthFlow'
import type { GoogleAuthResponse } from '@/api/types'
import { normalizeReferralCode, storeReferralCode } from '@/lib/referral'
import { colors, radii, spacing, typography } from '@/theme'

export default function SignupScreen() {
  const [referralCode, setReferralCode] = useState('')
  const handleGoogleAuthenticated = useCallback((response: GoogleAuthResponse) => {
    if (response.onboarding_required || response.user.tenant_id === null) {
      router.replace('/onboarding/agency')
    } else {
      router.replace('/(tabs)')
    }
  }, [])

  const google = useGoogleAuthFlow({
    verb: 'sign up',
    onAuthenticated: handleGoogleAuthenticated,
  })

  const handleSignup = async () => {
    if (referralCode.trim().length >= 4) {
      await storeReferralCode(referralCode)
    }
    await google.start()
  }

  const updateReferral = (value: string) => {
    setReferralCode(normalizeReferralCode(value))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>PO</Text>
          </View>
          <Text style={styles.brandText}>PolicyOffice</Text>
        </View>

        <Text style={styles.title}>Start your agency workspace</Text>
        <Text style={styles.subtitle}>
          Create an account with Google, set up your free plan, then upload your Excel
          sheet to onboard customers and policies from mobile.
        </Text>

        {google.error ? <ErrorBanner message={google.error} /> : null}

        <Card style={styles.card}>
          <Text style={styles.inputLabel}>Referral code</Text>
          <TextInput
            value={referralCode}
            onChangeText={updateReferral}
            placeholder="ANIL123 or USER12345"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
            style={styles.input}
          />
          <Text style={styles.inputHelp}>
            Add a code from a promoter or another PolicyOffice user to claim extra free time.
          </Text>

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
          loading={google.submitting}
          disabled={!google.request}
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
  inputLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputHelp: {
    ...typography.caption,
    color: colors.textSubtle,
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
