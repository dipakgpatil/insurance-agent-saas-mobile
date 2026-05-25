import { StyleSheet, View, type ViewProps } from 'react-native'
import { colors, radii, shadows, spacing } from '@/theme'

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
})
