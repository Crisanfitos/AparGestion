import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { colors, typography, spacing } from '@/src/core/theme';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -4 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 2,
        },
        headerTitleStyle: {
          fontSize: typography.fontSize.large,
          fontWeight: '700',
          color: colors.text,
        },
        headerTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarAccessibilityLabel: 'Pantalla de inicio con resumen',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          tabBarAccessibilityLabel: 'Ver calendario de reservas',
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text" color={color} />,
          tabBarAccessibilityLabel: 'Gestión de documentos',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          tabBarAccessibilityLabel: 'Configuración y perfil',
        }}
      />
      {/* Hide old index */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
