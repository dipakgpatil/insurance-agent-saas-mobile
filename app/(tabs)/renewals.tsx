import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
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
import { RenewalBadge } from '@/components/RenewalBadge'
import { Skeleton } from '@/components/Skeleton'
import { useCustomers } from '@/hooks/useCustomers'
import { usePolicies } from '@/hooks/usePolicies'
import { CATEGORY_VISUAL, classifyPolicy } from '@/lib/classify'
import { formatCurrency } from '@/lib/currency'
import { relativeRenewal } from '@/lib/dates'
import {
  buildRenewals,
  type RenewalBucket,
  type RenewalEntry,
} from '@/lib/insights'
import { colors, radii, spacing, toneStyles, typography } from '@/theme'

type FilterKey = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'later'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'this_week', label: 'Next 7' },
  { key: 'this_month', label: 'This month' },
  { key: 'later', label: 'Later' },
]

export default function RenewalsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>()
  const initialFilter = (params.filter as FilterKey) ?? 'all'

  const { customers, loading: customersLoading, error: customersError, refresh: refreshCustomers } =
    useCustomers()
  const { policies, loading: policiesLoading, error: policiesError, refresh: refreshPolicies } =
    usePolicies()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>(initialFilter)
  const [refreshing, setRefreshing] = useState(false)

  const renewals = useMemo(() => buildRenewals(policies, customers), [policies, customers])

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: renewals.length,
      overdue: 0,
      today: 0,
      tomorrow: 0,
      this_week: 0,
      this_month: 0,
      later: 0,
    }
    for (const entry of renewals) base[entry.bucket as keyof typeof base] += 1
    return base
  }, [renewals])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return renewals.filter((entry) => {
      if (filter !== 'all' && entry.bucket !== (filter as RenewalBucket)) return false
      if (!q) return true
      const haystack = [
        entry.customer?.full_name ?? '',
        entry.policy.policy_number ?? '',
        entry.policy.policy_name ?? '',
        entry.customer?.mobile ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [renewals, query, filter])

  const loading = customersLoading || policiesLoading
  const error = customersError ?? policiesError

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshCustomers(), refreshPolicies()])
    setRefreshing(false)
  }, [refreshCustomers, refreshPolicies])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Renewals</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${renewals.length} dated policies`}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSubtle} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, policy number, mobile"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item.key)}
              style={[styles.chip, filter === item.key ? styles.chipActive : null]}
            >
              <Text
                style={[styles.chipText, filter === item.key ? styles.chipTextActive : null]}
              >
                {item.label} · {counts[item.key]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingList}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={160} radius={radii.md} style={styles.skeletonRow} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="checkmark-circle"
          title={renewals.length === 0 ? 'No renewals yet' : 'Nothing matches'}
          message={
            renewals.length === 0
              ? 'Import customers and policies on the web app, then dated renewals will appear here.'
              : query
                ? 'Try a different search.'
                : 'Switch filters above to see other renewals.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.policy.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => <RenewalCard entry={item} />}
        />
      )}
    </SafeAreaView>
  )
}

function RenewalCard({ entry }: { entry: RenewalEntry }) {
  const category = classifyPolicy(entry.policy)
  const visual = CATEGORY_VISUAL[category]
  const palette = toneStyles(visual.tone)
  const mobileDigits = (entry.customer?.mobile ?? '').replace(/\D/g, '')
  const hasMobile = mobileDigits.length >= 7
  const hasEmail = Boolean(entry.customer?.email)

  const openCustomer = () => {
    if (entry.customer) router.push(`/customers/${entry.customer.id}`)
  }

  const onCall = () => {
    if (hasMobile) Linking.openURL(`tel:${mobileDigits}`).catch(() => {})
  }
  const onWhatsApp = () => {
    if (!hasMobile) return
    const normalized = mobileDigits.length === 10 ? `91${mobileDigits}` : mobileDigits
    Linking.openURL(`https://wa.me/${normalized}`).catch(() => {})
  }
  const onEmail = () => {
    if (entry.customer?.email) Linking.openURL(`mailto:${entry.customer.email}`).catch(() => {})
  }

  return (
    <View style={styles.card}>
      {/* Top row: category badge + premium */}
      <View style={styles.cardTopRow}>
        <View style={[styles.categoryChip, { backgroundColor: palette.background }]}>
          <Ionicons name={visual.icon} size={14} color={palette.foreground} />
          <Text style={[styles.categoryChipText, { color: palette.foreground }]}>
            {visual.label}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(entry.policy.premium_amount)}</Text>
      </View>

      {/* Body: customer + policy info */}
      <Pressable onPress={openCustomer} android_ripple={{ color: colors.surfaceMuted }} style={styles.bodyPress}>
        <Text style={styles.customerName} numberOfLines={1}>
          {entry.customer?.full_name ?? 'Unknown customer'}
        </Text>
        <Text style={styles.policyLine} numberOfLines={1}>
          <Text style={styles.policyNumber}>
            {entry.policy.policy_number ?? 'No policy number'}
          </Text>
          {entry.policy.policy_name ? (
            <Text style={styles.policyName}> · {entry.policy.policy_name}</Text>
          ) : null}
        </Text>

        <View style={styles.dateRow}>
          <RenewalBadge bucket={entry.bucket} compact />
          <Text style={styles.relativeDate}>{relativeRenewal(entry.renewalDate)}</Text>
          {entry.policy.status !== 'active' ? (
            <Badge label={entry.policy.status} tone="neutral" compact />
          ) : null}
        </View>
      </Pressable>

      {/* Action row: Call, WhatsApp, Email */}
      <View style={styles.actionRow}>
        <ActionBtn icon="call" label="Call" onPress={onCall} disabled={!hasMobile} />
        <View style={styles.actionDivider} />
        <ActionBtn icon="logo-whatsapp" label="WhatsApp" onPress={onWhatsApp} disabled={!hasMobile} />
        <View style={styles.actionDivider} />
        <ActionBtn icon="mail" label="Email" onPress={onEmail} disabled={!hasEmail} />
      </View>
    </View>
  )
}

function ActionBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: colors.surfaceMuted, borderless: false }}
      style={({ pressed }) => [
        styles.actionBtn,
        pressed && !disabled ? { backgroundColor: colors.surfaceMuted } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
    marginBottom: spacing.sm,
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
  filtersWrap: {
    marginBottom: spacing.sm,
  },
  filterList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  categoryChipText: {
    ...typography.captionBold,
  },
  amount: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  bodyPress: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  customerName: {
    ...typography.heading,
    color: colors.text,
  },
  policyLine: {
    ...typography.caption,
  },
  policyNumber: {
    ...typography.captionBold,
    color: colors.text,
  },
  policyName: {
    color: colors.textSubtle,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  relativeDate: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  actionLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
})
