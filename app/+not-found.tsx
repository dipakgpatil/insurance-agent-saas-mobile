import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '@/context/useAuth'
import { colors } from '@/theme'

export default function NotFoundRedirect() {
  const { user, initializing } = useAuth()

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  if (!user.tenant_id && user.user_type !== 'platform_admin') {
    return <Redirect href="/onboarding/agency" />
  }

  return <Redirect href="/(tabs)" />
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
})
