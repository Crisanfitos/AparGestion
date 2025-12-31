import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { colors } from '@/src/core/theme';
import { useAuthStore } from '@/src/core/stores';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom accessible themes
const AccessibleLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.backgroundSecondary,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

const AccessibleDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Auto-set loading to false on mount for demo purposes
  useEffect(() => {
    // Simulate checking stored session
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle auth state navigation
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inCheckinGroup = segments[0] === 'checkin';

    // Don't redirect if in checkin (public route)
    if (inCheckinGroup) return;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated but in auth group
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AccessibleDarkTheme : AccessibleLightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
      </Stack>
    </ThemeProvider>
  );
}
