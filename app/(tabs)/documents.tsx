import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Badge } from '@/components/Badge'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Skeleton } from '@/components/Skeleton'
import { useCustomers } from '@/hooks/useCustomers'
import { useDocuments } from '@/hooks/useDocuments'
import { formatDate, parseDate } from '@/lib/dates'
import { formatFileSize } from '@/lib/files'
import { colors, radii, spacing, typography } from '@/theme'

const TYPE_ICON = (mime: string | null | undefined): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap => {
  if (!mime) return 'document'
  if (mime.includes('pdf')) return 'document-text'
  if (mime.includes('image')) return 'image'
  if (mime.includes('csv') || mime.includes('excel') || mime.includes('sheet')) return 'grid'
  return 'document'
}

const STATUS_TONE = (
  status: string,
): 'success' | 'warning' | 'info' | 'neutral' | 'danger' => {
  if (status === 'extracted' || status === 'approved') return 'success'
  if (status === 'needs_review' || status === 'needs_customer_link') return 'warning'
  if (status === 'failed' || status === 'rejected') return 'danger'
  if (status === 'queued' || status === 'ai_extraction_pending' || status === 'extracting_text')
    return 'info'
  return 'neutral'
}

export default function DocumentsScreen() {
  const { documents, loading, error, refresh } = useDocuments()
  const { customers } = useCustomers()
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.full_name])), [customers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents
      .filter((doc) => {
        if (!q) return true
        const customerName = doc.customer_id ? customerMap.get(doc.customer_id) ?? '' : ''
        const haystack = [
          doc.original_file_name,
          doc.document_type ?? '',
          doc.document_category,
          doc.status,
          customerName,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [documents, customerMap, query])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${documents.length} files`}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSubtle} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by file name or customer"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingList}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={84} radius={radii.md} style={styles.skeletonRow} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title={documents.length === 0 ? 'No documents yet' : 'Nothing matches'}
          message={
            documents.length === 0
              ? 'Upload policy PDFs or scans from the web app — they appear here.'
              : 'Try a different search.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const customerName = item.customer_id ? customerMap.get(item.customer_id) : null
            const created = parseDate(item.created_at)
            return (
              <Pressable
                onPress={() => router.push(`/documents/${item.id}`)}
                android_ripple={{ color: colors.surfaceMuted }}
                style={({ pressed }) => [styles.row, pressed ? { opacity: 0.96 } : null]}
              >
                <View style={styles.iconBubble}>
                  <Ionicons name={TYPE_ICON(item.mime_type)} size={22} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.original_file_name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {customerName ? `${customerName} · ` : ''}
                    {item.document_type ?? item.document_category}
                    {created ? ` · ${formatDate(created)}` : ''}
                  </Text>
                  <View style={styles.rowMetaLine}>
                    <Badge label={item.status} tone={STATUS_TONE(item.status)} compact />
                    <Text style={styles.rowMicro}>{formatFileSize(item.file_size_bytes)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  searchClear: {
    padding: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  loadingList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  skeletonRow: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  rowSub: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  rowMicro: {
    ...typography.caption,
    color: colors.textSubtle,
  },
})
