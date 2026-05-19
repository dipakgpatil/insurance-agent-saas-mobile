import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  confirmImportMapping,
  highConfidenceMapping,
  uploadExcelImport,
} from '@/api/imports'
import type {
  ConfirmImportMappingResponse,
  ExcelImportUploadResponse,
} from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { colors, radii, shadows, spacing, typography } from '@/theme'

export default function ImportExcelScreen() {
  const { accessToken } = useAuth()
  const [importing, setImporting] = useState(false)
  const [uploaded, setUploaded] = useState<ExcelImportUploadResponse | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  const [result, setResult] = useState<ConfirmImportMappingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePick = async () => {
    if (!accessToken) {
      setError('You are not signed in. Please sign in again.')
      return
    }
    setError(null)
    setImporting(true)
    setUploaded(null)
    setResult(null)
    setSkipped([])
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
      if (picked.canceled) {
        setImporting(false)
        return
      }

      const file = picked.assets[0]
      const uploadResp = await uploadExcelImport(accessToken, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      })
      const { mapping, skippedHeaders } = highConfidenceMapping(uploadResp)
      setUploaded(uploadResp)
      setSkipped(skippedHeaders)

      if (Object.keys(mapping).length === 0) {
        setError(
          'File uploaded, but no columns matched with 80% confidence. Please rename your column headings or use the web app for manual mapping.',
        )
        return
      }

      const confirmed = await confirmImportMapping(
        accessToken,
        uploadResp.import_id,
        mapping,
        'Mobile bulk import',
      )
      setResult(confirmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the Excel sheet')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setUploaded(null)
    setResult(null)
    setSkipped([])
    setError(null)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            android_ripple={{ color: colors.surfaceMuted, borderless: true }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Bulk import</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="cloud-upload" size={28} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Import customers and policies</Text>
            <Text style={styles.heroSubtitle}>
              Upload an Excel or CSV sheet from your phone and we will onboard your customers
              and their policies automatically — no laptop needed.
            </Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <Card style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>How it works</Text>
            <Tip
              icon="document-text"
              title="Accepted files"
              text="Excel (.xlsx, .xls) or comma-separated CSV up to a few thousand rows."
            />
            <Tip
              icon="grid"
              title="Auto column mapping"
              text="Columns matching our data model with at least 80% confidence are mapped automatically. Unmatched columns are skipped."
            />
            <Tip
              icon="people"
              title="What gets created"
              text="Customers (by mobile + name) and any policies in the sheet. Duplicates are merged."
            />
          </Card>

          {!result ? (
            <Button
              label={uploaded ? 'Choose a different file' : 'Choose Excel or CSV file'}
              icon="folder-open-outline"
              loading={importing}
              disabled={importing}
              onPress={handlePick}
            />
          ) : null}

          {uploaded ? (
            <Card style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: result ? colors.successLight : colors.infoLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={result ? 'checkmark-circle' : 'cloud-done'}
                    size={18}
                    color={result ? colors.success : colors.info}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle} numberOfLines={1}>
                    {uploaded.source_file_name ?? 'Uploaded sheet'}
                  </Text>
                  <Text style={styles.statusMeta}>
                    {uploaded.total_rows} rows · {uploaded.headers.length} columns detected
                  </Text>
                  <Text style={styles.statusMeta}>
                    {uploaded.headers.length - skipped.length} columns auto-mapped · {skipped.length} skipped
                  </Text>
                </View>
              </View>

              {skipped.length > 0 ? (
                <View style={styles.skippedBox}>
                  <Text style={styles.skippedTitle}>Skipped columns</Text>
                  <View style={styles.skippedWrap}>
                    {skipped.slice(0, 12).map((h) => (
                      <View key={h} style={styles.skippedChip}>
                        <Text style={styles.skippedChipText}>{h}</Text>
                      </View>
                    ))}
                    {skipped.length > 12 ? (
                      <View style={styles.skippedChip}>
                        <Text style={styles.skippedChipText}>+{skipped.length - 12} more</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </Card>
          ) : null}

          {result ? (
            <Card style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Import complete</Text>
              <View style={styles.resultGrid}>
                <ResultTile
                  label="Customers"
                  created={result.created_customers}
                  updated={result.updated_customers}
                  tone="primary"
                />
                <ResultTile
                  label="Policies"
                  created={result.created_policies}
                  updated={result.updated_policies}
                  tone="success"
                />
              </View>
              {result.failed_rows > 0 ? (
                <View style={styles.failedBox}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={styles.failedText}>
                    {result.failed_rows} row{result.failed_rows === 1 ? '' : 's'} could not be imported.
                    Open the web app to review them.
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {result ? (
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Go to dashboard"
                icon="arrow-forward"
                onPress={() => router.replace('/(tabs)')}
              />
              <Button
                label="Import another sheet"
                icon="add-circle-outline"
                variant="secondary"
                onPress={reset}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Tip({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  text: string
}) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>
    </View>
  )
}

function ResultTile({
  label,
  created,
  updated,
  tone,
}: {
  label: string
  created: number
  updated: number
  tone: 'primary' | 'success'
}) {
  const palette =
    tone === 'success'
      ? { bg: colors.successLight, fg: colors.success }
      : { bg: colors.primaryLight, fg: colors.primaryDark }
  return (
    <View style={[styles.resultTile, { backgroundColor: palette.bg }]}>
      <Text style={[styles.resultLabel, { color: palette.fg }]}>{label}</Text>
      <Text style={[styles.resultTotal, { color: palette.fg }]}>{created + updated}</Text>
      <Text style={styles.resultBreakdown}>
        {created} new · {updated} updated
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  heroTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  tipsCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  tipTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  tipText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusCard: {
    gap: spacing.md,
    ...shadows.card,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  statusMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  skippedBox: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skippedTitle: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  skippedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skippedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skippedChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  resultCard: {
    gap: spacing.md,
    borderColor: colors.successLight,
  },
  resultGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: 2,
  },
  resultLabel: {
    ...typography.captionBold,
    letterSpacing: 0.4,
  },
  resultTotal: {
    ...typography.title,
    fontSize: 24,
  },
  resultBreakdown: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  failedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
  },
  failedText: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
  },
})
