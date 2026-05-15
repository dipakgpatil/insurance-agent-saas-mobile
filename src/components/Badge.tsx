import { StyleSheet, Text, View } from 'react-native'
import { radii, spacing, toneStyles, type Tone, typography } from '@/theme'

type Props = {
  label: string
  tone?: Tone
  compact?: boolean
}

export function Badge({ label, tone = 'neutral', compact }: Props) {
  const palette = toneStyles(tone)
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          paddingHorizontal: compact ? spacing.sm : spacing.md,
          paddingVertical: compact ? 2 : 4,
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.foreground }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.captionBold,
  },
})
