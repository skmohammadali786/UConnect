import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

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
  const size = compact ? 180 : 230;
  const center = size / 2;
  const radius = compact ? 58 : 76;
  const fallbackSkills = ["React", "Design", "Leadership", "Content", "Data", "Speaking"].map((skill_name) => ({ skill_name, strength: 0 }));
  const normalizedSkills = Array.isArray(skills) ? skills : [];
  const data = (normalizedSkills.length ? normalizedSkills : fallbackSkills)
    .slice(0, 7)
    .map((skill, index) => ({
      skill_name: skillLabel(skill?.skill_name, index),
      strength: clampStrength(skill?.strength),
    }));
  const points = data.map((s, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.length;
    const r = radius * s.strength / 100;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(" ");
  const radarFill = `${colors.primary ?? "#7C3AED"}55`;
  const radarStroke = colors.primary ?? "#A78BFA";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Vault Radar</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Skill intelligence</Text>
      </View>
      <Svg width={size} height={size}>
        {[0.33, 0.66, 1].map((m) => <Circle key={m} cx={center} cy={center} r={radius * m} stroke={colors.border} strokeWidth="1" fill="none" />)}
        {data.map((s, i) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.length;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          const lx = center + Math.cos(angle) * (radius + 20);
          const ly = center + Math.sin(angle) * (radius + 20);
          return <React.Fragment key={`${s.skill_name}-${i}`}><Line x1={center} y1={center} x2={x} y2={y} stroke={colors.border} strokeWidth="1" /><SvgText x={lx} y={ly} fontSize="9" fill={colors.mutedForeground} textAnchor="middle">{s.skill_name.slice(0, 9)}</SvgText></React.Fragment>;
        })}
        <Polygon points={points} fill={radarFill} stroke={radarStroke} strokeWidth="2" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 14, alignItems: "center" },
  titleRow: { width: "100%", marginBottom: 4 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
});
