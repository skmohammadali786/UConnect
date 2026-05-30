import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGhostMode } from "@/context/GhostModeContext";
import { useToast } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function GhostModeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const ghost = useGhostMode();
  const { showSuccess, showError } = useToast();
  const [busy, setBusy] = useState(false);
  const fog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(fog, { toValue: 1, duration: 5000, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(fog, { toValue: 0, duration: 5000, useNativeDriver: Platform.OS !== "web" }),
    ])).start();
  }, []);

  const translateX = fog.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });

  const toggle = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) {
        const session = await ghost.activateGhostMode();
        showSuccess("Ghost Mode active", `You are ${session.alias}.`);
      } else {
        await ghost.deactivateGhostMode();
        showSuccess("Ghost Mode disabled", "Your normal identity is restored.");
      }
    } catch (e: any) {
      showError("Ghost Mode unavailable", e?.message ?? "Try again later. A 24-hour cooldown may be active.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, colors.backgroundSubtle, colors.card]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.fog, { backgroundColor: colors.primary + "1F", transform: [{ translateX }] }]} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="chevron-left" size={22} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ghost Mode</Text>
          <View style={[styles.back, { backgroundColor: "transparent" }]} />
        </View>

        <View style={styles.hero}>
          <View style={[styles.ghostOrb, { backgroundColor: colors.primarySoft, borderColor: colors.primary + "55", shadowColor: colors.primary }]}><Feather name="cloud-snow" size={42} color={colors.primary} /></View>
          <Text style={[styles.title, { color: colors.foreground }]}>{ghost.isGhostActive ? "Ghost Mode Active" : "Become Untraceable"}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A premium privacy state that masks your identity across posts and comments for exactly 6 hours.</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Temporary anonymous existence</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>6 hours active · 24 hours cooldown</Text>
            </View>
            <Switch value={ghost.isGhostActive} disabled={busy || ghost.isLoading} onValueChange={toggle} trackColor={{ false: colors.secondary, true: colors.primary }} thumbColor={colors.primaryForeground} />
          </View>
        </View>

        {ghost.isGhostActive && ghost.session ? (
          <View style={[styles.dashboard, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}>
            <Text style={[styles.dashboardLabel, { color: colors.primary }]}>CURRENT GHOST IDENTITY</Text>
            <Text style={[styles.alias, { color: colors.foreground }]}>{ghost.session.alias}</Text>
            <Text style={[styles.timer, { color: colors.primary }]}>{formatTime(ghost.secondsRemaining)}</Text>
            <View style={styles.statsRow}>
              <View style={[styles.stat, { backgroundColor: colors.secondary }]}><Text style={[styles.statNum, { color: colors.foreground }]}>{ghost.session.postsCreated}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ghost Posts</Text></View>
              <View style={[styles.stat, { backgroundColor: colors.secondary }]}><Text style={[styles.statNum, { color: colors.foreground }]}>{ghost.session.commentsCreated}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ghost Comments</Text></View>
              <View style={[styles.stat, { backgroundColor: colors.secondary }]}><Text style={[styles.statNum, { color: colors.foreground }]}>{ghost.activeCount}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Ghosts</Text></View>
            </View>
            <TouchableOpacity disabled={busy} onPress={() => toggle(false)} style={[styles.deactivate, { backgroundColor: colors.destructive }]}><Text style={[styles.deactivateText, { color: colors.destructiveForeground }]}>Deactivate Ghost Mode</Text></TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.rules, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.rulesTitle, { color: colors.foreground }]}>Security Rules</Text>
          {["Username, avatar, college, Vault Score, reputation, and skill radar are hidden.", "Ghost posts store an alias snapshot permanently and never link to profile navigation.", "Ghosts can browse, chat, post, comment, and read content.", "Ghosts cannot create events, internships, teams, vote in Legends, verify documents, or edit Vault Score data."].map((rule) => <View key={rule} style={styles.ruleRow}><Feather name="shield" size={14} color={colors.primary} /><Text style={[styles.ruleText, { color: colors.mutedForeground }]}>{rule}</Text></View>)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  fog: { position: "absolute", top: 120, left: -40, right: -40, height: 260, backgroundColor: "rgba(124,58,237,0.12)", borderRadius: 160 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 18 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  headerTitle: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 18 },
  hero: { alignItems: "center", paddingHorizontal: 26, marginTop: 24, marginBottom: 22 },
  ghostOrb: { width: 108, height: 108, borderRadius: 54, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(124,58,237,0.22)", borderWidth: 1, borderColor: "rgba(196,181,253,0.38)", shadowColor: "#A78BFA", shadowOpacity: 0.65, shadowRadius: 24 },
  title: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 30, marginTop: 18, textAlign: "center" },
  subtitle: { color: "#CBD5E1", fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8 },
  panel: { margin: 16, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: "rgba(196,181,253,0.25)", backgroundColor: "rgba(15,23,42,0.76)" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  rowTitle: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 15 },
  rowSub: { color: "#A5B4FC", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  dashboard: { margin: 16, padding: 18, borderRadius: 26, borderWidth: 1, borderColor: "rgba(167,139,250,0.35)", backgroundColor: "rgba(8,13,28,0.86)", alignItems: "center" },
  dashboardLabel: { color: "#818CF8", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.8 },
  alias: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 30, marginTop: 10 },
  timer: { color: "#C4B5FD", fontFamily: "Inter_700Bold", fontSize: 38, marginTop: 12, letterSpacing: 1.5 },
  statsRow: { flexDirection: "row", marginTop: 18, gap: 10 },
  stat: { flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 12 },
  statNum: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { color: "#94A3B8", fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 4, textAlign: "center" },
  deactivate: { marginTop: 18, backgroundColor: "#EF4444", borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13, width: "100%", alignItems: "center" },
  deactivateText: { color: "#FFF", fontFamily: "Inter_700Bold" },
  rules: { margin: 16, padding: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  rulesTitle: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 12 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  ruleText: { color: "#CBD5E1", fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 19, flex: 1 },
});
