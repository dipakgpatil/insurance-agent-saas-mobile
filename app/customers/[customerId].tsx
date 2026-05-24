import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { updateCustomer } from '@/api/customers'
import { listDocuments } from '@/api/documents'
import type { DocumentRead, PolicyRead } from '@/api/types'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { ScreenContainer } from '@/components/ScreenContainer'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { useAuth } from '@/context/useAuth'
import { useCustomers } from '@/hooks/useCustomers'
import { usePolicies } from '@/hooks/usePolicies'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_VISUAL,
  classifyPolicy,
  type PolicyCategory,
} from '@/lib/classify'
import { compactCurrency, formatCurrency } from '@/lib/currency'
import { formatDate, parseDate, relativeRenewal } from '@/lib/dates'
import { formatFileSize } from '@/lib/files'
import { colors, radii, shadows, spacing, toneStyles, typography } from '@/theme'

export default function CustomerDetailScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>()
  const { accessToken } = useAuth()
  const { customers, loading: customersLoading, refresh: refreshCustomers } = useCustomers()
  const { policies, loading: policiesLoading } = usePolicies()

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId])
  const customerPolicies = useMemo(
    () => policies.filter((p) => p.customer_id === customerId),
    [policies, customerId],
  )

  const counts = useMemo(() => {
    const out: Record<PolicyCategory | 'all', number> = {
      all: customerPolicies.length,
      health: 0,
      car: 0,
      bike: 0,
      life: 0,
      other: 0,
    }
    for (const p of customerPolicies) out[classifyPolicy(p)] += 1
    return out
  }, [customerPolicies])

  const [activeTab, setActiveTab] = useState<PolicyCategory | 'all'>('all')
  const filtered = useMemo(() => {
    if (activeTab === 'all') return customerPolicies
    return customerPolicies.filter((p) => classifyPolicy(p) === activeTab)
  }, [customerPolicies, activeTab])

  const [documents, setDocuments] = useState<DocumentRead[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactMobile, setContactMobile] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [contactMessage, setContactMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !customerId) return
    let cancelled = false
    setDocsLoading(true)
    listDocuments(accessToken, { customerId })
      .then((items) => {
        if (!cancelled) {
          setDocuments(items)
          setDocsError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDocuments([])
          setDocsError(error instanceof Error ? error.message : 'Failed to load documents')
        }
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, customerId])

  useEffect(() => {
    if (!customer) return
    setContactMobile(customer.mobile ?? '')
    setContactEmail(customer.email ?? '')
  }, [customer])

  const saveContact = async () => {
    if (!accessToken || !customer) return
    try {
      setSavingContact(true)
      setContactError(null)
      setContactMessage(null)
      await updateCustomer(accessToken, customer.id, {
        mobile: contactMobile.trim() || null,
        email: contactEmail.trim() || null,
      })
      await refreshCustomers()
      setEditingContact(false)
      setContactMessage('Contact details updated.')
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Could not update contact details')
    } finally {
      setSavingContact(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {customer?.full_name ?? 'Customer'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScreenContainer>
        {customersLoading && !customer ? (
          <Card>
            <Skeleton height={80} radius={radii.md} />
          </Card>
        ) : !customer ? (
          <EmptyState
            icon="alert-circle"
            title="Customer not found"
            message="This customer may have been deleted. Pull to refresh."
          />
        ) : (
          <>
            <Card>
              <View style={styles.hero}>
                <Avatar name={customer.full_name} size={60} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {customer.full_name}
                  </Text>
                  {customer.city || customer.state ? (
                    <View style={styles.heroMetaLine}>
                      <Ionicons name="location" size={13} color={colors.textSubtle} />
                      <Text style={styles.heroMeta} numberOfLines={1}>
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  ) : null}
                  {customer.customer_code ? (
                    <View style={styles.heroMetaLine}>
                      <Ionicons name="pricetag" size={13} color={colors.textSubtle} />
                      <Text style={styles.heroMeta} numberOfLines={1}>
                        Code · {customer.customer_code}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <ContactActions
                mobile={customer.mobile}
                email={customer.email}
                style={{ marginTop: spacing.md }}
              />

              <Pressable
                onPress={() => {
                  setEditingContact((value) => !value)
                  setContactError(null)
                  setContactMessage(null)
                }}
                android_ripple={{ color: colors.surfaceMuted }}
                style={({ pressed }) => [styles.editContactBtn, pressed ? { opacity: 0.85 } : null]}
              >
                <Ionicons name="create" size={16} color={colors.primaryDark} />
                <Text style={styles.editContactText}>Edit contact</Text>
              </Pressable>

              {contactError ? <Text style={styles.contactError}>{contactError}</Text> : null}
              {contactMessage ? <Text style={styles.contactMessage}>{contactMessage}</Text> : null}

              {editingContact ? (
                <View style={styles.contactEditor}>
                  <View style={styles.editorField}>
                    <Text style={styles.editorLabel}>Mobile</Text>
                    <TextInput
                      value={contactMobile}
                      onChangeText={setContactMobile}
                      keyboardType="phone-pad"
                      placeholder="Mobile"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.editorInput}
                    />
                  </View>
                  <View style={styles.editorField}>
                    <Text style={styles.editorLabel}>Email</Text>
                    <TextInput
                      value={contactEmail}
                      onChangeText={setContactEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Email"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.editorInput}
                    />
                  </View>
                  <View style={styles.editorActions}>
                    <Pressable
                      onPress={() => {
                        setEditingContact(false)
                        setContactMobile(customer.mobile ?? '')
                        setContactEmail(customer.email ?? '')
                      }}
                      disabled={savingContact}
                      style={styles.editorSecondaryBtn}
                    >
                      <Text style={styles.editorSecondaryText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveContact}
                      disabled={savingContact}
                      style={[styles.editorPrimaryBtn, savingContact ? { opacity: 0.6 } : null]}
                    >
                      <Ionicons name="save" size={15} color="#ffffff" />
                      <Text style={styles.editorPrimaryText}>{savingContact ? 'Saving…' : 'Save'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </Card>

            <View>
              <SectionHeader
                title="Policies"
                subtitle={
                  policiesLoading
                    ? 'Loading…'
                    : `${customerPolicies.length} on file`
                }
              />
              <View style={styles.tabsRow}>
                <CategoryTab
                  label="All"
                  count={counts.all}
                  active={activeTab === 'all'}
                  onPress={() => setActiveTab('all')}
                />
                {CATEGORIES.map((category) => (
                  <CategoryTab
                    key={category}
                    label={CATEGORY_LABELS[category]}
                    icon={CATEGORY_VISUAL[category].icon}
                    count={counts[category]}
                    active={activeTab === category}
                    onPress={() => setActiveTab(category)}
                  />
                ))}
              </View>

              {policiesLoading ? (
                <View style={{ gap: spacing.sm }}>
                  <Skeleton height={120} radius={radii.md} />
                  <Skeleton height={120} radius={radii.md} />
                </View>
              ) : filtered.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="shield-half"
                    title="No policies here"
                    message={
                      activeTab === 'all'
                        ? 'No policies on file for this customer yet.'
                        : `No ${CATEGORY_LABELS[activeTab as PolicyCategory].toLowerCase()} policies. Cross-sell opportunity.`
                    }
                  />
                </Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {filtered.map((policy) => (
                    <PolicyTile key={policy.id} policy={policy} />
                  ))}
                </View>
              )}
            </View>

            <View>
              <SectionHeader
                title="Documents"
                subtitle={
                  docsLoading ? 'Loading…' : `${documents.length} file${documents.length === 1 ? '' : 's'} on file`
                }
              />
              {docsError ? <ErrorBanner message={docsError} /> : null}
              {docsLoading ? (
                <View style={{ gap: spacing.sm }}>
                  <Skeleton height={72} radius={radii.md} />
                  <Skeleton height={72} radius={radii.md} />
                </View>
              ) : documents.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="folder-open"
                    title="No documents yet"
                    message="Upload customer documents from the web app — they appear here."
                  />
                </Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {documents.map((doc) => (
                    <DocumentTile key={doc.id} document={doc} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  )
}

function ContactActions({
  mobile,
  email,
  style,
}: {
  mobile: string | null
  email: string | null
  style?: object
}) {
  const buttons: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = []
  if (mobile) {
    buttons.push({
      icon: 'call',
      label: 'Call',
      onPress: () => Linking.openURL(`tel:${mobile}`).catch(() => {}),
    })
    const digits = String(mobile).replace(/\D/g, '').slice(-10)
    if (digits.length === 10) {
      buttons.push({
        icon: 'logo-whatsapp',
        label: 'WhatsApp',
        onPress: () => Linking.openURL(`https://wa.me/91${digits}`).catch(() => {}),
      })
    }
  }
  if (email) {
    buttons.push({
      icon: 'mail',
      label: 'Email',
      onPress: () => Linking.openURL(`mailto:${email}`).catch(() => {}),
    })
  }

  if (buttons.length === 0) {
    return (
      <Text style={[styles.noContact, style]}>
        No mobile or email on file for this customer.
      </Text>
    )
  }

  return (
    <View style={[styles.actionsRow, style]}>
      {buttons.map((btn) => (
        <Pressable
          key={btn.label}
          onPress={btn.onPress}
          android_ripple={{ color: colors.surfaceMuted }}
          style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.8 } : null]}
        >
          <Ionicons name={btn.icon} size={16} color={colors.primaryDark} />
          <Text style={styles.actionLabel}>{btn.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function CategoryTab({
  label,
  icon,
  count,
  active,
  onPress,
}: {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  count: number
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.catTab, active ? styles.catTabActive : null]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? '#ffffff' : colors.textMuted}
        />
      ) : null}
      <Text
        style={[
          styles.catTabText,
          active ? styles.catTabTextActive : null,
        ]}
      >
        {label} {count}
      </Text>
    </Pressable>
  )
}

function PolicyTile({ policy }: { policy: PolicyRead }) {
  const cat = classifyPolicy(policy)
  const visual = CATEGORY_VISUAL[cat]
  const tone = toneStyles(visual.tone)
  const renewal = parseDate(policy.renewal_date)
  return (
    <Pressable
      onPress={() => router.push(`/renewals/${policy.id}`)}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [styles.policyTile, pressed ? { opacity: 0.95 } : null]}
    >
      <View style={styles.policyTileHeader}>
        <View style={[styles.policyCatChip, { backgroundColor: tone.background }]}>
          <Ionicons name={visual.icon} size={12} color={tone.foreground} />
          <Text style={[styles.policyCatText, { color: tone.foreground }]}>{visual.label}</Text>
        </View>
        <Badge
          label={policy.status}
          tone={policy.status === 'active' ? 'success' : 'neutral'}
          compact
        />
      </View>
      <Text style={styles.policyName} numberOfLines={1}>
        {policy.policy_name || 'Policy'}
      </Text>
      {policy.policy_number ? (
        <Text style={styles.policyNumber} numberOfLines={1}>
          #{policy.policy_number}
        </Text>
      ) : null}
      <View style={styles.policyMetaRow}>
        <View>
          <Text style={styles.policyMetaLabel}>Premium</Text>
          <Text style={styles.policyMetaValue}>{formatCurrency(policy.premium_amount)}</Text>
        </View>
        <View>
          <Text style={styles.policyMetaLabel}>Sum insured</Text>
          <Text style={styles.policyMetaValue}>
            {policy.sum_insured ? compactCurrency(policy.sum_insured) : '—'}
          </Text>
        </View>
        <View>
          <Text style={styles.policyMetaLabel}>Renewal</Text>
          <Text style={styles.policyMetaValue}>
            {renewal ? relativeRenewal(renewal) : '—'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

function DocumentTile({ document }: { document: DocumentRead }) {
  const mime = document.mime_type ?? ''
  const icon: keyof typeof Ionicons.glyphMap = mime.includes('pdf')
    ? 'document-text'
    : mime.includes('image')
      ? 'image'
      : 'document'
  const created = parseDate(document.created_at)
  return (
    <Pressable
      onPress={() => router.push(`/documents/${document.id}`)}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [styles.docTile, pressed ? { opacity: 0.96 } : null]}
    >
      <View style={styles.docIcon}>
        <Ionicons name={icon} size={20} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.docName} numberOfLines={1}>
          {document.original_file_name}
        </Text>
        <Text style={styles.docMeta} numberOfLines={1}>
          {document.document_type ?? document.document_category}
          {created ? ` · ${formatDate(created)}` : ''}
          {` · ${formatFileSize(document.file_size_bytes)}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
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
  iconBtn: {
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroName: {
    ...typography.heading,
    color: colors.text,
  },
  heroMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    ...shadows.card,
  },
  actionLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  noContact: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  editContactBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  editContactText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  contactEditor: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  editorField: {
    gap: 6,
  },
  editorLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  editorInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editorSecondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  editorSecondaryText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  editorPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  editorPrimaryText: {
    ...typography.captionBold,
    color: '#ffffff',
  },
  contactError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  contactMessage: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catTabText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  catTabTextActive: {
    color: '#ffffff',
  },
  policyTile: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    ...shadows.card,
  },
  policyTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  policyCatText: {
    ...typography.micro,
  },
  policyName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  policyNumber: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  policyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  policyMetaLabel: {
    ...typography.micro,
    color: colors.textSubtle,
  },
  policyMetaValue: {
    ...typography.captionBold,
    color: colors.text,
    marginTop: 2,
  },
  docTile: {
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
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  docMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
})
