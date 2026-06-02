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
  skills?:
    | {
        skill_name?: string | null;
        strength?: number | null;
        trend?: number | null;
      }[]
    | null;
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
  const strongest = skills.reduce(
    (best, skill) =>
      Number(skill.strength ?? 0) > Number(best?.strength ?? -1) ? skill : best,
    skills[0],
  );
  const rising = skills.filter((skill) => Number(skill.trend ?? 0) > 0).length;
  const shadowColor = colors.profileShadow ?? colors.shadow;

  if (mode === "mini") {
    return (
      <View
        style={[
          styles.miniCard,
          {
            backgroundColor: colors.profileCard ?? colors.card,
            borderColor: colors.profileCardBorder ?? colors.border,
            shadowColor,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              VAULT PROFILE
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {level}
            </Text>
          </View>
          <View
            style={[
              styles.levelPill,
              {
                backgroundColor:
                  colors.profileSoftGreen ?? colors.primary + "14",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Text style={[styles.levelText, { color: colors.primary }]}>
              Top 15%
            </Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <VaultStat value={score} label="Score" colors={colors} />
          <VaultStat
            value={`${skillStrength}%`}
            label="Radar"
            colors={colors}
          />
          <VaultStat value={badgeCount} label="Badges" colors={colors} />
        </View>
      </View>
    );
  }

  if (mode === "compact") {
    const topSkills = skills.slice(0, 2);
    return (
      <View style={styles.compactGrid}>
        <View
          style={[
            styles.compactCard,
            {
              backgroundColor: colors.profileCard ?? colors.card,
              borderColor: colors.profileCardBorder ?? colors.border,
              shadowColor,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.kicker, { color: colors.primary }]}>
                VAULT PROFILE
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {level}
              </Text>
            </View>
            <View
              style={[
                styles.levelPill,
                {
                  backgroundColor:
                    colors.profileSoftGreen ?? colors.primary + "14",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Text style={[styles.levelText, { color: colors.primary }]}>
                Top 15%
              </Text>
            </View>
          </View>
          <View style={styles.compactBody}>
            <View style={styles.compactLevelCol}>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Level
              </Text>
              <Text style={[styles.compactLevel, { color: colors.primary }]}>
                {score}
              </Text>
              <View
                style={[styles.progress, { backgroundColor: colors.secondary }]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary + "88"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: percentWidth(summary?.progress) },
                  ]}
                />
              </View>
              <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
                {summary?.progress ?? 0}% XP
              </Text>
            </View>
            <View style={styles.compactRadarCol}>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Radar
              </Text>
              <Text style={[styles.compactLevel, { color: colors.primary }]}>
                {skillStrength}%
              </Text>
              <View
                style={[
                  styles.radarRings,
                  { borderColor: colors.primary + "22" },
                ]}
              >
                <View
                  style={[
                    styles.radarRingMid,
                    { borderColor: colors.primary + "35" },
                  ]}
                >
                  <View
                    style={[
                      styles.radarRingDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.compactCard,
            {
              backgroundColor: colors.profileCard ?? colors.card,
              borderColor: colors.profileCardBorder ?? colors.border,
              shadowColor,
            },
          ]}
        >
          <Text
            style={[styles.compactSectionTitle, { color: colors.foreground }]}
          >
            Top Skills
          </Text>
          <View style={styles.skillList}>
            {(topSkills.length
              ? topSkills
              : [
                  { skill_name: "Product Management", strength: 72 },
                  { skill_name: "Electrical", strength: 68 },
                ]
            ).map((skill) => (
              <View key={skill.skill_name ?? "skill"} style={styles.skillRow}>
                <View style={styles.skillHeader}>
                  <Text
                    style={[styles.skillName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {skill.skill_name ?? "Skill"}
                  </Text>
                  <Text style={[styles.skillPct, { color: colors.primary }]}>
                    {skill.strength ?? 0}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.skillTrack,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primary + "88"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.skillFill,
                      { width: percentWidth(skill.strength) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={styles.compactChipRow}>
            <View
              style={[
                styles.compactChip,
                {
                  backgroundColor:
                    colors.profileSoftGreen ?? colors.primary + "14",
                },
              ]}
            >
              <Text style={[styles.compactChipText, { color: colors.primary }]}>
                Tech
              </Text>
            </View>
            <View
              style={[
                styles.compactChip,
                {
                  backgroundColor:
                    colors.profileSoftGreen ?? colors.primary + "14",
                },
              ]}
            >
              <Text style={[styles.compactChipText, { color: colors.primary }]}>
                Startups
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.profileCard ?? colors.card,
          borderColor: colors.profileCardBorder ?? colors.border,
          shadowColor,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            VAULT REPUTATION ENGINE
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Reputation Engine
          </Text>
        </View>
        <View
          style={[
            styles.levelPill,
            {
              backgroundColor: colors.profileSoftGreen ?? colors.primary + "14",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <Text style={[styles.levelText, { color: colors.primary }]}>
            Explore Vault
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <VaultStat value={score} label="Vault Score" colors={colors} />
        <VaultStat
          value={`${skillStrength}%`}
          label="Skill Strength"
          colors={colors}
        />
        <VaultStat
          value={badgeCount}
          label="Badges"
          colors={colors}
          icon="award"
        />
      </View>
      <View style={[styles.progress, { backgroundColor: colors.secondary }]}>
        <LinearGradient
          colors={[colors.primary, colors.primary + "88"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressFill,
            { width: percentWidth(summary?.progress) },
          ]}
        />
      </View>

      <VaultRadarCard skills={skills} colors={colors} mode="full" />

      <View style={styles.insightRow}>
        <Insight
          icon="zap"
          label="Strongest Skill"
          value={strongest?.skill_name ?? "—"}
          colors={colors}
        />
        <Insight
          icon="trending-up"
          label="Rising"
          value={`${rising} skills`}
          colors={colors}
        />
        <Insight
          icon="award"
          label="Campus Rank"
          value="Top 15%"
          colors={colors}
        />
      </View>
    </View>
  );
}

function VaultStat({
  value,
  label,
  colors,
  icon,
}: {
  value: string | number;
  label: string;
  colors: any;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {value}
        </Text>
        {icon ? <Feather name={icon} size={14} color={colors.primary} /> : null}
      </View>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function Insight({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.insight,
        {
          backgroundColor: colors.profileSoftGreen ?? colors.secondary,
          borderColor: colors.profileCardBorder ?? colors.border,
        },
      ]}
    >
      <Feather name={icon} size={15} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text
          style={[styles.insightValue, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
  compactGrid: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  compactCard: {
    flex: 1,
    minHeight: 156,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  compactBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    flex: 1,
  },
  compactLevelCol: { flex: 1.05, gap: 4 },
  compactRadarCol: { flex: 1, alignItems: "center", gap: 3 },
  compactStatLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  compactLevel: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  xpText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  radarRings: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRingMid: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRingDot: { width: 10, height: 10, borderRadius: 5 },
  compactSectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  skillList: { gap: 10, flex: 1, justifyContent: "center" },
  skillRow: { gap: 5 },
  skillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  skillName: { flex: 1, fontSize: 11.5, fontFamily: "Inter_700Bold" },
  skillPct: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  skillTrack: { height: 7, borderRadius: 999, overflow: "hidden" },
  skillFill: { height: "100%", borderRadius: 999 },
  compactChipRow: { flexDirection: "row", gap: 6 },
  compactChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  compactChipText: { fontSize: 10.5, fontFamily: "Inter_700Bold" },
  miniCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kicker: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  levelPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stat: { flex: 1 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  progress: { height: 7, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  insightRow: { flexDirection: "row", gap: 8 },
  insight: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 16,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightLabel: {
    fontSize: 8.5,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  insightValue: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 2 },
});
