import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type RadarSkill = { skill_name?: string | null; strength?: number | null; trend?: number | null };

function clampStrength(value: unknown) {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return 0;
  return Math.min(100, Math.max(0, Math.round(next)));
}

function skillLabel(value: unknown, index: number) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : `Skill ${index + 1}`;
}

export function VaultRadarCard({ skills, colors, compact = false }: { skills?: RadarSkill[] | null; colors: any; compact?: boolean }) {
  const normalizedSkills = Array.isArray(skills) ? skills : [];
  const fallbackSkills = ["Code", "Design", "Leadership", "Content"].map((skill_name) => ({ skill_name, strength: 0, trend: 0 }));
  const data = (normalizedSkills.length ? normalizedSkills : fallbackSkills)
    .slice(0, compact ? 4 : 5)
    .map((skill, index) => ({
      skill_name: skillLabel(skill?.skill_name, index),
      strength: clampStrength(skill?.strength),
      trend: Number(skill?.trend ?? 0),
    }));

  const primary = colors.primary ?? "#7C3AED";
  const average = data.length ? Math.round(data.reduce((sum, skill) => sum + skill.strength, 0) / data.length) : 0;
  const strongest = data.reduce((best, skill) => skill.strength > best.strength ? skill : best, data[0] ?? { skill_name: "—", strength: 0, trend: 0 });
  const risingCount = data.filter((skill) => skill.trend > 0).length;

  return (
    <LinearGradient colors={[`${primary}18`, colors.card ?? "#111827", `${primary}0D`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: `${primary}24`, shadowColor: colors.shadow }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${primary}18` }]}>
          <Feather name="activity" size={20} color={primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: primary }]}>SKILL SNAPSHOT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Vault Radar</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: colors.card, borderColor: `${primary}24` }]}>
          <Text style={[styles.scoreValue, { color: primary }]}>{average}%</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>overall</Text>
        </View>
      </View>

      <View style={styles.skillList}>
        {data.map((skill) => (
          <View key={skill.skill_name} style={styles.skillRow}>
            <View style={styles.skillTopLine}>
              <Text numberOfLines={1} style={[styles.skillName, { color: colors.foreground }]}>{skill.skill_name}</Text>
              <View style={styles.skillMeta}>
                {skill.trend > 0 ? <Feather name="trending-up" size={12} color={primary} /> : null}
                <Text style={[styles.skillPercent, { color: colors.mutedForeground }]}>{skill.strength}%</Text>
              </View>
            </View>
            <View style={[styles.track, { backgroundColor: colors.secondary ?? `${primary}14` }]}>
              <View style={[styles.fill, { width: `${skill.strength}%`, backgroundColor: primary }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Strongest</Text>
          <Text numberOfLines={1} style={[styles.insightValue, { color: colors.foreground }]}>{strongest?.skill_name ?? "—"}</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Rising</Text>
          <Text style={[styles.insightValue, { color: primary }]}>{risingCount} skills</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 16, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.7 },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", marginTop: 2 },
  scorePill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  scoreValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  skillList: { gap: 12 },
  skillRow: { gap: 7 },
  skillTopLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  skillName: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold" },
  skillMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  skillPercent: { fontSize: 12, fontFamily: "Inter_700Bold" },
  track: { height: 9, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  insightRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  insightCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 11 },
  insightLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.7 },
  insightValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 3 },
});
