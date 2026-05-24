import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { RenewalBadge } from '@/components/RenewalBadge'
import { ScreenContainer } from '@/components/ScreenContainer'
import { useCustomers } from '@/hooks/useCustomers'
import { usePolicies } from '@/hooks/usePolicies'
import { CATEGORY_LABELS, classifyPolicy } from '@/lib/classify'
import { compactCurrency, formatCurrency } from '@/lib/currency'
import { formatDate, parseDate, relativeRenewal } from '@/lib/dates'
import { buildRenewals } from '@/lib/insights'
import { colors, radii, shadows, spacing, typography } from '@/theme'

export default function RenewalDetailScreen() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>()
  const { customers } = useCustomers()
  const { policies, loading } = usePolicies()

  const detail = useMemo(() => {
    const policy = policies.find((p) => p.id === policyId)
    if (!policy) return null
    const customer = customers.find((c) => c.id === policy.customer_id)
    const entries = buildRenewals([policy], customers)
    return { policy, customer, entry: entries[0] }
  }, [policies, customers, policyId])

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
        <Text style={styles.topbarTitle}>Renewal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScreenContainer>
        {loading && !detail ? (
          <EmptyState icon="hourglass" title="Loading…" />
        ) : !detail ? (
          <EmptyState
            icon="alert-circle"
            title="Policy not found"
            message="The policy may have been deleted or you may need to refresh."
          />
        ) : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={detail.customer?.full_name ?? 'Customer'} size={56} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {detail.customer?.full_name ?? 'Unknown customer'}
                  </Text>
                  <Text style={styles.customerSub}>
                    {detail.customer?.mobile ?? 'No mobile on file'}
                  </Text>
                </View>
              </View>

              {detail.customer ? (
                <View style={styles.actionRow}>
                  {detail.customer.mobile ? (
                    <ContactButton
                      icon="call"
                      label="Call"
                      onPress={() => Linking.openURL(`tel:${detail.customer!.mobile}`)}
                    />
                  ) : null}
                  <ContactButton
                    icon="logo-whatsapp"
                    label="WhatsApp"
                    onPress={() => router.push(`/renewal-message/${detail.policy.id}`)}
                  />
                  {detail.customer?.email ? (
                    <ContactButton
                      icon="mail"
                      label="Email"
                      onPress={() => Linking.openURL(`mailto:${detail.customer!.email}`)}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>

            <Card>
              <View style={styles.policyHeader}>
                <Text style={styles.label}>Policy</Text>
                {detail.entry ? <RenewalBadge bucket={detail.entry.bucket} /> : null}
              </View>
              <Text style={styles.policyName}>
                {detail.policy.policy_name || detail.policy.policy_number || 'Policy'}
              </Text>
              {detail.policy.policy_number ? (
                <Text style={styles.policyMeta}>#{detail.policy.policy_number}</Text>
              ) : null}
              <View style={styles.chipRow}>
                <Badge label={CATEGORY_LABELS[classifyPolicy(detail.policy)]} tone="primary" compact />
                <Badge label={detail.policy.status} tone={
                  detail.policy.status === 'active' ? 'success' : 'neutral'
                } compact />
              </View>

              <View style={styles.metaGrid}>
                <MetaItem label="Premium" value={formatCurrency(detail.policy.premium_amount)} />
                <MetaItem
                  label="Sum insured"
                  value={
                    detail.policy.sum_insured
                      ? compactCurrency(detail.policy.sum_insured)
                      : '—'
                  }
                />
                <MetaItem
                  label="Renewal date"
                  value={
                    parseDate(detail.policy.renewal_date)
                      ? formatDate(parseDate(detail.policy.renewal_date)!)
                      : '—'
                  }
                />
                <MetaItem
                  label="Expiry date"
                  value={
                    parseDate(detail.policy.expiry_date)
                      ? formatDate(parseDate(detail.policy.expiry_date)!)
                      : '—'
                  }
                />
                <MetaItem
                  label="Start date"
                  value={
                    parseDate(detail.policy.start_date)
                      ? formatDate(parseDate(detail.policy.start_date)!)
                      : '—'
                  }
                />
                <MetaItem
                  label="IDV"
                  value={
                    detail.policy.idv_amount ? compactCurrency(detail.policy.idv_amount) : '—'
                  }
                />
              </View>

              {detail.entry ? (
                <View style={styles.urgencyBanner}>
                  <Ionicons name="time" size={16} color={colors.primaryDark} />
                  <Text style={styles.urgencyText}>
                    {relativeRenewal(detail.entry.renewalDate)}
                  </Text>
                </View>
              ) : null}
            </Card>

            {detail.customer ? (
              <Card>
                <Text style={styles.label}>Customer details</Text>
                <View style={styles.detailRows}>
                  {detail.customer.email ? (
                    <DetailRow icon="mail" label="Email" value={detail.customer.email} />
                  ) : null}
                  {detail.customer.city || detail.customer.state ? (
                    <DetailRow
                      icon="location"
                      label="Location"
                      value={[detail.customer.city, detail.customer.state]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  ) : null}
                  {detail.customer.pincode ? (
                    <DetailRow icon="map" label="Pincode" value={detail.customer.pincode} />
                  ) : null}
                  {detail.customer.pan_masked ? (
                    <DetailRow
                      icon="card"
                      label="PAN"
                      value={detail.customer.pan_masked}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textSubtle} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

function ContactButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [styles.contactBtn, pressed ? { opacity: 0.8 } : null]}
    >
      <Ionicons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.contactLabel}>{label}</Text>
    </Pressable>
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
  },
  customerName: {
    ...typography.heading,
    color: colors.text,
  },
  customerSub: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    ...shadows.card,
  },
  contactLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.micro,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  policyName: {
    ...typography.title,
    color: colors.text,
  },
  policyMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  metaItem: {
    flexBasis: '50%',
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  metaLabel: {
    ...typography.micro,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  urgencyBanner: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  urgencyText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  detailRows: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.micro,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
})
