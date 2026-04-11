import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function SplashScreen() {
  const colors = useColors();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace("/(tabs)/");
        } else {
          router.replace("/auth/welcome");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <View style={[styles.logoRing, { borderColor: colors.primary + "40" }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.logoText, { color: colors.primary }]}>U</Text>
          </View>
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
  logoContainer: { alignItems: "center", gap: 16 },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 48, fontFamily: "Inter_700Bold", lineHeight: 54 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loader: { position: "absolute", bottom: 80 },
});
