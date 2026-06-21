import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

// 1. Cleaned up API Client imports
import { setBaseUrl } from "@workspace/api-client";
// 2. Imported useAuth directly from the shared package
import { AuthProvider as SharedAuthProvider, useAuth } from "@workspace/shared/auth";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
// 3. Replaced the unsecure adapter with the newly created secure one
import { secureSessionAdapter } from "@/lib/session-storage";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
setBaseUrl(DOMAIN ? `https://${DOMAIN}` : "");

// (Removed the hardcoded AsyncStorage setAuthTokenGetter)

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  // 4. Mapped currentUser from useAuth to keep the logic intact
  const { currentUser: user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
    // 5. Added 'router' to the dependency array to fix the React hook warning
  }, [user, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="lead/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="planner" options={{ headerShown: false }} />
        <Stack.Screen name="resale" options={{ headerShown: false }} />
        <Stack.Screen name="team" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {/* 6. Wired the SharedAuthProvider with the secure adapter and 'mobile' client type */}
            <SharedAuthProvider storage={secureSessionAdapter} client="mobile">
              {/* 7. Removed the duplicate local <AuthProvider> */}
              <LanguageProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </LanguageProvider>
            </SharedAuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}