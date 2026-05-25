import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { ScreenContainer } from '@/components/ScreenContainer'
import { useAuth } from '@/context/useAuth'
import { downloadProfileExport, listExcelProfiles, type ExcelFormatProfileRead } from '@/api/excel_profiles'
import { colors, radii, spacing, typography } from '@/theme'

export default function ProfileScreen() {
  const { user, logout, accessToken } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [profiles, setProfiles] = useState<ExcelFormatProfileRead[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    listExcelProfiles(accessToken).then(setProfiles).catch(() => null)
  }, [accessToken])

  const handleDownload = useCallback(
    async (profile: ExcelFormatProfileRead, scope: 'active' | 'all') => {
      if (!accessToken) return
      setDownloadingId(profile.id + scope)
      try {
        await downloadProfileExport(accessToken, profile.id, profile.name, scope)
      } catch (err) {
        Alert.alert('Download failed', err instanceof Error ? err.message : 'Could not export Excel file')
      } finally {
        setDownloadingId(null)
      }
    },
    [accessToken],
  )

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

  const versionText = `v${Constants.expoConfig?.version ?? '1.0.2'}`
  const role = user?.roles?.join(', ') || 'Agent'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenContainer>
        <View>
          <Text style={styles.title}>Menu</Text>
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

        <Card style={{ padding: 0 }}>
          <Text style={styles.sectionLabel}>Tools</Text>
          <ToolRow
            icon="cloud-upload"
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            title="Bulk import from Excel"
            subtitle="Upload customers and policies from a spreadsheet — no laptop needed."
            onPress={() => router.push('/import-excel')}
            divider
          />
          <ToolRow
            icon="refresh-circle"
            iconColor={colors.success}
            iconBg={colors.successLight}
            title="Upload Renewal"
            subtitle="Upload a renewal sheet to mark old terms renewed and create new active policies."
            onPress={() => router.push('/renewal-upload')}
            divider
          />
          <ToolRow
            icon="people"
            iconColor={colors.info}
            iconBg={colors.infoLight}
            title="Refer agents and earn"
            subtitle="Share your referral code and unlock benefits."
            onPress={() => router.push('/(tabs)/referrals')}
            divider
          />
          <ToolRow
            icon="gift"
            iconColor={colors.primaryDark}
            iconBg={colors.primaryLight}
            title="Birthdays"
            subtitle="See upcoming customer and family birthdays."
            onPress={() => router.push('/(tabs)/birthdays')}
          />
        </Card>

        {profiles.length > 0 ? (
          <Card style={{ padding: 0 }}>
            <Text style={styles.sectionLabel}>Download Excel</Text>
            {profiles.map((profile, index) => (
              <View
                key={profile.id}
                style={[
                  styles.profileRow,
                  index < profiles.length - 1 ? styles.profileRowBorder : null,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {profile.name}
                    {profile.is_default ? '  ★' : ''}
                  </Text>
                  <Text style={styles.profileMeta}>
                    {profile.column_schema.length} columns
                    {profile.source_sheet_name ? ` · ${profile.source_sheet_name}` : ''}
                  </Text>
                </View>
                <View style={styles.downloadBtns}>
                  <Pressable
                    onPress={() => void handleDownload(profile, 'active')}
                    disabled={downloadingId !== null}
                    style={({ pressed }) => [
                      styles.downloadBtn,
                      { backgroundColor: colors.primaryLight },
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    {downloadingId === profile.id + 'active' ? (
                      <Ionicons name="hourglass" size={14} color={colors.primary} />
                    ) : (
                      <Ionicons name="download" size={14} color={colors.primary} />
                    )}
                    <Text style={[styles.downloadBtnText, { color: colors.primary }]}>Active</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDownload(profile, 'all')}
                    disabled={downloadingId !== null}
                    style={({ pressed }) => [
                      styles.downloadBtn,
                      { backgroundColor: colors.surfaceMuted },
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    {downloadingId === profile.id + 'all' ? (
                      <Ionicons name="hourglass" size={14} color={colors.textSubtle} />
                    ) : (
                      <Ionicons name="download-outline" size={14} color={colors.textSubtle} />
                    )}
                    <Text style={[styles.downloadBtnText, { color: colors.textSubtle }]}>All</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

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
          PolicyOffice - {versionText}
        </Text>
      </ScreenContainer>
    </SafeAreaView>
  )
}

function ToolRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  onPress: () => void
  divider?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfaceMuted }}
      style={({ pressed }) => [
        styles.toolRow,
        divider ? styles.toolRowBorder : null,
        pressed ? { backgroundColor: colors.surfaceMuted } : null,
      ]}
    >
      <View style={[styles.toolIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
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
  sectionLabel: {
    ...typography.micro,
    color: colors.textSubtle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toolRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  toolSubtitle: {
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  profileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  profileMeta: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  downloadBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  downloadBtnText: {
    ...typography.micro,
    fontWeight: '600',
  },
})
