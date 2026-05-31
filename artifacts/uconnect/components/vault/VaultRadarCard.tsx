import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, Polygon, RadialGradient, Stop, Text as SvgText } from "react-native-svg";

type RadarSkill = { skill_name?: string | null; strength?: number | null; trend?: number | null };

function clampStrength(value: unknown) {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return 0;
  return Math.min(100, Math.max(0, next));
}

function skillLabel(value: unknown, index: number) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : `Skill ${index + 1}`;
}

export function VaultRadarCard({ skills, colors, compact = false }: { skills?: RadarSkill[] | null; colors: any; compact?: boolean }) {
  const size = compact ? 156 : 268;
  const center = size / 2;
  const radius = compact ? 50 : 88;
  const fallbackSkills = ["Code", "Design", "Leadership", "Content", "Data", "Speaking"].map((skill_name) => ({ skill_name, strength: 0, trend: 0 }));
  const padSkills = ["Learning", "Teamwork", "Campus"];
  const normalizedSkills = Array.isArray(skills) ? skills : [];
  const radarSkills = (normalizedSkills.length ? [...normalizedSkills] : fallbackSkills).slice(0, 7);
  while (radarSkills.length > 0 && radarSkills.length < 3) {
    radarSkills.push({ skill_name: padSkills[radarSkills.length - 1] ?? `Skill ${radarSkills.length + 1}`, strength: 35, trend: 0 });
  }

  const data = radarSkills.map((skill, index) => ({
    skill_name: skillLabel(skill?.skill_name, index),
    strength: clampStrength(skill?.strength),
    trend: Number(skill?.trend ?? 0),
  }));

  const { points, glowPoints } = useMemo(() => {
    const pointFor = (strengthScale: number) => data.map((s, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.length;
      const r = radius * Math.min(100, s.strength * strengthScale) / 100;
      return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
    }).join(" ");
    return { points: pointFor(1), glowPoints: pointFor(1.08) };
  }, [center, data, radius]);

  const radarFill = `${colors.primary ?? "#7C3AED"}66`;
  const radarGlow = `${colors.primary ?? "#7C3AED"}24`;
  const radarStroke = colors.primary ?? "#A78BFA";
  const average = data.length ? Math.round(data.reduce((sum, skill) => sum + skill.strength, 0) / data.length) : 0;
  const strongest = data.reduce((best, skill) => skill.strength > best.strength ? skill : best, data[0] ?? { skill_name: "—", strength: 0, trend: 0 });

  return (
    <LinearGradient colors={[`${radarStroke}22`, colors.card ?? "#111827", `${radarStroke}11`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: `${radarStroke}33` }]}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.eyebrow, { color: radarStroke }]}>LIVE SKILL MAP</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Vault Radar</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: colors.card, borderColor: `${radarStroke}30` }]}>
          <Text style={[styles.scoreValue, { color: radarStroke }]}>{average}%</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>sync</Text>
        </View>
      </View>

      <View style={styles.radarStage}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="vaultRadarCore" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={radarStroke} stopOpacity="0.34" />
              <Stop offset="58%" stopColor={radarStroke} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={radarStroke} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={center} cy={center} r={radius + 30} fill="url(#vaultRadarCore)" />
          {[0.25, 0.5, 0.75, 1].map((m) => <Circle key={m} cx={center} cy={center} r={radius * m} stroke={m === 1 ? `${radarStroke}55` : colors.border} strokeWidth={m === 1 ? "1.5" : "1"} strokeDasharray={m === 1 ? undefined : "4 6"} fill="none" />)}
          {data.map((s, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.length;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            const lx = center + Math.cos(angle) * (radius + (compact ? 18 : 27));
            const ly = center + Math.sin(angle) * (radius + (compact ? 18 : 27));
            const nodeX = center + Math.cos(angle) * radius * s.strength / 100;
            const nodeY = center + Math.sin(angle) * radius * s.strength / 100;
            return (
              <React.Fragment key={`${s.skill_name}-${i}`}>
                <Line x1={center} y1={center} x2={x} y2={y} stroke={`${radarStroke}30`} strokeWidth="1" />
                <Circle cx={nodeX} cy={nodeY} r={compact ? 2.5 : 4} fill={radarStroke} />
                <SvgText x={lx} y={ly} fontSize={compact ? "7" : "10"} fontWeight="700" fill={colors.mutedForeground} textAnchor="middle">{s.skill_name.slice(0, compact ? 7 : 11)}</SvgText>
              </React.Fragment>
            );
          })}
          <Polygon points={glowPoints} fill={radarGlow} stroke="none" />
          <Polygon points={points} fill={radarFill} stroke={radarStroke} strokeWidth="2.5" />
          <Circle cx={center} cy={center} r={compact ? 4 : 6} fill={colors.card} stroke={radarStroke} strokeWidth="2" />
        </Svg>
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: `${radarStroke}22` }]}>
          <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Strongest signal</Text>
          <Text numberOfLines={1} style={[styles.insightValue, { color: colors.foreground }]}>{strongest?.skill_name ?? "—"}</Text>
        </View>
        <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: `${radarStroke}22` }]}>
          <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Trend pulse</Text>
          <Text style={[styles.insightValue, { color: radarStroke }]}>{data.filter((skill) => skill.trend > 0).length} rising</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 28, padding: 16, alignItems: "center", overflow: "hidden", shadowOpacity: 0.16, shadowRadius: 22, elevation: 4 },
  orbOne: { position: "absolute", top: -36, right: -28, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },
  orbTwo: { position: "absolute", bottom: -46, left: -34, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.05)" },
  titleRow: { width: "100%", marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  scorePill: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  scoreValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  radarStage: { alignItems: "center", justifyContent: "center", marginVertical: 2 },
  insightRow: { flexDirection: "row", gap: 10, width: "100%" },
  insightCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 12 },
  insightLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  insightValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
});
