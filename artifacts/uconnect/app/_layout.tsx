import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Stack, router, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, Platform, View, useWindowDimensions } from "react-native";
import { supabase } from "@/lib/supabase";
import { extractEventIdFromLink, extractPostIdFromLink, extractReferralCodeFromLink } from "@/utils/postLinks";
import { getResponsiveContentMaxWidth } from "@/utils/responsiveLayout";
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
import { GhostModeProvider } from "@/context/GhostModeContext";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { SocialProvider } from "@/context/SocialContext";
import { TeamsProvider } from "@/context/TeamsContext";
import { QUERY_CACHE_TIMES, QUERY_STALE_TIMES } from "@/constants/queryConfig";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "auth";
    const inPublicShareRoute = segments[0] === "post" || segments[0] === "events";
    if (!user && !inAuth && !inPublicShareRoute) {
      router.replace("/auth/welcome");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const { themeLoaded } = useTheme();
  const contentMaxWidth = getResponsiveContentMaxWidth(width);
  const responsiveContentStyle = {
    backgroundColor: colors.background,
    width: "100%" as const,
    alignSelf: "center" as const,
    ...(contentMaxWidth ? { maxWidth: contentMaxWidth } : {}),
  };

  useEffect(() => {
    if (!themeLoaded) return;
    SystemUI.setBackgroundColorAsync(colors.background).catch((error) => {
      console.warn("Non-fatal: failed to sync splash background color with system UI.", error);
    });
    SplashScreen.hideAsync().catch((error) => {
      console.warn("Non-fatal: failed to hide splash screen automatically.", error);
    });
  }, [themeLoaded, colors.background]);

  if (!themeLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="create-post" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="invite" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="scan-connect" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="connections" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="user" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="post" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="events" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false, animation: "slide_from_right", contentStyle: responsiveContentStyle }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIMES.feed,
        gcTime: QUERY_CACHE_TIMES.feed,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  }));
  const [fontsLoaded, fontError] = useFonts({
    DMSans_500Medium,
    DMSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    });
    return () => subscription.remove();
  }, []);

  const handleDeepLink = useCallback(async (url: string) => {
    const isRecoveryType = (params: URLSearchParams) => {
      const rawType = (params.get("type") || params.get("mode") || "").toLowerCase();
      return rawType === "recovery" || rawType === "password_recovery";
    };

    const postId = extractPostIdFromLink(url);
    if (postId) {
      router.push({ pathname: "/post/[id]", query: { id: postId } });
      return;
    }

    const eventId = extractEventIdFromLink(url);
    if (eventId) {
      router.push({ pathname: "/events/[id]", query: { id: eventId } });
      return;
    }

    const referralCode = extractReferralCodeFromLink(url);
    if (referralCode) {
      router.replace({ pathname: "/auth/login", query: { flow: "signup", referralCode } });
      return;
    }

    if (!url.includes("auth/callback")) return;
    // Hash fragment flow: #access_token=...&refresh_token=...
    const hash = url.split("#")[1];
    if (hash) {
      const p = new URLSearchParams(hash);
      const isRecovery = isRecoveryType(p);
      const access_token = p.get("access_token");
      const refresh_token = p.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        if (isRecovery) {
          router.replace("/auth/reset-password");
        }
        return;
      }
    }
    // PKCE flow: ?code=...
    const query = url.split("?")[1]?.split("#")[0];
    if (query) {
      const p = new URLSearchParams(query);
      const isRecovery = isRecoveryType(p);
      const code = p.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        if (isRecovery) {
          router.replace("/auth/reset-password");
        }
      }
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <SocialProvider>
                <TeamsProvider>
                  <ChatProvider>
                    <NotificationsProvider>
                      <GhostModeProvider>
                        <PostsProvider>
                          <ConfessionsProvider>
                            <ToastProvider>
                              <GestureHandlerRootView style={{ flex: 1 }}>
                                <AuthGate>
                                  <RootLayoutNav />
                                </AuthGate>
                              </GestureHandlerRootView>
                            </ToastProvider>
                          </ConfessionsProvider>
                        </PostsProvider>
                      </GhostModeProvider>
                    </NotificationsProvider>
                  </ChatProvider>
                </TeamsProvider>
              </SocialProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
