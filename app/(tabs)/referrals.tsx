import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  generateMyReferral,
  getMyReferral,
  getMyReferralEvents,
  getMyRewards,
} from '@/api/referrals'
import type { MyReferralEventsResponse, MyReferralResponse, MyRewardsResponse } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { KpiCard } from '@/components/KpiCard'
import { ScreenContainer } from '@/components/ScreenContainer'
import { useAuth } from '@/context/useAuth'
import { colors, radii, spacing, typography } from '@/theme'

export default function ReferralsScreen() {
  const { accessToken } = useAuth()
  const [referral, setReferral] = useState<MyReferralResponse | null>(null)
  const [events, setEvents] = useState<MyReferralEventsResponse | null>(null)
  const [rewards, setRewards] = useState<MyRewardsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setError(null)
    const [nextReferral, nextEvents, nextRewards] = await Promise.all([
      getMyReferral(accessToken),
      getMyReferralEvents(accessToken),
      getMyRewards(accessToken),
    ])
    setReferral(nextReferral)
    setEvents(nextEvents)
    setRewards(nextRewards)
  }, [accessToken])

  useEffect(() => {
    let cancelled = false
    if (!accessToken) return
    Promise.all([getMyReferral(accessToken), getMyReferralEvents(accessToken), getMyRewards(accessToken)])
      .then(([nextReferral, nextEvents, nextRewards]) => {
        if (cancelled) return
        setReferral(nextReferral)
        setEvents(nextEvents)
        setRewards(nextRewards)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load referral rewards')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh referral rewards')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [load])

  const whatsappUrl = useMemo(() => {
    const link = referral?.referral_link
    if (!link) return null
    return `https://wa.me/?text=${encodeURIComponent(`Join PolicyPulse with my referral link and get extra free time: ${link}`)}`
  }, [referral?.referral_link])

  const handleGenerate = async () => {
    if (!accessToken) return
    try {
      setReferral(await generateMyReferral(accessToken))
      Alert.alert('Referral link ready', 'Your link is ready to share.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate referral link')
    }
  }

  const copyLink = async () => {
    if (!referral?.referral_link) return
    await Clipboard.setStringAsync(referral.referral_link)
    Alert.alert('Copied', 'Referral link copied to clipboard.')
  }

  const shareWhatsApp = async () => {
    if (!whatsappUrl) return
    try {
      await Linking.openURL(whatsappUrl)
    } catch {
      await copyLink()
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View>
          <Text style={styles.title}>Refer & Earn</Text>
          <Text style={styles.subtitle}>
            Share PolicyPulse with another agency. Rewards appear after onboarding completes.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <KpiCard
              icon="gift"
              tone="primary"
              label="Earned"
              value={`${rewards?.balance.total_earned_points ?? referral?.reward_balance.total_earned_points ?? 0}`}
              hint="Reward points"
            />
          </View>
          <View style={styles.kpiCell}>
            <KpiCard
              icon="wallet"
              tone="success"
              label="Available"
              value={`${rewards?.balance.available_points ?? referral?.reward_balance.available_points ?? 0}`}
              hint="1 point = INR 1"
            />
          </View>
        </View>

        <Card style={styles.linkCard}>
          <View style={styles.linkIcon}>
            <Ionicons name="share-social" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Your referral link</Text>
            <Text style={styles.helper}>
              New agencies get extra free time. You get reward points after they complete onboarding.
            </Text>
          </View>

          {referral ? (
            <View style={styles.linkBox}>
              <Text style={styles.codeLabel}>Code</Text>
              <Text style={styles.codeText}>{referral.code.code}</Text>
              <Text style={styles.linkText} numberOfLines={2}>{referral.referral_link}</Text>
              <View style={styles.actionRow}>
                <Button label="Copy" onPress={copyLink} variant="secondary" compact icon="copy-outline" />
                <Button label="WhatsApp" onPress={shareWhatsApp} compact icon="logo-whatsapp" />
              </View>
            </View>
          ) : (
            <Button label="Generate referral link" onPress={handleGenerate} icon="link-outline" />
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Referral activity</Text>
          </View>
          {loading ? (
            <EmptyState title="Loading referrals" message="Checking your activity." />
          ) : !events || events.items.length === 0 ? (
            <EmptyState title="No referrals yet" message="People you refer will appear here." />
          ) : (
            events.items.map((event, index) => (
              <View key={event.id} style={[styles.row, index !== events.items.length - 1 ? styles.rowBorder : null]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{event.referred_name || 'Invited agency'}</Text>
                  <Text style={styles.rowMeta}>{event.referred_email || event.referred_phone || 'Contact pending'}</Text>
                </View>
                <Badge label={event.status.replace(/_/g, ' ').toLowerCase()} tone={event.status === 'REWARD_GRANTED' ? 'success' : 'info'} compact />
              </View>
            ))
          )}
        </Card>

        <Card style={{ padding: 0 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Reward ledger</Text>
          </View>
          {!rewards || rewards.ledger.length === 0 ? (
            <EmptyState title="No reward entries" message="Credits and adjustments will show here." />
          ) : (
            rewards.ledger.map((item, index) => (
              <View key={item.id} style={[styles.row, index !== rewards.ledger.length - 1 ? styles.rowBorder : null]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.points > 0 ? '+' : ''}{item.points} points</Text>
                  <Text style={styles.rowMeta}>{item.description || item.transaction_type}</Text>
                </View>
                <Text style={styles.rowDate}>{formatMaybe(item.created_at)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScreenContainer>
    </SafeAreaView>
  )
}

function formatMaybe(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(value))
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
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpiCell: {
    flex: 1,
  },
  linkCard: {
    gap: spacing.md,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  helper: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  codeLabel: {
    ...typography.micro,
    color: colors.textSubtle,
  },
  codeText: {
    ...typography.title,
    color: colors.text,
  },
  linkText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  rowDate: {
    ...typography.caption,
    color: colors.textSubtle,
  },
})
