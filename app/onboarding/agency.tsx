import { router } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
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
import { confirmImportMapping, highConfidenceMapping, uploadExcelImport } from '@/api/imports'
import type { ConfirmImportMappingResponse, ExcelImportUploadResponse } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { colors, radii, spacing, typography } from '@/theme'

export default function AgencyOnboardingScreen() {
  const { user, accessToken, initializing, completeAgencyOnboarding, logout } = useAuth()
  const [userName, setUserName] = useState(user?.name ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [agencyName, setAgencyName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [agentCode, setAgentCode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [workspaceCreated, setWorkspaceCreated] = useState(false)
  const [importing, setImporting] = useState(false)
  const [uploadedImport, setUploadedImport] = useState<ExcelImportUploadResponse | null>(null)
  const [importResult, setImportResult] = useState<ConfirmImportMappingResponse | null>(null)
  const [skippedColumns, setSkippedColumns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initializing && !user) router.replace('/login')
    if (user?.tenant_id && !workspaceCreated) router.replace('/(tabs)')
  }, [initializing, user, workspaceCreated])

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
      setWorkspaceCreated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePickExcel = async () => {
    if (!accessToken) return
    setError(null)
    setImporting(true)
    setImportResult(null)
    setUploadedImport(null)
    setSkippedColumns([])
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      })
      if (picked.canceled) return

      const file = picked.assets[0]
      const uploaded = await uploadExcelImport(accessToken, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      })
      const { mapping, skippedHeaders } = highConfidenceMapping(uploaded)
      setUploadedImport(uploaded)
      setSkippedColumns(skippedHeaders)

      if (Object.keys(mapping).length === 0) {
        setError('File uploaded, but no columns matched with 80% confidence. No records were imported.')
        return
      }

      const result = await confirmImportMapping(
        accessToken,
        uploaded.import_id,
        mapping,
        `${agencyName.trim() || 'Agency'} mobile onboarding`,
      )
      setImportResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the Excel sheet')
    } finally {
      setImporting(false)
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

          {!workspaceCreated ? (
            <>
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Initial Excel import</Text>
                <Text style={styles.helper}>
                  After workspace creation, upload your customer and policy Excel sheet. Columns
                  with 80% or higher confidence will be imported automatically; unmatched columns
                  are skipped.
                </Text>
              </Card>
              <Button
                label="Create workspace"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                icon="checkmark-circle-outline"
              />
              <Button label="Use another account" onPress={logout} variant="ghost" />
            </>
          ) : (
            <>
              <Card style={styles.successCard}>
                <Text style={styles.sectionTitle}>Workspace created</Text>
                <Text style={styles.helper}>
                  Your free plan is active. Upload an Excel sheet now to onboard customers and
                  policies from mobile.
                </Text>
              </Card>

              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Upload Excel sheet</Text>
                <Text style={styles.helper}>
                  We auto-apply high-confidence mappings and skip columns that do not clearly
                  match the PolicyPulse data model.
                </Text>
                <Button
                  label={uploadedImport ? 'Upload another Excel sheet' : 'Choose Excel / CSV file'}
                  onPress={handlePickExcel}
                  loading={importing}
                  disabled={importing}
                  icon="cloud-upload-outline"
                  variant="secondary"
                />
                {uploadedImport ? (
                  <View style={styles.importBox}>
                    <Text style={styles.importTitle}>{uploadedImport.source_file_name ?? 'Uploaded sheet'}</Text>
                    <Text style={styles.importMeta}>
                      {uploadedImport.total_rows} rows - {uploadedImport.headers.length} columns detected
                    </Text>
                    <Text style={styles.importMeta}>
                      {uploadedImport.headers.length - skippedColumns.length} columns auto-mapped -{' '}
                      {skippedColumns.length} skipped
                    </Text>
                  </View>
                ) : null}
                {importResult ? (
                  <View style={styles.resultGrid}>
                    <Result label="Customers" value={importResult.created_customers + importResult.updated_customers} />
                    <Result label="Policies" value={importResult.created_policies + importResult.updated_policies} />
                    <Result label="Failed rows" value={importResult.failed_rows} />
                  </View>
                ) : null}
              </Card>

              <Button label="Go to dashboard" onPress={() => router.replace('/(tabs)')} icon="arrow-forward" />
              <Button label="Skip for now" onPress={() => router.replace('/(tabs)')} variant="ghost" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Result({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.resultItem}>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
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
  helper: {
    ...typography.caption,
    color: colors.textMuted,
  },
  successCard: {
    gap: spacing.sm,
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  importBox: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  importMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resultGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  resultValue: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  resultLabel: {
    ...typography.caption,
    color: colors.textMuted,
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
