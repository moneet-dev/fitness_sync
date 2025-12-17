import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '@/context/UserContext';
import { useEffect } from 'react';
import { initAuth } from '@/services/auth';

export const unstable_settings = {
  anchor: 'welcome',
};

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    // initialize auth token from secure storage so synchronous getAuthToken() works
    (async () => {
      try {
        await initAuth();
      } catch (err) {
        // ignore; initAuth logs on failure
      }
    })();
  }, []);

  return (
    <UserProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="analytics" options={{ headerShown: false }} />
          <Stack.Screen name="professional-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="professional-profile" options={{ headerShown: false }} />
          <Stack.Screen name="client-profile" options={{ headerShown: false }} />
          <Stack.Screen name="client-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="client-detail" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="appointment-booking" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="conversations" options={{ headerShown: false }} />
          <Stack.Screen name="goals" options={{ headerShown: false }} />
          <Stack.Screen name="connection-test" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserProvider>
  );
}
