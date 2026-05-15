import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = {
  label: string
  onPress?: () => void
  loading?: boolean
  disabled?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  variant?: Variant
  style?: ViewStyle | ViewStyle[]
  compact?: boolean
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  icon,
  variant = 'primary',
  style,
  compact,
}: Props) {
  const palette = variantPalette(variant)
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: palette.ripple, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : 1,
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          transform: pressed && !isDisabled ? [{ scale: 0.98 }] : undefined,
        },
        style as ViewStyle | undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={palette.text} /> : null}
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  )
}

function variantPalette(variant: Variant) {
  switch (variant) {
    case 'secondary':
      return {
        background: colors.surface,
        border: colors.borderStrong,
        text: colors.text,
        ripple: colors.surfaceMuted,
      }
    case 'ghost':
      return {
        background: 'transparent',
        border: 'transparent',
        text: colors.textMuted,
        ripple: colors.surfaceMuted,
      }
    case 'danger':
      return {
        background: colors.danger,
        border: colors.danger,
        text: '#ffffff',
        ripple: '#b91c1c',
      }
    case 'primary':
    default:
      return {
        background: colors.primary,
        border: colors.primary,
        text: '#ffffff',
        ripple: colors.primaryDark,
      }
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  label: {
    ...typography.bodyBold,
  },
})
