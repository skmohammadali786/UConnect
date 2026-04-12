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
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { PostsProvider } from "@/context/PostsContext";
import { ChatProvider } from "@/context/ChatContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConfessionsProvider } from "@/context/ConfessionsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { SocialProvider } from "@/context/SocialContext";
import { TeamsProvider } from "@/context/TeamsContext";

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
  const colors = useColors();
  const { themeLoaded } = useTheme();

  if (!themeLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="create-post" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom", contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="invite" options={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="user" options={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
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
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <SocialProvider>
                <TeamsProvider>
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
                </TeamsProvider>
              </SocialProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
