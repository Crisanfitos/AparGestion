import { Stack } from 'expo-router';
import { colors, typography } from '@/src/core/theme';

export default function CheckinLayout() {
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
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Check-in',
                    headerBackTitle: 'Atrás',
                }}
            />
            <Stack.Screen
                name="success"
                options={{
                    title: 'Confirmación',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
