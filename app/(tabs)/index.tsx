import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { KpiCard } from '@/components/KpiCard'
import { ScreenContainer } from '@/components/ScreenContainer'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { useAuth } from '@/context/useAuth'
import { getReferralBenefit } from '@/api/referrals'
import type { ReferralBenefitRead } from '@/api/types'
import { useCustomers } from '@/hooks/useCustomers'
import { usePolicies } from '@/hooks/usePolicies'
import { compactCurrency, toNumber } from '@/lib/currency'
import { formatDateShort, relativeRenewal } from '@/lib/dates'
import {
  buildBirthdays,
  buildRenewals,
  renewalsByBucket,
  type RenewalBucket,
} from '@/lib/insights'
import { colors, radii, spacing, toneStyles, typography } from '@/theme'

const BUCKET_TONE: Record<RenewalBucket, 'danger' | 'warning' | 'info' | 'primary' | 'accent' | 'neutral'> = {
  overdue: 'danger',
  today: 'warning',
  tomorrow: 'info',
  this_week: 'primary',
  this_month: 'accent',
  later: 'neutral',
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export default function DashboardScreen() {
  const { user, accessToken } = useAuth()
  const { customers, loading: customersLoading, error: customersError, refresh: refreshCustomers } =
    useCustomers()
  const { policies, loading: policiesLoading, error: policiesError, refresh: refreshPolicies } =
    usePolicies()
  const [refreshing, setRefreshing] = useState(false)
  const [referralBenefit, setReferralBenefit] = useState<ReferralBenefitRead | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    getReferralBenefit(accessToken)
      .then((benefit) => {
        if (!cancelled) setReferralBenefit(benefit)
      })
      .catch(() => {
        if (!cancelled) setReferralBenefit(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const data = useMemo(() => {
    const renewals = buildRenewals(policies, customers)
    const birthdays = buildBirthdays(customers, 30)
    const buckets = renewalsByBucket(renewals)
    return {
      buckets,
      birthdays,
      upcoming: renewals
        .filter((entry) => entry.daysUntil >= 0 && entry.daysUntil <= 60)
        .slice(0, 5),
      activePolicies: policies.filter((policy) => policy.status === 'active').length,
      totalPremium: policies.reduce((sum, policy) => sum + toNumber(policy.premium_amount), 0),
      customerCount: customers.length,
    }
  }, [customers, policies])

  const loading = customersLoading || policiesLoading
  const error = customersError ?? policiesError

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshCustomers(), refreshPolicies()])
    setRefreshing(false)
  }, [refreshCustomers, refreshPolicies])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hi {(user?.name ?? 'there').split(/\s+/)[0]} 👋</Text>
            <Text style={styles.greetingSub}>Here&apos;s what needs attention today.</Text>
          </View>
          <Pressable
            onPress={() => router.push('/import-excel')}
            hitSlop={8}
            android_ripple={{ color: colors.surfaceMuted, borderless: true }}
            style={({ pressed }) => [
              styles.headerActionBtn,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.primaryDark} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
            <Avatar name={user?.name ?? user?.email ?? 'P'} size={40} />
          </Pressable>
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {referralBenefit ? (
          <Card style={styles.referralBenefitCard}>
            <Ionicons name="gift" size={18} color={colors.success} />
            <Text style={styles.referralBenefitText}>{referralBenefit.message}</Text>
          </Card>
        ) : null}

        <View style={styles.kpiGrid}>
          {loading ? (
            <>
              <View style={styles.kpiCell}>
                <Skeleton height={84} radius={radii.lg} />
              </View>
              <View style={styles.kpiCell}>
                <Skeleton height={84} radius={radii.lg} />
              </View>
              <View style={styles.kpiCell}>
                <Skeleton height={84} radius={radii.lg} />
              </View>
              <View style={styles.kpiCell}>
                <Skeleton height={84} radius={radii.lg} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="people"
                  tone="primary"
                  label="Customers"
                  value={data.customerCount.toLocaleString('en-IN')}
                  hint="Across your agency"
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="shield-checkmark"
                  tone="success"
                  label="Active policies"
                  value={data.activePolicies.toLocaleString('en-IN')}
                  hint={`${policies.length} total`}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="calendar"
                  tone="warning"
                  label="This month"
                  value={(
                    data.buckets.today.length +
                    data.buckets.tomorrow.length +
                    data.buckets.this_week.length +
                    data.buckets.this_month.length
                  ).toLocaleString('en-IN')}
                  hint={`${data.buckets.overdue.length} overdue`}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="cash"
                  tone="info"
                  label="Premium AUM"
                  value={compactCurrency(data.totalPremium)}
                  hint="Across the book"
                />
              </View>
            </>
          )}
        </View>

        <Card>
          <View style={styles.bucketRow}>
            <BucketPill
              icon="alert-circle"
              label="Overdue"
              count={data.buckets.overdue.length}
              tone="danger"
              onPress={() => router.push('/(tabs)/renewals?filter=overdue')}
            />
            <BucketPill
              icon="today"
              label="Today"
              count={data.buckets.today.length}
              tone="warning"
              onPress={() => router.push('/(tabs)/renewals?filter=today')}
            />
            <BucketPill
              icon="time"
              label="Tomorrow"
              count={data.buckets.tomorrow.length}
              tone="info"
              onPress={() => router.push('/(tabs)/renewals?filter=tomorrow')}
            />
            <BucketPill
              icon="calendar-clear"
              label="Next 7"
              count={data.buckets.this_week.length}
              tone="primary"
              onPress={() => router.push('/(tabs)/renewals?filter=this_week')}
            />
          </View>
        </Card>

        <View>
          <SectionHeader
            title="Upcoming renewals"
            subtitle={
              data.upcoming.length === 0
                ? 'Nothing in the next 60 days.'
                : `${data.upcoming.length} due soon`
            }
            right={
              <Pressable onPress={() => router.push('/(tabs)/renewals')} hitSlop={6}>
                <Text style={styles.linkText}>See all</Text>
              </Pressable>
            }
          />
          <Card style={{ padding: 0 }}>
            {loading ? (
              <View style={styles.skeletonStack}>
                <Skeleton height={56} radius={0} />
                <Skeleton height={56} radius={0} />
                <Skeleton height={56} radius={0} />
              </View>
            ) : data.upcoming.length === 0 ? (
              <EmptyState
                icon="checkmark-circle"
                title="All caught up"
                message="No renewals due in the next 60 days."
              />
            ) : (
              data.upcoming.map((entry, index) => {
                const bucketPalette = toneStyles(BUCKET_TONE[entry.bucket])
                const renewalDay = entry.renewalDate.getDate()
                const renewalMonth = MONTHS[entry.renewalDate.getMonth()]
                const premium = toNumber(entry.policy.premium_amount)
                return (
                  <Pressable
                    key={entry.policy.id}
                    onPress={() => router.push(`/renewals/${entry.policy.id}`)}
                    android_ripple={{ color: colors.surfaceMuted }}
                    style={({ pressed }) => [
                      styles.listRow,
                      index !== data.upcoming.length - 1 ? styles.listRowBorder : null,
                      pressed ? { backgroundColor: colors.surfaceMuted } : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.dashDateTear,
                        {
                          backgroundColor: bucketPalette.background,
                          borderColor: bucketPalette.foreground,
                        },
                      ]}
                    >
                      <Text style={[styles.dashDateTearMonth, { color: bucketPalette.foreground }]}>
                        {renewalMonth}
                      </Text>
                      <Text style={[styles.dashDateTearDay, { color: bucketPalette.foreground }]}>
                        {renewalDay}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {entry.customer?.full_name ?? 'Unknown customer'}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {entry.policy.policy_number ?? 'No policy number'}
                      </Text>
                      <Text
                        style={[styles.dashRenewalLine, { color: bucketPalette.foreground }]}
                        numberOfLines={1}
                      >
                        Renews {formatDateShort(entry.renewalDate)} · {relativeRenewal(entry.renewalDate)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.dashPremiumLabel}>PREMIUM</Text>
                      <Text style={styles.dashPremium}>{compactCurrency(premium)}</Text>
                    </View>
                  </Pressable>
                )
              })
            )}
          </Card>
        </View>

        <View>
          <SectionHeader
            title="Upcoming birthdays"
            subtitle={
              data.birthdays.length === 0
                ? 'No birthdays in the next 30 days.'
                : `${data.birthdays.length} in the next 30 days`
            }
            right={
              <Pressable onPress={() => router.push('/(tabs)/birthdays')} hitSlop={6}>
                <Text style={styles.linkText}>See all</Text>
              </Pressable>
            }
          />
          <Card style={{ padding: 0 }}>
            {loading ? (
              <View style={styles.skeletonStack}>
                <Skeleton height={56} radius={0} />
                <Skeleton height={56} radius={0} />
              </View>
            ) : data.birthdays.length === 0 ? (
              <EmptyState
                icon="balloon"
                title="No birthdays soon"
                message="Add dates of birth on customer profiles to see reminders here."
              />
            ) : (
              data.birthdays.slice(0, 5).map((entry, index) => (
                <View
                  key={entry.customer.id}
                  style={[
                    styles.listRow,
                    index !== Math.min(4, data.birthdays.length - 1) ? styles.listRowBorder : null,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{entry.customer.full_name}</Text>
                    <Text style={styles.rowSub}>
                      {formatDateShort(entry.nextBirthday)}
                      {entry.age ? ` · turns ${entry.age}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={
                      entry.daysUntil === 0
                        ? 'Today'
                        : entry.daysUntil === 1
                          ? 'Tomorrow'
                          : `In ${entry.daysUntil}d`
                    }
                    tone={entry.daysUntil <= 1 ? 'warning' : 'primary'}
                    compact
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  )
}

function BucketPill({
  icon,
  label,
  count,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  count: number
  tone: 'danger' | 'warning' | 'info' | 'primary'
  onPress: () => void
}) {
  const palette = {
    danger: { bg: colors.dangerLight, fg: colors.danger },
    warning: { bg: colors.warningLight, fg: colors.warning },
    info: { bg: colors.infoLight, fg: colors.info },
    primary: { bg: colors.primaryLight, fg: colors.primaryDark },
  }[tone]
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [
        styles.bucketPill,
        { backgroundColor: palette.bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={palette.fg} />
      <Text style={[styles.bucketPillCount, { color: palette.fg }]}>{count}</Text>
      <Text style={[styles.bucketPillLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  greeting: {
    ...typography.title,
    color: colors.text,
  },
  greetingSub: {
    ...typography.body,
    color: colors.textMuted,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  referralBenefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderColor: '#bbf7d0',
  },
  referralBenefitText: {
    ...typography.captionBold,
    color: colors.success,
    flex: 1,
  },
  kpiCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  bucketPill: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    gap: 2,
  },
  bucketPillCount: {
    ...typography.title,
    fontSize: 18,
  },
  bucketPillLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  rowSub: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  dashDateTear: {
    width: 44,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashDateTearMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dashDateTearDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 1,
  },
  dashRenewalLine: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 2,
  },
  dashPremiumLabel: {
    ...typography.micro,
    color: colors.textSubtle,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  dashPremium: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
  },
  skeletonStack: {
    gap: 1,
  },
  linkText: {
    ...typography.captionBold,
    color: colors.primary,
  },
})
