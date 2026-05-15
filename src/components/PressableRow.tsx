import type { ReactNode } from 'react'
import { Pressable, StyleSheet, type GestureResponderEvent, type ViewStyle } from 'react-native'
import { colors, radii } from '@/theme'

type Props = {
  children: ReactNode
  onPress?: (event: GestureResponderEvent) => void
  style?: ViewStyle | ViewStyle[]
  disabled?: boolean
}

export function PressableRow({ children, onPress, style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: colors.surfaceMuted, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        style as ViewStyle | undefined,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
})
