import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { ScreenContainer } from '@/components/ScreenContainer'
import { listRenewalMessageTemplates, renderRenewalMessage } from '@/api/messageTemplates'
import type { MessageTemplateRead } from '@/api/types'
import { useAuth } from '@/context/useAuth'
import { useCustomers } from '@/hooks/useCustomers'
import { usePolicies } from '@/hooks/usePolicies'
import { formatCurrency } from '@/lib/currency'
import { formatDate, parseDate } from '@/lib/dates'
import { titleCaseName } from '@/lib/names'
import { sendWish } from '@/lib/whatsapp'
import { colors, radii, shadows, spacing, typography } from '@/theme'

type Language = 'en' | 'mr'

const LANGUAGE_LABEL: Record<Language, string> = {
  en: 'English',
  mr: 'मराठी',
}

export default function RenewalMessageScreen() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>()
  const { accessToken } = useAuth()
  const { customers, loading: customersLoading } = useCustomers()
  const { policies, loading: policiesLoading } = usePolicies()
  const [templates, setTemplates] = useState<MessageTemplateRead[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('mr')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [rendering, setRendering] = useState(false)
  const [sending, setSending] = useState(false)

  const policy = policies.find((item) => item.id === policyId)
  const customer = policy ? customers.find((item) => item.id === policy.customer_id) : undefined
  const languageTemplates = useMemo(
    () => templates.filter((template) => template.language === language),
    [templates, language],
  )
  const renewalDate = parseDate(policy?.renewal_date)
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setTemplatesLoading(true)
    listRenewalMessageTemplates(accessToken)
      .then((items) => {
        if (cancelled) return
        setTemplates(items)
        setError(null)
        const preferred = items.find((item) => item.language === language) ?? items[0]
        setSelectedTemplateId((current) => current ?? preferred?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load templates')
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, language])

  useEffect(() => {
    const fallback = languageTemplates[0]
    if (!fallback) {
      setSelectedTemplateId(null)
      return
    }
    if (!selectedTemplateId || !languageTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(fallback.id)
    }
  }, [languageTemplates, selectedTemplateId])

  useEffect(() => {
    if (!accessToken || !policyId || !selectedTemplateId) return
    let cancelled = false
    setRendering(true)
    renderRenewalMessage(accessToken, selectedTemplateId, policyId)
      .then((response) => {
        if (!cancelled) {
          setMessage(response.message)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage('')
          setError(err instanceof Error ? err.message : 'Could not prepare message')
        }
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, policyId, selectedTemplateId])

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    const result = await sendWish({ mobile: customer?.mobile, message: message.trim() })
    setSending(false)
    if (result.kind === 'whatsapp') {
      Alert.alert('WhatsApp opened', 'Review the message and tap send.')
    } else if (result.kind === 'sms') {
      Alert.alert('Messages opened', 'Review the message and tap send.')
    } else if (result.kind === 'clipboard') {
      Alert.alert('Message copied', result.reason)
    } else {
      Alert.alert('Could not open message', result.reason)
    }
  }

  const loading = customersLoading || policiesLoading

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
        <Text style={styles.topbarTitle}>Renewal WhatsApp</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <EmptyState icon="hourglass" title="Loading…" />
      ) : !policy || !customer ? (
        <EmptyState
          icon="alert-circle"
          title="Renewal not found"
          message="Refresh the renewals list and try again."
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenContainer>
            {error ? <ErrorBanner message={error} /> : null}

            <Card>
              <View style={styles.customerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {titleCaseName(customer.full_name)}
                  </Text>
                  <Text style={styles.customerSub}>
                    {customer.mobile ?? 'No mobile on file'}
                  </Text>
                </View>
                <View style={styles.amountPill}>
                  <Text style={styles.amountLabel}>Premium</Text>
                  <Text style={styles.amount}>{formatCurrency(policy.premium_amount)}</Text>
                </View>
              </View>
              <View style={styles.metaGrid}>
                <MetaItem label="Policy" value={policy.policy_name || policy.policy_number || 'Policy'} />
                <MetaItem label="Renewal" value={renewalDate ? formatDate(renewalDate) : '—'} />
              </View>
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Language</Text>
              <View style={styles.languageToggle}>
                {(['en', 'mr'] as Language[]).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setLanguage(item)}
                    style={[
                      styles.languageButton,
                      language === item ? styles.languageButtonActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageText,
                        language === item ? styles.languageTextActive : null,
                      ]}
                    >
                      {LANGUAGE_LABEL[item]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Template</Text>
              {templatesLoading ? (
                <Text style={styles.muted}>Loading templates…</Text>
              ) : languageTemplates.length === 0 ? (
                <Text style={styles.muted}>No templates available.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateRow}
                >
                  {languageTemplates.map((template) => (
                    <Pressable
                      key={template.id}
                      onPress={() => setSelectedTemplateId(template.id)}
                      style={[
                        styles.templateChip,
                        selectedTemplateId === template.id ? styles.templateChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.templateText,
                          selectedTemplateId === template.id ? styles.templateTextActive : null,
                        ]}
                      >
                        {template.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Card>

            <Card>
              <View style={styles.editorHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Message</Text>
                  <Text style={styles.muted}>
                    {rendering ? 'Preparing message…' : selectedTemplate?.name ?? 'Ready'}
                  </Text>
                </View>
                <Text style={styles.charCount}>{message.length} chars</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                placeholder="Write renewal message"
                placeholderTextColor={colors.textSubtle}
                style={styles.messageInput}
              />
            </Card>

            <Button
              label={customer.mobile ? 'Open WhatsApp' : 'Copy message'}
              icon={customer.mobile ? 'logo-whatsapp' : 'copy'}
              onPress={handleSend}
              loading={sending}
              disabled={!message.trim()}
            />
          </ScreenContainer>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topbar: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topbarTitle: {
    ...typography.heading,
    color: colors.text,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customerName: {
    ...typography.heading,
    color: colors.text,
  },
  customerSub: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  amountPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...typography.micro,
    color: colors.primaryDark,
  },
  amount: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  metaGrid: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  metaItem: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  metaValue: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
  },
  languageButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  languageButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  languageText: {
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  languageTextActive: {
    color: colors.primaryDark,
  },
  muted: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  templateRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  templateChip: {
    maxWidth: 240,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  templateText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  templateTextActive: {
    color: colors.primaryDark,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  charCount: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  messageInput: {
    minHeight: 260,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
})
