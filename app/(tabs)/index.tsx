import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { FeedbackModal } from '@/components/FeedbackModal'
import { ScreenContainer } from '@/components/ScreenContainer'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { useAuth } from '@/context/useAuth'
import { getReferralBenefit } from '@/api/referrals'
import type { ReferralBenefitRead } from '@/api/types'
import { useCustomers } from '@/hooks/useCustomers'
import { useFeedbackPrompt } from '@/hooks/useFeedbackPrompt'
import { usePolicies } from '@/hooks/usePolicies'
import { compactCurrency, formatCurrency, toNumber } from '@/lib/currency'
import { formatDateShort, relativeRenewal } from '@/lib/dates'
import {
  buildBirthdays,
  buildRenewals,
  policiesByInsurer,
  type RenewalBucket,
  type RenewalEntry,
} from '@/lib/insights'
import { titleCaseName } from '@/lib/names'
import { colors, radii, shadows, spacing, toneStyles, typography } from '@/theme'

const BUCKET_TONE: Record<RenewalBucket, 'danger' | 'warning' | 'info' | 'primary' | 'accent' | 'neutral'> = {
  overdue: 'danger',
  today: 'warning',
  tomorrow: 'info',
  this_week: 'primary',
  this_month: 'accent',
  later: 'neutral',
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default function DashboardScreen() {
  const { user, accessToken } = useAuth()
  const { customers, loading: customersLoading, error: customersError, refresh: refreshCustomers } =
    useCustomers()
  const { policies, loading: policiesLoading, error: policiesError, refresh: refreshPolicies } =
    usePolicies()
  const [refreshing, setRefreshing] = useState(false)
  const [referralBenefit, setReferralBenefit] = useState<ReferralBenefitRead | null>(null)
  const feedback = useFeedbackPrompt()

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
    const birthdays = buildBirthdays(customers, policies, 30)
    const insurers = policiesByInsurer(policies, 5)
    const upcoming = renewals
      .filter((entry) => entry.daysUntil >= -30 && entry.daysUntil <= 60)
      .slice(0, 8)
    const overdueCount = renewals.filter((r) => r.bucket === 'overdue').length
    const thisWeekCount = renewals.filter(
      (r) => r.bucket === 'today' || r.bucket === 'tomorrow' || r.bucket === 'this_week',
    ).length
    const totalPremiumThisCycle = upcoming.reduce(
      (sum, entry) => sum + toNumber(entry.policy.premium_amount),
      0,
    )
    return {
      birthdays,
      insurers,
      upcoming,
      featured: upcoming[0] ?? null,
      rest: upcoming.slice(1),
      overdueCount,
      thisWeekCount,
      totalPremiumThisCycle,
    }
  }, [customers, policies])

  const loading = customersLoading || policiesLoading
  const error = customersError ?? policiesError

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshCustomers(), refreshPolicies()])
    setRefreshing(false)
  }, [refreshCustomers, refreshPolicies])

  const firstName = (user?.name ?? 'there').split(/\s+/)[0]

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
            <Text style={styles.greeting}>Hi {firstName} 👋</Text>
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

        {/* Gradient hero — premium summary for the cycle */}
        <HeroCard
          loading={loading}
          total={data.totalPremiumThisCycle}
          upcomingCount={data.upcoming.length}
          overdueCount={data.overdueCount}
          thisWeekCount={data.thisWeekCount}
        />

        {referralBenefit ? (
          <Card style={styles.referralBenefitCard}>
            <Ionicons name="gift" size={18} color={colors.success} />
            <Text style={styles.referralBenefitText}>{referralBenefit.message}</Text>
          </Card>
        ) : null}

        {/* Featured "next up" card */}
        {!loading && data.featured ? <FeaturedRenewal entry={data.featured} /> : null}

        <View>
          <SectionHeader
            title="Policies by insurer"
            subtitle={
              data.insurers.length === 0
                ? 'No insurer data yet.'
                : `${policies.length} policies on file`
            }
          />
          <Card>
            {loading ? (
              <Skeleton height={132} radius={radii.md} />
            ) : data.insurers.length === 0 ? (
              <EmptyState
                icon="business"
                title="No insurer data"
                message="Policy insurer names appear here after imports or document extraction."
              />
            ) : (
              <View style={styles.insurerList}>
                {data.insurers.map((item) => (
                  <InsurerLine key={item.name} item={item} max={data.insurers[0]?.count ?? 1} />
                ))}
              </View>
            )}
          </Card>
        </View>

        <View>
          <SectionHeader
            title="Upcoming renewals"
            subtitle={
              data.rest.length === 0 && !data.featured
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
                <Skeleton height={68} radius={0} />
                <Skeleton height={68} radius={0} />
                <Skeleton height={68} radius={0} />
              </View>
            ) : data.rest.length === 0 ? (
              <EmptyState
                icon="checkmark-circle"
                title={data.featured ? 'That’s it for now' : 'All caught up'}
                message={
                  data.featured
                    ? 'Only one renewal in the queue. Nice work.'
                    : 'No renewals due in the next 60 days.'
                }
              />
            ) : (
              data.rest.map((entry, index) => (
                <RenewalRow
                  key={entry.policy.id}
                  entry={entry}
                  isLast={index === data.rest.length - 1}
                />
              ))
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
                  key={entry.id}
                  style={[
                    styles.listRow,
                    index !== Math.min(4, data.birthdays.length - 1) ? styles.listRowBorder : null,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{titleCaseName(entry.personName)}</Text>
                    <Text style={styles.rowSub}>
                      {formatDateShort(entry.nextBirthday)}
                      {entry.age ? ` · turns ${entry.age}` : ''}
                      {entry.isPolicyMember ? ` · ${titleCaseName(entry.customer.full_name)}` : ''}
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
      <FeedbackModal
        visible={feedback.visible}
        submitting={feedback.submitting}
        onSubmit={feedback.submit}
        onSkip={feedback.skip}
      />
    </SafeAreaView>
  )
}

function HeroCard({
  loading,
  total,
  upcomingCount,
  overdueCount,
  thisWeekCount,
}: {
  loading: boolean
  total: number
  upcomingCount: number
  overdueCount: number
  thisWeekCount: number
}) {
  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Decorative blobs */}
        <View style={[styles.heroBlob, styles.heroBlobA]} />
        <View style={[styles.heroBlob, styles.heroBlobB]} />

        <View style={styles.heroEyebrowRow}>
          <Text style={styles.heroEyebrow}>RENEWAL OUTLOOK</Text>
          <View style={styles.heroEyebrowDot} />
          <Text style={styles.heroEyebrowMeta}>Live</Text>
        </View>

        {loading ? (
          <Text style={styles.heroAmount}>—</Text>
        ) : (
          <Text style={styles.heroAmount}>{compactCurrency(total)}</Text>
        )}
        <Text style={styles.heroAmountSub}>
          across {upcomingCount} renewal{upcomingCount === 1 ? '' : 's'}
        </Text>

        <View style={styles.heroStatsRow}>
          <HeroStat label="Overdue" value={overdueCount} accent={overdueCount > 0} />
          <View style={styles.heroDivider} />
          <HeroStat label="This week" value={thisWeekCount} />
          <View style={styles.heroDivider} />
          <HeroStat
            label="Later"
            value={Math.max(0, upcomingCount - overdueCount - thisWeekCount)}
          />
        </View>
      </LinearGradient>
    </View>
  )
}

function HeroStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatValue, accent ? styles.heroStatValueAccent : null]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  )
}

function InsurerLine({
  item,
  max,
}: {
  item: { name: string; count: number; percent: number }
  max: number
}) {
  const width = `${Math.max(6, (item.count / Math.max(max, 1)) * 100)}%` as `${number}%`
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

function FeaturedRenewal({ entry }: { entry: RenewalEntry }) {
  const bucketPalette = toneStyles(BUCKET_TONE[entry.bucket])
  const renewalDay = entry.renewalDate.getDate()
  const renewalMonth = MONTHS[entry.renewalDate.getMonth()]
  const renewalWeekday = WEEKDAYS[entry.renewalDate.getDay()]
  const premium = toNumber(entry.policy.premium_amount)
  const mobileDigits = (entry.customer?.mobile ?? '').replace(/\D/g, '')
  const hasMobile = mobileDigits.length >= 7
  const hasEmail = Boolean(entry.customer?.email)

  const onCall = () => {
    if (hasMobile) Linking.openURL(`tel:${mobileDigits}`).catch(() => {})
  }
  const onWhatsApp = () => {
    router.push(`/renewal-message/${entry.policy.id}`)
  }
  const onEmail = () => {
    if (entry.customer?.email) Linking.openURL(`mailto:${entry.customer.email}`).catch(() => {})
  }

  return (
    <View>
      <View style={styles.featuredEyebrowRow}>
        <Ionicons name="sparkles" size={12} color={bucketPalette.foreground} />
        <Text style={[styles.featuredEyebrow, { color: bucketPalette.foreground }]}>NEXT UP</Text>
        <Text style={styles.featuredEyebrowMeta}>· {relativeRenewal(entry.renewalDate)}</Text>
      </View>
      <Pressable
        onPress={() => router.push(`/renewals/${entry.policy.id}`)}
        android_ripple={{ color: colors.surfaceMuted }}
        style={({ pressed }) => [styles.featuredCard, pressed ? { opacity: 0.97 } : null]}
      >
        <View
          style={[
            styles.featuredTear,
            {
              backgroundColor: bucketPalette.background,
              borderColor: bucketPalette.foreground,
            },
          ]}
        >
          <Text style={[styles.featuredTearWeekday, { color: bucketPalette.foreground }]}>
            {renewalWeekday}
          </Text>
          <Text style={[styles.featuredTearDay, { color: bucketPalette.foreground }]}>
            {renewalDay}
          </Text>
          <Text style={[styles.featuredTearMonth, { color: bucketPalette.foreground }]}>
            {renewalMonth}
          </Text>
        </View>

        <View style={styles.featuredBody}>
          <Text style={styles.featuredName} numberOfLines={1}>
            {titleCaseName(entry.customer?.full_name) || 'Unknown customer'}
          </Text>
          <Text style={styles.featuredPolicy} numberOfLines={1}>
            {entry.policy.policy_number ?? 'No policy number'}
          </Text>
          <View style={styles.featuredAmountRow}>
            <Text style={styles.featuredAmount}>{formatCurrency(premium)}</Text>
            <Text style={styles.featuredAmountLabel}>premium</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.featuredActions}>
        <FeaturedAction icon="call" label="Call" onPress={onCall} disabled={!hasMobile} />
        <View style={styles.featuredActionDivider} />
        <FeaturedAction
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={onWhatsApp}
        />
        <View style={styles.featuredActionDivider} />
        <FeaturedAction icon="mail" label="Email" onPress={onEmail} disabled={!hasEmail} />
      </View>
    </View>
  )
}

function FeaturedAction({
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
        styles.featuredActionBtn,
        pressed && !disabled ? { backgroundColor: colors.surfaceMuted } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.featuredActionLabel}>{label}</Text>
    </Pressable>
  )
}

function RenewalRow({ entry, isLast }: { entry: RenewalEntry; isLast: boolean }) {
  const bucketPalette = toneStyles(BUCKET_TONE[entry.bucket])
  const renewalDay = entry.renewalDate.getDate()
  const renewalMonth = MONTHS[entry.renewalDate.getMonth()]
  const premium = toNumber(entry.policy.premium_amount)
  return (
    <Pressable
      onPress={() => router.push(`/renewals/${entry.policy.id}`)}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [
        styles.listRow,
        !isLast ? styles.listRowBorder : null,
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
          {titleCaseName(entry.customer?.full_name) || 'Unknown customer'}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {entry.policy.policy_number ?? 'No policy number'}
        </Text>
        <Text style={styles.dashRenewalLine} numberOfLines={1}>
          Renews {formatDateShort(entry.renewalDate)} ·{' '}
          <Text style={{ color: bucketPalette.foreground, fontWeight: '600' }}>
            {relativeRenewal(entry.renewalDate)}
          </Text>
        </Text>
      </View>
      <View
        style={[
          styles.dashAmountPill,
          { backgroundColor: bucketPalette.background, borderColor: bucketPalette.foreground },
        ]}
      >
        <Text style={[styles.dashAmount, { color: bucketPalette.foreground }]}>
          {compactCurrency(premium)}
        </Text>
      </View>
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
  /* Hero gradient card */
  heroWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.floating,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  heroBlobA: {
    width: 160,
    height: 160,
    top: -60,
    right: -40,
    backgroundColor: '#ffffff',
  },
  heroBlobB: {
    width: 110,
    height: 110,
    bottom: -50,
    right: 80,
    backgroundColor: '#a78bfa',
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.78)',
  },
  heroEyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86efac',
  },
  heroEyebrowMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginTop: 8,
  },
  heroAmountSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  heroStatsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroStatValueAccent: {
    color: '#fca5a5',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  /* Featured renewal */
  featuredEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  featuredEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  featuredEyebrowMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  featuredCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  featuredTear: {
    width: 64,
    height: 76,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  featuredTearWeekday: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  featuredTearDay: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: 2,
  },
  featuredTearMonth: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  featuredBody: {
    flex: 1,
  },
  featuredName: {
    ...typography.heading,
    color: colors.text,
    fontSize: 17,
  },
  featuredPolicy: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  featuredAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  featuredAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  featuredAmountLabel: {
    ...typography.micro,
    color: colors.textSubtle,
    textTransform: 'lowercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    ...shadows.card,
  },
  featuredActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  featuredActionLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  featuredActionDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  /* Compact list rows */
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
    width: 46,
    height: 50,
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
    color: colors.textSubtle,
    marginTop: 2,
  },
  dashAmountPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dashAmount: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skeletonStack: {
    gap: 1,
  },
  linkText: {
    ...typography.captionBold,
    color: colors.primary,
  },
})
