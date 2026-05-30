import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VaultRadarCard } from "@/components/vault/VaultRadarCard";
import { useAuth } from "@/context/AuthContext";
import { useGhostMode } from "@/context/GhostModeContext";
import { useVaultSummary } from "@/hooks/useVault";

const vaultColors = {
  background: "#050712",
  card: "rgba(15,23,42,0.72)",
  border: "rgba(167,139,250,0.22)",
  foreground: "#F8FAFC",
  mutedForeground: "#A5B4FC",
  primary: "#A78BFA",
  secondary: "rgba(124,58,237,0.16)",
  shadow: "#000",
};

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {Platform.OS === "ios" ? <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={["rgba(124,58,237,0.22)", "rgba(14,165,233,0.08)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: any }) {
  return (
    <GlassCard style={styles.metricCard}>
      <Feather name={icon} size={18} color="#C4B5FD" />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeCount } = useGhostMode();
  const { data, isLoading, refetch } = useVaultSummary(user?.id);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: false }),
    ])).start();
  }, []);

  const summary = data;
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#050712", "#0B1020", "#111827"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orbOne, { opacity: glow }]} />
      <Animated.View style={[styles.orbTwo, { opacity: glow }]} />
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#A78BFA" />} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>CAMPUS INTELLIGENCE</Text>
            <Text style={styles.title}>THE VAULT</Text>
            <Text style={styles.subtitle}>Unlock the intelligence of your campus.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/settings/ghost-mode" as any)} style={styles.ghostButton}>
            <Feather name="cloud-snow" size={18} color="#E0E7FF" />
            <Text style={styles.ghostButtonText}>{activeCount}</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Vault Reputation</Text>
              <Text style={styles.heroScore}>{summary?.score ?? 0}</Text>
            </View>
            <View style={styles.levelPill}><MaterialCommunityIcons name="hexagon-multiple" size={15} color="#050712" /><Text style={styles.levelText}>{summary?.level ?? "Explorer"}</Text></View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${summary?.progress ?? 0}%` }]} /></View>
          <Text style={styles.heroMeta}>Rank {summary?.rank ? `#${summary.rank}` : "—"} · Skill Strength {summary?.skillStrength ?? 0}%</Text>
        </GlassCard>

        <View style={styles.metricsGrid}>
          <Metric icon="award" label="Vault Rank" value={summary?.rank ? `#${summary.rank}` : "—"} />
          <Metric icon="zap" label="Skill Strength" value={`${summary?.skillStrength ?? 0}%`} />
          <Metric icon="message-square" label="Active Debates" value={summary?.debates.length ?? 0} />
          <Metric icon="alert-triangle" label="Active Alerts" value={summary?.alerts.length ?? 0} />
        </View>

        <VaultRadarCard skills={summary?.skills ?? []} colors={vaultColors} />

        <Section title="Current Campus Legends" icon="star" items={(summary?.legends ?? []).map((l) => ({ key: l.id, title: l.nominee_username, meta: `${l.category} · ${l.votes_count} votes` }))} />
        <Section title="Active Debates" icon="activity" items={(summary?.debates ?? []).map((d) => ({ key: d.id, title: d.title, meta: `FOR ${d.for_count} · AGAINST ${d.against_count}` }))} />
        <Section title="Active Alerts" icon="radio" items={(summary?.alerts ?? []).map((a) => ({ key: a.id, title: a.title, meta: `${a.category} · ${a.priority.toUpperCase()}` }))} />
        <Section title="Trending Wiki Articles" icon="book-open" items={(summary?.wiki ?? []).map((w) => ({ key: w.id, title: w.title, meta: `${w.category} · ${w.upvotes} upvotes` }))} />
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, items }: { title: string; icon: any; items: Array<{ key: string; title: string; meta: string }> }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><Feather name={icon} size={16} color="#C4B5FD" /><Text style={styles.sectionTitle}>{title}</Text></View><GlassCard>{items.length ? items.map((item) => <View key={item.key} style={styles.listRow}><View style={styles.listDot} /><View style={{ flex: 1 }}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.listMeta}>{item.meta}</Text></View></View>) : <Text style={styles.emptyText}>No active entries yet. Be the first to shape the Vault.</Text>}</GlassCard></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050712" },
  orbOne: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#7C3AED55", right: -80, top: 90 },
  orbTwo: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#0EA5E955", left: -90, top: 300 },
  header: { paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  kicker: { color: "#93C5FD", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },
  title: { color: "#FFF", fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  subtitle: { color: "#C4B5FD", fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4 },
  ghostButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  ghostButtonText: { color: "#E0E7FF", fontFamily: "Inter_700Bold" },
  glassCard: { marginHorizontal: 16, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(167,139,250,0.24)", backgroundColor: "rgba(15,23,42,0.70)", marginBottom: 14 },
  cardInner: { padding: 16 },
  heroCard: { marginBottom: 16 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: { color: "#C4B5FD", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  heroScore: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 44, marginTop: 2 },
  levelPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#C4B5FD", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  levelText: { color: "#050712", fontFamily: "Inter_700Bold", fontSize: 12 },
  progressTrack: { height: 10, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 99, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", backgroundColor: "#A78BFA", borderRadius: 99 },
  heroMeta: { color: "#A5B4FC", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, marginBottom: 2 },
  metricCard: { width: "50%", marginHorizontal: 0, transform: [{ scale: 0.96 }] },
  metricValue: { color: "#FFF", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 8 },
  metricLabel: { color: "#A5B4FC", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  section: { marginTop: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 18, marginBottom: 8 },
  sectionTitle: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  listDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#A78BFA" },
  listTitle: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 14 },
  listMeta: { color: "#A5B4FC", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  emptyText: { color: "#A5B4FC", fontFamily: "Inter_500Medium", lineHeight: 19 },
});
