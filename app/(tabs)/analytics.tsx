import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/Card'
import { ErrorBanner } from '@/components/ErrorBanner'
import { KpiCard } from '@/components/KpiCard'
import { MiniBarChart } from '@/components/MiniBarChart'
import { ScreenContainer } from '@/components/ScreenContainer'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { useCustomers } from '@/hooks/useCustomers'
import { useDocuments } from '@/hooks/useDocuments'
import { usePolicies } from '@/hooks/usePolicies'
import { CATEGORIES, CATEGORY_LABELS, classifyPolicy } from '@/lib/classify'
import { compactCurrency, toNumber } from '@/lib/currency'
import {
  buildBirthdays,
  buildRenewals,
  monthlyRenewals,
  policiesByInsurer,
  renewalsByBucket,
  type InsurerPolicyStat,
} from '@/lib/insights'
import { colors, radii, spacing, typography } from '@/theme'

export default function AnalyticsScreen() {
  const { customers, loading: customersLoading, error: customersError, refresh: refreshCustomers } =
    useCustomers()
  const { policies, loading: policiesLoading, error: policiesError, refresh: refreshPolicies } =
    usePolicies()
  const { documents, loading: documentsLoading, refresh: refreshDocuments } = useDocuments()
  const [refreshing, setRefreshing] = useState(false)

  const data = useMemo(() => {
    const renewals = buildRenewals(policies, customers)
    const buckets = renewalsByBucket(renewals)
    const monthly = monthlyRenewals(policies)
    const insurers = policiesByInsurer(policies, 8)
    const birthdays = buildBirthdays(customers, policies, 30)
    const today = new Date()
    const thisMonth = today.getMonth()
    const birthdaysThisMonth = buildBirthdays(customers, policies, 31).filter(
      (entry) => entry.nextBirthday.getMonth() === thisMonth,
    ).length

    const mix = CATEGORIES.map((category) => ({
      label: CATEGORY_LABELS[category],
      value: policies.filter((p) => classifyPolicy(p) === category).length,
    }))

    return {
      buckets,
      monthly,
      insurers,
      birthdays,
      birthdaysThisMonth,
      activePolicies: policies.filter((p) => p.status === 'active').length,
      totalPremium: policies.reduce((sum, p) => sum + toNumber(p.premium_amount), 0),
      mix,
      duesNext30:
        buckets.today.length + buckets.tomorrow.length + buckets.this_week.length + buckets.this_month.length,
    }
  }, [customers, policies])

  const loading = customersLoading || policiesLoading
  const error = customersError ?? policiesError

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshCustomers(), refreshPolicies(), refreshDocuments()])
    setRefreshing(false)
  }, [refreshCustomers, refreshPolicies, refreshDocuments])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Quick view of your renewal pipeline and book.</Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

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
                  icon="calendar"
                  tone="warning"
                  label="Due in 30 days"
                  value={data.duesNext30.toLocaleString('en-IN')}
                  hint="Today + tomorrow + this week + month"
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="balloon"
                  tone="accent"
                  label="Birthdays this month"
                  value={data.birthdaysThisMonth.toLocaleString('en-IN')}
                  hint={`${data.birthdays.length} in next 30d`}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="document-text"
                  tone="info"
                  label="Documents"
                  value={(documentsLoading ? 0 : documents.length).toLocaleString('en-IN')}
                  hint={documentsLoading ? 'Loading…' : 'On file'}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  icon="cash"
                  tone="success"
                  label="Premium AUM"
                  value={compactCurrency(data.totalPremium)}
                  hint={`${data.activePolicies} active`}
                />
              </View>
            </>
          )}
        </View>

        <View>
          <SectionHeader title="Insurer-wise book" subtitle="Company-wise policy spread" />
          <Card>
            {loading ? (
              <Skeleton height={180} radius={radii.md} />
            ) : data.insurers.length === 0 ? (
              <Text style={styles.emptyText}>No insurer data yet.</Text>
            ) : (
              <View style={styles.insurerList}>
                {data.insurers.map((item) => (
                  <InsurerLine
                    key={item.name}
                    item={item}
                    max={data.insurers[0]?.count ?? 1}
                  />
                ))}
              </View>
            )}
          </Card>
        </View>

        <View>
          <SectionHeader
            title="Renewals across the year"
            subtitle="Due (light) vs completed (filled)"
          />
          <Card>
            {loading ? (
              <Skeleton height={180} radius={radii.md} />
            ) : (
              <MiniBarChart
                data={data.monthly.map((m) => ({
                  label: m.label,
                  value: m.renewals,
                  emphasis: m.done,
                }))}
                height={200}
              />
            )}
          </Card>
        </View>

        <View>
          <SectionHeader title="Portfolio mix" subtitle="Policies per category" />
          <Card>
            {loading ? (
              <Skeleton height={140} radius={radii.md} />
            ) : (
              <MiniBarChart
                data={data.mix.map((m) => ({ label: m.label, value: m.value }))}
                height={160}
              />
            )}
          </Card>
        </View>

        <View>
          <SectionHeader title="Renewal buckets" subtitle="Snapshot of what's hot right now" />
          <Card>
            {loading ? (
              <Skeleton height={120} radius={radii.md} />
            ) : (
              <View style={styles.bucketCol}>
                <BucketLine label="Overdue" count={data.buckets.overdue.length} color={colors.danger} />
                <BucketLine label="Today" count={data.buckets.today.length} color={colors.warning} />
                <BucketLine label="Tomorrow" count={data.buckets.tomorrow.length} color={colors.info} />
                <BucketLine label="Next 7 days" count={data.buckets.this_week.length} color={colors.primary} />
                <BucketLine label="This month" count={data.buckets.this_month.length} color={colors.accent} />
                <BucketLine label="Later" count={data.buckets.later.length} color={colors.textSubtle} />
              </View>
            )}
          </Card>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  )
}

function InsurerLine({ item, max }: { item: InsurerPolicyStat; max: number }) {
  const width = `${Math.max(5, (item.count / Math.max(max, 1)) * 100)}%` as `${number}%`
  return (
    <View style={styles.insurerLine}>
      <View style={styles.insurerLineTop}>
        <Text style={styles.insurerName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.insurerCount}>{item.count.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.insurerTrack}>
        <View style={[styles.insurerFill, { width }]} />
      </View>
      <Text style={styles.insurerMeta}>{item.percent}% of policies</Text>
    </View>
  )
}

function BucketLine({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.bucketLine}>
      <View style={[styles.bucketDot, { backgroundColor: color }]} />
      <Text style={styles.bucketLabel}>{label}</Text>
      <Text style={styles.bucketCount}>{count}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  insurerList: {
    gap: spacing.md,
  },
  insurerLine: {
    gap: 6,
  },
  insurerLineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  insurerName: {
    flex: 1,
    ...typography.captionBold,
    color: colors.text,
  },
  insurerCount: {
    ...typography.captionBold,
    color: colors.text,
  },
  insurerTrack: {
    height: 9,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  insurerFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  insurerMeta: {
    ...typography.micro,
    color: colors.textSubtle,
  },
  bucketCol: {
    gap: spacing.sm,
  },
  bucketLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bucketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bucketLabel: {
    flex: 1,
    ...typography.body,
    color: colors.textMuted,
  },
  bucketCount: {
    ...typography.bodyBold,
    color: colors.text,
  },
})
