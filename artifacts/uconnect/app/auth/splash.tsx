import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function SplashScreen() {
  const colors = useColors();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace("/(tabs)");
        } else {
          router.replace("/auth/welcome");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated]);

  const isDark = colors.background === "#0A0A0A";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <View style={[styles.logoWrap, isDark ? styles.logoWrapDark : styles.logoWrapLight]}>
          <Image
            source={isDark ? require("@/assets/images/logo-dark.png") : require("@/assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>UConnect</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Your college. Your community.</Text>
      </View>
      <ActivityIndicator color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoContainer: { alignItems: "center", gap: 20 },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapLight: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  logoWrapDark: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  logoImg: { width: 88, height: 88 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loader: { position: "absolute", bottom: 80 },
});
