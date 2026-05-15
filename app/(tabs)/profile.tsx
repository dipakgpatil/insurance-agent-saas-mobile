import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_BASE_URL } from '@/api/client'
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer>
        <View>
          <Text style={styles.title}>Profile</Text>
        </View>

        <Card>
          <View style={styles.userRow}>
            <Avatar name={user?.name ?? user?.email ?? 'P'} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name ?? 'Account'}
              </Text>
              <Text style={styles.userMeta} numberOfLines={1}>
                {user?.email ?? user?.mobile ?? ''}
              </Text>
              <Text style={styles.userMeta} numberOfLines={1}>
                Role: {user?.roles?.join(', ') || 'Agent'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ padding: 0 }}>
          <SettingRow
            icon="information-circle"
            label="API endpoint"
            value={API_BASE_URL}
          />
          <SettingRow
            icon="apps"
            label="Tenant"
            value={user?.tenant_id ?? '—'}
            divider
          />
          <SettingRow icon="finger-print" label="User ID" value={user?.id ?? '—'} divider />
          <SettingRow icon="code-slash" label="App version" value={versionText} divider />
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
          PolicyPulse mobile · Built for insurance agents on iOS &amp; Android.
        </Text>
      </ScreenContainer>
    </SafeAreaView>
  )
}

function SettingRow({
  icon,
  label,
  value,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  divider?: boolean
}) {
  return (
    <View style={[styles.settingRow, divider ? styles.rowDivider : null]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
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
  userMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  settingValue: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
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
