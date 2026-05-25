import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, shadows, spacing, toneStyles, type Tone, typography } from '@/theme'

type Props = {
  icon: keyof typeof Ionicons.glyphMap
  tone: Tone
  label: string
  value: string
  hint?: string
}

export function KpiCard({ icon, tone, label, value, hint }: Props) {
  const palette = toneStyles(tone)
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={20} color={palette.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.micro,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
})
