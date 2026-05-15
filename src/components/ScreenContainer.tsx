import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing } from '@/theme'

type Props = {
  children: ReactNode
  scroll?: boolean
  refreshControl?: React.ReactElement<RefreshControlProps>
  padded?: boolean
}

export function ScreenContainer({ children, scroll = true, refreshControl, padded = true }: Props) {
  const insets = useSafeAreaInsets()
  const contentStyle = [
    padded ? styles.padded : null,
    { paddingBottom: insets.bottom + spacing.xxxl },
  ]

  if (!scroll) {
    return <View style={[styles.container, contentStyle]}>{children}</View>
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
})
