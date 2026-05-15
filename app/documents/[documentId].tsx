import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { API_BASE_URL } from '@/api/client'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { ScreenContainer } from '@/components/ScreenContainer'
import { Skeleton } from '@/components/Skeleton'
import { useAuth } from '@/context/useAuth'
import { useCustomers } from '@/hooks/useCustomers'
import { useDocuments } from '@/hooks/useDocuments'
import { formatDate, parseDate } from '@/lib/dates'
import { extensionForMime, formatFileSize, sanitizeFileName } from '@/lib/files'
import { colors, radii, shadows, spacing, typography } from '@/theme'

type Status = 'idle' | 'downloading' | 'ready' | 'error'

const PREVIEWABLE_PDF = /pdf/
const PREVIEWABLE_IMG = /image\/(png|jpe?g|webp|gif|bmp|tiff?)/

export default function DocumentDetailScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>()
  const { accessToken } = useAuth()
  const { documents } = useDocuments()
  const { customers } = useCustomers()
  const [status, setStatus] = useState<Status>('idle')
  const [localUri, setLocalUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const document = useMemo(() => documents.find((d) => d.id === documentId), [documents, documentId])
  const customer = useMemo(
    () => (document?.customer_id ? customers.find((c) => c.id === document.customer_id) : null),
    [customers, document],
  )

  const previewKind = useMemo(() => {
    const mime = document?.mime_type ?? ''
    if (PREVIEWABLE_IMG.test(mime)) return 'image'
    if (PREVIEWABLE_PDF.test(mime)) return 'pdf'
    return 'other'
  }, [document])

  useEffect(() => {
    if (!document || !accessToken) return
    if (previewKind === 'other') return
    let cancelled = false
    setStatus('downloading')
    setError(null)
    const ext = extensionForMime(document.mime_type, 'bin')
    const localPath = `${FileSystem.cacheDirectory}${sanitizeFileName(document.id)}.${ext}`

    FileSystem.downloadAsync(`${API_BASE_URL}/documents/${document.id}/preview`, localPath, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((result) => {
        if (cancelled) return
        if (result.status !== 200) {
          setError(`Could not load preview (${result.status})`)
          setStatus('error')
          return
        }
        setLocalUri(result.uri)
        setStatus('ready')
      })
      .catch((downloadError) => {
        if (cancelled) return
        setError(downloadError instanceof Error ? downloadError.message : 'Download failed')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [document, accessToken, previewKind])

  const handleShare = async () => {
    if (!document || !accessToken) return
    try {
      let uriToShare = localUri
      if (!uriToShare) {
        const ext = extensionForMime(document.mime_type, 'bin')
        const localPath = `${FileSystem.cacheDirectory}${sanitizeFileName(document.id)}.${ext}`
        const downloaded = await FileSystem.downloadAsync(
          `${API_BASE_URL}/documents/${document.id}/download`,
          localPath,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (downloaded.status !== 200) {
          setError(`Could not download (${downloaded.status})`)
          return
        }
        uriToShare = downloaded.uri
      }
      const available = await Sharing.isAvailableAsync()
      if (!available) {
        setError('Sharing is not available on this device.')
        return
      }
      await Sharing.shareAsync(uriToShare, {
        mimeType: document.mime_type ?? undefined,
        dialogTitle: document.original_file_name,
        UTI: undefined,
      })
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'Could not share file')
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {document?.original_file_name ?? 'Document'}
        </Text>
        <Pressable
          onPress={handleShare}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScreenContainer>
        {!document ? (
          <EmptyState
            icon="alert-circle"
            title="Document not found"
            message="It may have been deleted. Pull to refresh on the Documents tab."
          />
        ) : (
          <>
            <Card>
              <Text style={styles.fileName} numberOfLines={2}>
                {document.original_file_name}
              </Text>
              <View style={styles.metaRow}>
                <Badge label={document.status} tone="info" compact />
                {document.document_type ? (
                  <Badge label={document.document_type} tone="primary" compact />
                ) : null}
                <Text style={styles.metaText}>{formatFileSize(document.file_size_bytes)}</Text>
              </View>
              {customer ? (
                <View style={styles.linkLine}>
                  <Ionicons name="person" size={14} color={colors.textSubtle} />
                  <Text style={styles.metaText}>{customer.full_name}</Text>
                </View>
              ) : null}
              <View style={styles.linkLine}>
                <Ionicons name="time-outline" size={14} color={colors.textSubtle} />
                <Text style={styles.metaText}>
                  Uploaded{' '}
                  {parseDate(document.created_at) ? formatDate(parseDate(document.created_at)!) : '—'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Button label="Share" icon="share-outline" onPress={handleShare} variant="primary" />
              </View>
            </Card>

            {error ? <ErrorBanner message={error} /> : null}

            {previewKind === 'other' ? (
              <Card>
                <View style={styles.unsupported}>
                  <Ionicons name="document-outline" size={32} color={colors.textSubtle} />
                  <Text style={styles.unsupportedTitle}>Preview not available in-app</Text>
                  <Text style={styles.unsupportedText}>
                    This file type can&apos;t be rendered here. Use Share to open it in another app
                    that supports {document.mime_type ?? 'this format'}.
                  </Text>
                </View>
              </Card>
            ) : status === 'downloading' || status === 'idle' ? (
              <Card style={styles.previewCard}>
                <Skeleton height={260} radius={radii.md} />
                <View style={styles.previewLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.metaText}>Loading preview…</Text>
                </View>
              </Card>
            ) : status === 'error' ? (
              <Card>
                <View style={styles.unsupported}>
                  <Ionicons name="cloud-offline" size={32} color={colors.danger} />
                  <Text style={styles.unsupportedTitle}>Preview failed to load</Text>
                  <Text style={styles.unsupportedText}>
                    {error ?? 'Something went wrong fetching this document.'}
                  </Text>
                </View>
              </Card>
            ) : previewKind === 'image' && localUri ? (
              <Card style={styles.previewCard}>
                <Image source={{ uri: localUri }} style={styles.imagePreview} resizeMode="contain" />
              </Card>
            ) : previewKind === 'pdf' && localUri ? (
              <Card style={[styles.previewCard, { padding: 0, overflow: 'hidden' }]}>
                <PdfPreview localUri={localUri} />
              </Card>
            ) : null}

            <Text style={styles.previewHint}>
              Tap the share icon in the top right or the Share button above to send this file to any
              app — WhatsApp, email, drive, or another viewer.
            </Text>
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  )
}

function PdfPreview({ localUri }: { localUri: string }) {
  // Android WebView doesn't natively render PDFs from file:// — use Google's viewer with a
  // placeholder data URI is not possible. The pragmatic fix on Android is to open with
  // the system viewer via the Share button; iOS WebView previews PDFs natively.
  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidPdfHint}>
        <Ionicons name="document-text" size={36} color={colors.primary} />
        <Text style={styles.unsupportedTitle}>PDF ready</Text>
        <Text style={styles.unsupportedText}>
          Android can&apos;t preview PDFs inline. Tap Share to open it in a PDF viewer of your
          choice.
        </Text>
      </View>
    )
  }
  return (
    <WebView
      source={{ uri: localUri }}
      style={{ height: 480, backgroundColor: colors.surface }}
      originWhitelist={['*']}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.previewLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.heading,
    color: colors.text,
    paddingHorizontal: spacing.sm,
  },
  fileName: {
    ...typography.heading,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  linkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewCard: {
    padding: spacing.sm,
    ...shadows.card,
  },
  imagePreview: {
    width: '100%',
    height: 360,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  previewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  unsupported: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  unsupportedTitle: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  unsupportedText: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    maxWidth: 320,
  },
  androidPdfHint: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  previewHint: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
  },
})
