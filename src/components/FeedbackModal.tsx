import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Button } from './Button'
import { colors, radii, shadows, spacing, typography } from '@/theme'

const RATING_LABELS = ['', 'Terrible', 'Not great', 'Okay', 'Pretty good', 'Loved it']

type Props = {
  visible: boolean
  submitting?: boolean
  onSubmit: (rating: number, note: string) => void | Promise<void>
  onSkip: () => void | Promise<void>
}

export function FeedbackModal({ visible, submitting, onSubmit, onSkip }: Props) {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (rating === 0) return
    void onSubmit(rating, note)
  }

  const handleSkip = () => {
    setRating(0)
    setNote('')
    void onSkip()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>How are we doing?</Text>
          <Text style={styles.subtitle}>
            You&apos;ve been using PolicyPulse for a while — your honest rating helps us improve.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                hitSlop={6}
                style={styles.starBtn}
              >
                <Ionicons
                  name={value <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={value <= rating ? '#f59e0b' : colors.borderStrong}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{rating > 0 ? RATING_LABELS[rating] : 'Tap a star'}</Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anything we should know? (optional)"
            placeholderTextColor={colors.textSubtle}
            multiline
            textAlignVertical="top"
            style={styles.input}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{note.length}/2000</Text>

          <Button
            label={submitting ? 'Sending…' : 'Send feedback'}
            icon="paper-plane"
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            loading={submitting}
          />
          <Pressable
            onPress={handleSkip}
            hitSlop={6}
            android_ripple={{ color: colors.surfaceMuted, borderless: true }}
            style={styles.skipBtn}
            disabled={submitting}
          >
            <Text style={styles.skipText}>Maybe later</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.floating,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    minHeight: 18,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 100,
    maxHeight: 180,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  charCount: {
    ...typography.micro,
    color: colors.textSubtle,
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
})
