import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/core/stores';
import { colors, typography } from '@/src/core/theme';

export default function AuthLayout() {
    const { isAuthenticated, isLoading } = useAuthStore();

    // If already authenticated, redirect to main app
    if (isAuthenticated && !isLoading) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTitleStyle: {
                    fontSize: typography.fontSize.large,
                    fontWeight: '700',
                    color: colors.text,
                },
                headerTintColor: colors.primary,
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="login"
                options={{
                    title: 'Iniciar Sesión',
                }}
            />
        </Stack>
    );
}
