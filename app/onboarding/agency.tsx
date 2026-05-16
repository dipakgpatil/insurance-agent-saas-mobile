import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { colors, radii, spacing, typography } from '@/theme'

export default function AgencyOnboardingScreen() {
  const { user, initializing, completeAgencyOnboarding, logout } = useAuth()
  const [userName, setUserName] = useState(user?.name ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [agencyName, setAgencyName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [agentCode, setAgentCode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initializing && !user) router.replace('/login')
    if (user?.tenant_id) router.replace('/(tabs)')
  }, [initializing, user])

  useEffect(() => {
    if (user?.name && !userName) setUserName(user.name)
    if (user?.mobile && !mobile) setMobile(user.mobile)
  }, [mobile, user, userName])

  const canSubmit = useMemo(
    () => userName.trim().length >= 2 && mobile.trim().length >= 7 && agencyName.trim().length >= 2,
    [agencyName, mobile, userName],
  )

  const handleSubmit = async () => {
    setError(null)
    if (!canSubmit) {
      setError('Enter your name, mobile number, and agency name to continue.')
      return
    }
    setSubmitting(true)
    try {
      await completeAgencyOnboarding({
        user_name: userName.trim(),
        mobile: mobile.trim(),
        agency_name: agencyName.trim(),
        business_name: businessName.trim() || agencyName.trim(),
        agent_code: agentCode.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        country: 'India',
      })
      router.replace('/(tabs)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete onboarding')
    } finally {
      setSubmitting(false)
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
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Workspace setup</Text>
            <Text style={styles.title}>Create your agency account</Text>
            <Text style={styles.subtitle}>
              We will start you on the free plan and create an agent code for customer login.
            </Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Basic details</Text>
            <Field label="Your name" value={userName} onChangeText={setUserName} />
            <Field
              label="Mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="98765 43210"
            />
            <Field
              label="Agency name"
              value={agencyName}
              onChangeText={setAgencyName}
              placeholder="Patil Insurance Services"
            />
            <Field
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Optional"
            />
            <Field
              label="Preferred agent code"
              value={agentCode}
              onChangeText={(value) => setAgentCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Optional, e.g. PATILINS"
              autoCapitalize="characters"
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Office address</Text>
            <Field label="City" value={city} onChangeText={setCity} />
            <Field label="State" value={state} onChangeText={setState} />
            <Field
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
            />
          </Card>

          <Button
            label="Create workspace"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            icon="checkmark-circle-outline"
          />
          <Button label="Use another account" onPress={logout} variant="ghost" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

type FieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
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
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.primaryDark,
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
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  field: {
    gap: 6,
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
})
