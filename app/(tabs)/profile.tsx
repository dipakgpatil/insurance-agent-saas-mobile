import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { ScreenContainer } from '@/components/ScreenContainer'
import { useAuth } from '@/context/useAuth'
import { colors, radii, spacing, typography } from '@/theme'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access your dashboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await logout()
          setSigningOut(false)
          router.replace('/login')
        },
      },
    ])
  }

  const versionText = `v${Constants.expoConfig?.version ?? '0.1.0'}`
  const role = user?.roles?.join(', ') || 'Agent'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer>
        <View>
          <Text style={styles.title}>Profile</Text>
        </View>

        <Card>
          <View style={styles.userRow}>
            <Avatar name={user?.name ?? user?.email ?? 'P'} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name ?? 'Account'}
              </Text>
              {user?.email ? (
                <View style={styles.metaLine}>
                  <Ionicons name="mail" size={14} color={colors.textSubtle} />
                  <Text style={styles.userMeta} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaLine}>
                <Ionicons name="briefcase" size={14} color={colors.textSubtle} />
                <Text style={styles.userMeta} numberOfLines={1}>
                  {role}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Pressable
          onPress={handleSignOut}
          android_ripple={{ color: '#fecaca' }}
          style={({ pressed }) => [
            styles.signOut,
            pressed ? { opacity: 0.85 } : null,
            signingOut ? { opacity: 0.6 } : null,
          ]}
          disabled={signingOut}
        >
          <Ionicons name="log-out" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>

        <Text style={styles.footer}>
          PolicyPulse mobile · {versionText}
        </Text>
      </ScreenContainer>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userName: {
    ...typography.heading,
    color: colors.text,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  userMeta: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    ...typography.bodyBold,
    color: colors.danger,
  },
  footer: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
