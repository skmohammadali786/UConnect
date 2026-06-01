import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import type { DimensionValue } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { VaultRadarCard } from "@/components/vault/VaultRadarCard";

function percentWidth(value: unknown): DimensionValue {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return "0%";
  return `${Math.min(100, Math.max(0, next))}%`;
}

type VaultSummary = {
  level?: string | null;
  score?: number | null;
  progress?: number | null;
  skillStrength?: number | null;
  badges?: unknown[] | null;
  skills?: { skill_name?: string | null; strength?: number | null; trend?: number | null }[] | null;
};

export function ProfileVaultSummary({
  summary,
  colors,
  mode = "compact",
}: {
  summary?: VaultSummary | null;
  colors: any;
  mode?: "compact" | "full" | "mini";
}) {
  const score = summary?.score ?? 0;
  const skillStrength = summary?.skillStrength ?? 0;
  const badgeCount = summary?.badges?.length ?? 0;
  const level = summary?.level ?? "Explorer";
  const skills = summary?.skills ?? [];
  const strongest = skills.find((skill) => Number(skill.strength ?? 0) > 0) ?? skills[0];
  const rising = skills.filter((skill) => Number(skill.trend ?? 0) > 0).length;
  const shadowColor = colors.profileShadow ?? colors.shadow;

  if (mode === "mini") {
    return (
      <View style={[styles.miniCard, { backgroundColor: colors.profileCard ?? colors.card, borderColor: colors.profileCardBorder ?? colors.border, shadowColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>VAULT PROFILE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{level}</Text>
          </View>
          <View style={[styles.levelPill, { backgroundColor: colors.profileSoftGreen ?? colors.primary + "14", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.levelText, { color: colors.primary }]}>Top 15%</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <VaultStat value={score} label="Score" colors={colors} />
          <VaultStat value={`${skillStrength}%`} label="Radar" colors={colors} />
          <VaultStat value={badgeCount} label="Badges" colors={colors} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.profileCard ?? colors.card, borderColor: colors.profileCardBorder ?? colors.border, shadowColor }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>{mode === "full" ? "VAULT REPUTATION ENGINE" : "VAULT PROFILE"}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{mode === "full" ? "Reputation Engine" : level}</Text>
        </View>
        <View style={[styles.levelPill, { backgroundColor: colors.profileSoftGreen ?? colors.primary + "14", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.levelText, { color: colors.primary }]}>{mode === "full" ? "Explore Vault" : "Top 15%"}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <VaultStat value={score} label={mode === "full" ? "Vault Score" : "Level"} colors={colors} />
        <VaultStat value={`${skillStrength}%`} label="Skill Strength" colors={colors} />
        <VaultStat value={badgeCount} label="Badges" colors={colors} icon="award" />
      </View>
      <View style={[styles.progress, { backgroundColor: colors.secondary }]}>
        <LinearGradient colors={[colors.primary, colors.primary + "88"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: percentWidth(summary?.progress) }]} />
      </View>

      <VaultRadarCard skills={skills} colors={colors} mode={mode === "full" ? "full" : "compact"} />

      {mode === "full" ? (
        <View style={styles.insightRow}>
          <Insight icon="zap" label="Strongest Skill" value={strongest?.skill_name ?? "—"} colors={colors} />
          <Insight icon="trending-up" label="Rising" value={`${rising} skills`} colors={colors} />
          <Insight icon="award" label="Campus Rank" value="Top 15%" colors={colors} />
        </View>
      ) : null}
    </View>
  );
}

function VaultStat({ value, label, colors, icon }: { value: string | number; label: string; colors: any; icon?: React.ComponentProps<typeof Feather>["name"] }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
        {icon ? <Feather name={icon} size={14} color={colors.primary} /> : null}
      </View>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Insight({ icon, label, value, colors }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.insight, { backgroundColor: colors.profileSoftGreen ?? colors.secondary, borderColor: colors.profileCardBorder ?? colors.border }]}>
      <Feather name={icon} size={15} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.insightValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderRadius: 22, padding: 14, gap: 12, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 3 },
  miniCard: { marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderRadius: 20, padding: 14, gap: 12, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kicker: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  levelPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  stat: { flex: 1 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  progress: { height: 7, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  insightRow: { flexDirection: "row", gap: 8 },
  insight: { flex: 1, minHeight: 58, borderWidth: 1, borderRadius: 16, padding: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  insightLabel: { fontSize: 8.5, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  insightValue: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 2 },
});
