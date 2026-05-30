import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

export function VaultRadarCard({ skills, colors, compact = false }: { skills: Array<{ skill_name: string; strength: number; trend?: number }>; colors: any; compact?: boolean }) {
  const size = compact ? 180 : 230;
  const center = size / 2;
  const radius = compact ? 58 : 76;
  const data = (skills.length ? skills : ["React", "Design", "Leadership", "Content", "Data", "Speaking"].map((skill_name) => ({ skill_name, strength: 0 }))).slice(0, 7);
  const points = data.map((s, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.length;
    const r = radius * Math.min(100, Math.max(0, s.strength)) / 100;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(" ");
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
          return <React.Fragment key={s.skill_name}><Line x1={center} y1={center} x2={x} y2={y} stroke={colors.border} strokeWidth="1" /><SvgText x={lx} y={ly} fontSize="9" fill={colors.mutedForeground} textAnchor="middle">{s.skill_name.slice(0, 9)}</SvgText></React.Fragment>;
        })}
        <Polygon points={points} fill="#7C3AED55" stroke="#A78BFA" strokeWidth="2" />
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
