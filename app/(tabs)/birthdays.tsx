import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { BirthdayBadge } from '@/components/BirthdayBadge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Skeleton } from '@/components/Skeleton'
import { useCustomers } from '@/hooks/useCustomers'
import { formatDate } from '@/lib/dates'
import { type BirthdayEntry, buildBirthdays } from '@/lib/insights'
import { sendWish } from '@/lib/whatsapp'
import { BIRTHDAY_WISHES, buildWishMessage, type WishTemplate } from '@/lib/wishes'
import { colors, radii, shadows, spacing, typography } from '@/theme'

export default function BirthdaysScreen() {
  const { customers, loading, error, refresh } = useCustomers()
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<BirthdayEntry | null>(null)
  const [outcome, setOutcome] = useState<string | null>(null)

  const birthdays = useMemo(() => buildBirthdays(customers, 60), [customers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return birthdays
    return birthdays.filter((entry) => {
      const haystack = [
        entry.customer.full_name,
        entry.customer.mobile ?? '',
        entry.customer.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [birthdays, query])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Birthdays</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${birthdays.length} in the next 60 days`}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSubtle} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search customers"
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

      {outcome ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.toastText}>{outcome}</Text>
          <Pressable onPress={() => setOutcome(null)} hitSlop={6}>
            <Ionicons name="close" size={16} color={colors.success} />
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingList}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={72} radius={radii.md} style={styles.skeletonRow} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="balloon"
          title={birthdays.length === 0 ? 'No upcoming birthdays' : 'Nothing matches'}
          message={
            birthdays.length === 0
              ? 'Add dates of birth on customer profiles to see reminders here.'
              : 'Try a different search.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.customer.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {})
                setTarget(item)
              }}
              android_ripple={{ color: colors.surfaceMuted }}
              style={({ pressed }) => [styles.row, pressed ? { opacity: 0.96 } : null]}
            >
              <Avatar name={item.customer.full_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.customer.full_name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {formatDate(item.nextBirthday)}
                  {item.age ? ` · turns ${item.age}` : ''}
                  {item.customer.mobile ? ` · ${item.customer.mobile}` : ''}
                </Text>
              </View>
              <BirthdayBadge bucket={item.bucket} compact />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      <WishModal
        entry={target}
        onClose={() => setTarget(null)}
        onSent={(message) => {
          setTarget(null)
          setOutcome(message)
          setTimeout(() => setOutcome(null), 4500)
        }}
      />
    </SafeAreaView>
  )
}

function WishModal({
  entry,
  onClose,
  onSent,
}: {
  entry: BirthdayEntry | null
  onClose: () => void
  onSent: (message: string) => void
}) {
  const [template, setTemplate] = useState<WishTemplate>(BIRTHDAY_WISHES[0])
  const [message, setMessage] = useState('')
  const [edited, setEdited] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (entry) {
      setMessage(buildWishMessage(template, entry.customer.full_name))
      setEdited(false)
    }
  }, [entry])

  const applyTemplate = useCallback(
    (tpl: WishTemplate) => {
      setTemplate(tpl)
      if (entry) {
        setMessage(buildWishMessage(tpl, entry.customer.full_name))
        setEdited(false)
      }
    },
    [entry],
  )

  const handleSend = async () => {
    if (!entry || !message.trim()) return
    setSending(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const result = await sendWish({ mobile: entry.customer.mobile, message })
    setSending(false)
    if (result.kind === 'whatsapp') {
      onSent('Opened in WhatsApp. Tap send when ready.')
    } else if (result.kind === 'sms') {
      onSent('Opened in Messages. Tap send when ready.')
    } else if (result.kind === 'clipboard') {
      onSent(result.reason)
    } else {
      onSent(result.reason)
    }
  }

  if (!entry) return null

  return (
    <Modal
      visible={Boolean(entry)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Send a birthday wish</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {entry.customer.full_name}
                {entry.customer.mobile ? ` · ${entry.customer.mobile}` : ' · no mobile'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <Text style={styles.modalLabel}>Start with a template</Text>
            <View style={styles.wishList}>
              {BIRTHDAY_WISHES.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => applyTemplate(tpl)}
                  style={[
                    styles.wishChip,
                    template.id === tpl.id && !edited ? styles.wishChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.wishChipText,
                      template.id === tpl.id && !edited ? styles.wishChipTextActive : null,
                    ]}
                  >
                    {tpl.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.editorHeader}>
              <Text style={styles.modalLabel}>Edit message</Text>
              {edited ? <Text style={styles.editedFlag}>Edited</Text> : null}
            </View>
            <TextInput
              value={message}
              onChangeText={(text) => {
                setMessage(text)
                setEdited(true)
              }}
              multiline
              textAlignVertical="top"
              placeholder="Write a personal birthday message…"
              placeholderTextColor={colors.textSubtle}
              style={styles.messageInput}
            />
            <Text style={styles.charCount}>{message.length} chars</Text>
          </ScrollView>

          <Button
            label={entry.customer.mobile ? 'Send via WhatsApp' : 'Copy message'}
            icon={entry.customer.mobile ? 'logo-whatsapp' : 'copy'}
            onPress={handleSend}
            loading={sending}
            disabled={!message.trim()}
          />
          <Text style={styles.modalFooter}>
            If WhatsApp isn&apos;t installed, we&apos;ll try SMS, then copy the message to
            your clipboard.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  toast: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  toastText: {
    flex: 1,
    ...typography.caption,
    color: colors.success,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    ...shadows.floating,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  modalLabel: {
    ...typography.micro,
    color: colors.textSubtle,
  },
  wishList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  wishChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wishChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  wishChipText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  wishChipTextActive: {
    color: '#ffffff',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editedFlag: {
    ...typography.micro,
    color: colors.primary,
  },
  messageInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 140,
    maxHeight: 220,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  charCount: {
    ...typography.micro,
    color: colors.textSubtle,
    textAlign: 'right',
  },
  modalFooter: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
  },
})
