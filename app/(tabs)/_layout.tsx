import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '@/context/useAuth'
import { colors } from '@/theme'

export default function TabsLayout() {
  const { user, initializing } = useAuth()

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 66,
          paddingTop: 7,
          paddingBottom: 9,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="renewals"
        options={{
          title: 'Renewals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="refresh-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="birthdays"
        options={{
          title: 'Birthdays',
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="gift" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Refer',
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="gift" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
})
