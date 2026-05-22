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
  confirmRenewalImport,
  highConfidenceMapping,
  uploadRenewalImport,
} from '@/api/imports'
import type {
  ConfirmImportMappingResponse,
  ExcelImportUploadResponse,
} from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { useAuth } from '@/context/useAuth'
import { colors, radii, spacing, typography } from '@/theme'

export default function RenewalUploadScreen() {
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
      const uploadResp = await uploadRenewalImport(accessToken, {
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

      const confirmed = await confirmRenewalImport(accessToken, uploadResp.import_id, mapping)
      setResult(confirmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the renewal sheet')
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
          <Text style={styles.headerTitle}>Upload Renewal</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="refresh-circle" size={28} color={colors.success} />
            </View>
            <Text style={styles.heroTitle}>Upload renewal sheet</Text>
            <Text style={styles.heroSubtitle}>
              Upload your renewal Excel or CSV. Matching policies will be marked as renewed and a
              new active policy term will be created for each row.
            </Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <Card style={styles.tipsCard}>
            <Text style={styles.sectionTitle}>How it works</Text>
            <Tip
              icon="document-text"
              title="Accepted files"
              text="Same Excel or CSV format you normally use — the columns are auto-detected from your profile."
            />
            <Tip
              icon="git-branch"
              title="Renewal chain"
              text="The old policy term is marked as Renewed and a new active term is linked to it."
            />
            <Tip
              icon="git-compare"
              title="Supplemental columns"
              text="Extra columns like Fresh/Renewal, Branch, and Payment Term are preserved and carried over to the export."
            />
          </Card>

          {!result ? (
            <Button
              label={uploaded ? 'Choose a different file' : 'Choose renewal Excel or CSV'}
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
                    { backgroundColor: result ? colors.successLight : colors.infoLight },
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
                    {uploaded.headers.length - skipped.length} columns auto-mapped
                    {skipped.length > 0 ? ` · ${skipped.length} supplemental` : ''}
                  </Text>
                </View>
              </View>

              {skipped.length > 0 ? (
                <View style={styles.skippedBox}>
                  <Text style={styles.skippedTitle}>Supplemental columns (preserved)</Text>
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
              <Text style={styles.sectionTitle}>Renewal import complete</Text>
              <View style={styles.resultGrid}>
                <ResultTile
                  label="New terms"
                  created={result.created_policies}
                  updated={0}
                  tone="success"
                />
                <ResultTile
                  label="Renewed"
                  created={result.updated_policies}
                  updated={0}
                  tone="primary"
                />
              </View>
              {result.failed_rows > 0 ? (
                <View style={styles.failedBox}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={styles.failedText}>
                    {result.failed_rows} row{result.failed_rows === 1 ? '' : 's'} could not be
                    processed. Open the web app to review them.
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {result ? (
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Go to renewals"
                icon="arrow-forward"
                onPress={() => router.replace('/(tabs)/renewals')}
              />
              <Button
                label="Upload another renewal sheet"
                icon="refresh-circle-outline"
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

function Tip({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={16} color={colors.success} />
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
  const bg = tone === 'primary' ? colors.primaryLight : colors.successLight
  const fg = tone === 'primary' ? colors.primary : colors.success
  const total = created + updated
  return (
    <View style={[styles.resultTile, { backgroundColor: bg }]}>
      <Text style={[styles.resultTileNum, { color: fg }]}>{total}</Text>
      <Text style={[styles.resultTileLabel, { color: fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
  },
  headerTitle: { ...typography.heading, color: colors.text },
  scroll: { padding: spacing.lg, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  heroSubtitle: { ...typography.body, color: colors.textSubtle, textAlign: 'center' },
  tipsCard: { gap: spacing.sm },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: { ...typography.bodyBold, color: colors.text },
  tipText: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
  statusCard: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { ...typography.bodyBold, color: colors.text },
  statusMeta: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
  skippedBox: { marginTop: spacing.sm, gap: spacing.xs },
  skippedTitle: { ...typography.micro, color: colors.textSubtle },
  skippedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skippedChip: {
    backgroundColor: colors.infoLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  skippedChipText: { ...typography.micro, color: colors.info },
  resultCard: { gap: spacing.md },
  resultGrid: { flexDirection: 'row', gap: spacing.md },
  resultTile: {
    flex: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultTileNum: { ...typography.title, fontSize: 28 },
  resultTileLabel: { ...typography.caption },
  failedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  failedText: { ...typography.caption, color: colors.text, flex: 1 },
})
