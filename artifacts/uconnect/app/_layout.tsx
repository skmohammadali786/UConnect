import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PostsProvider } from "@/context/PostsContext";
import { ChatProvider } from "@/context/ChatContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConfessionsProvider } from "@/context/ConfessionsContext";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "auth";
    if (!user && !inAuth) {
      router.replace("/auth/welcome");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-post" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="invite" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
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
        <AuthProvider>
          <SettingsProvider>
            <PostsProvider>
              <ChatProvider>
                <NotificationsProvider>
                  <ConfessionsProvider>
                    <ToastProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <AuthGate>
                          <RootLayoutNav />
                        </AuthGate>
                      </GestureHandlerRootView>
                    </ToastProvider>
                  </ConfessionsProvider>
                </NotificationsProvider>
              </ChatProvider>
            </PostsProvider>
          </SettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
