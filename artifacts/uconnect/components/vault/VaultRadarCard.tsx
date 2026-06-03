import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Polygon,
  Stop,
  Text as SvgText,
} from "react-native-svg";

type RadarSkill = {
  skill_name?: string | null;
  strength?: number | null;
  trend?: number | null;
};

function clampStrength(value: unknown) {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return 0;
  return Math.min(100, Math.max(0, Math.round(next)));
}

function skillLabel(value: unknown, index: number) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : `Skill ${index + 1}`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length))
    return `rgba(124, 58, 237, ${alpha})`;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) return `rgba(124, 58, 237, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function VaultRadarCard({
  skills,
  colors,
  compact = false,
  mode,
}: {
  skills?: RadarSkill[] | null;
  colors: Record<string, string>;
  compact?: boolean;
  mode?: "mini" | "compact" | "full";
}) {
  const isCompact = compact || mode === "compact" || mode === "mini";
  const normalizedSkills = Array.isArray(skills) ? skills : [];
  const fallbackSkills = [
    "Code",
    "Design",
    "Leadership",
    "Content",
    "Community",
  ].map((skill_name) => ({ skill_name, strength: 0, trend: 0 }));
  const data = (normalizedSkills.length ? normalizedSkills : fallbackSkills)
    .slice(0, isCompact ? 4 : 5)
    .map((skill, index) => ({
      skill_name: skillLabel(skill?.skill_name, index),
      strength: clampStrength(skill?.strength),
      trend: Number(skill?.trend ?? 0),
    }));

  const primary = colors.primary ?? "#7C3AED";
  const average = data.length
    ? Math.round(
        data.reduce((sum, skill) => sum + skill.strength, 0) / data.length,
      )
    : 0;
  const strongest = data.reduce(
    (best, skill) => (skill.strength > best.strength ? skill : best),
    data[0] ?? { skill_name: "—", strength: 0, trend: 0 },
  );
  const risingCount = data.filter((skill) => skill.trend > 0).length;
  const hasSignal = data.some((skill) => skill.strength > 0);
  const radarSize = isCompact ? 132 : 184;
  const center = radarSize / 2;
  const radius = radarSize * 0.31;
  const labelRadius = radarSize * 0.43;
  const rings = [0.33, 0.66, 1];
  const points = useMemo(() => {
    const count = Math.max(data.length, 3);
    return data.map((skill, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      const strengthRadius = radius * (skill.strength / 100);
      return {
        ...skill,
        x: center + Math.cos(angle) * strengthRadius,
        y: center + Math.sin(angle) * strengthRadius,
        axisX: center + Math.cos(angle) * radius,
        axisY: center + Math.sin(angle) * radius,
        labelX: center + Math.cos(angle) * labelRadius,
        labelY: center + Math.sin(angle) * labelRadius,
      };
    });
  }, [center, data, labelRadius, radius]);
  const polygonPoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <LinearGradient
      colors={[
        hexToRgba(primary, 0.18),
        colors.card ?? "#111827",
        hexToRgba(primary, 0.08),
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        isCompact && styles.compactCard,
        {
          borderColor: hexToRgba(primary, 0.24),
          shadowColor: colors.shadow ?? primary,
        },
      ]}
    >
      <View style={styles.glowOrb} />
      <View style={[styles.headerRow, isCompact && styles.compactHeaderRow]}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: hexToRgba(primary, 0.16),
              borderColor: hexToRgba(primary, 0.24),
            },
          ]}
        >
          <Feather name="radio" size={20} color={primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: primary }]}>VAULT INTEL</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Skill Radar
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your campus signal, mapped from Vault activity.
          </Text>
        </View>
        <View
          style={[
            styles.scorePill,
            {
              backgroundColor: colors.background ?? colors.card,
              borderColor: hexToRgba(primary, 0.24),
            },
          ]}
        >
          <Text style={[styles.scoreValue, { color: primary }]}>
            {average}%
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            signal
          </Text>
        </View>
      </View>

      <View style={[styles.radarRow, isCompact && styles.compactRadarRow]}>
        <View
          style={[
            styles.radarShell,
            {
              backgroundColor: hexToRgba(primary, 0.08),
              borderColor: hexToRgba(primary, 0.18),
            },
          ]}
        >
          <Svg width={radarSize} height={radarSize}>
            <Defs>
              <SvgLinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={primary} stopOpacity="0.55" />
                <Stop offset="1" stopColor={primary} stopOpacity="0.16" />
              </SvgLinearGradient>
            </Defs>
            {rings.map((ring) => (
              <Circle
                key={ring}
                cx={center}
                cy={center}
                r={radius * ring}
                fill="none"
                stroke={hexToRgba(primary, 0.16)}
                strokeWidth="1"
              />
            ))}
            {points.map((point) => (
              <Line
                key={`${point.skill_name}-axis`}
                x1={center}
                y1={center}
                x2={point.axisX}
                y2={point.axisY}
                stroke={hexToRgba(primary, 0.14)}
                strokeWidth="1"
              />
            ))}
            {hasSignal ? (
              <Polygon
                points={polygonPoints}
                fill="url(#radarFill)"
                stroke={primary}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            ) : null}
            {points.map((point) => (
              <React.Fragment key={point.skill_name}>
                <Circle
                  cx={hasSignal ? point.x : point.axisX}
                  cy={hasSignal ? point.y : point.axisY}
                  r="3.5"
                  fill={hasSignal ? primary : colors.mutedForeground}
                />
                <SvgText
                  x={point.labelX}
                  y={point.labelY}
                  fill={colors.mutedForeground}
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {point.skill_name.slice(0, 10)}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </View>

        <View style={styles.skillList}>
          {data.map((skill) => (
            <View key={skill.skill_name} style={styles.skillRow}>
              <View style={styles.skillTopLine}>
                <Text
                  numberOfLines={1}
                  style={[styles.skillName, { color: colors.foreground }]}
                >
                  {skill.skill_name}
                </Text>
                <View
                  style={[
                    styles.skillMeta,
                    {
                      backgroundColor:
                        skill.trend > 0
                          ? hexToRgba(primary, 0.12)
                          : (colors.secondary ?? hexToRgba(primary, 0.08)),
                    },
                  ]}
                >
                  {skill.trend > 0 ? (
                    <Feather name="trending-up" size={11} color={primary} />
                  ) : null}
                  <Text
                    style={[
                      styles.skillPercent,
                      {
                        color:
                          skill.trend > 0 ? primary : colors.mutedForeground,
                      },
                    ]}
                  >
                    {skill.strength}%
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.track,
                  {
                    backgroundColor:
                      colors.secondary ?? hexToRgba(primary, 0.12),
                  },
                ]}
              >
                <LinearGradient
                  colors={[primary, hexToRgba(primary, 0.55)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.fill, { width: `${skill.strength}%` }]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {mode === "full" ? <View style={styles.insightRow}>
        <View
          style={[
            styles.insightCard,
            {
              backgroundColor: colors.background ?? colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="zap" size={14} color={primary} />
          <View style={styles.insightCopy}>
            <Text
              style={[styles.insightLabel, { color: colors.mutedForeground }]}
            >
              Strongest
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.insightValue, { color: colors.foreground }]}
            >
              {strongest?.skill_name ?? "—"}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.insightCard,
            {
              backgroundColor: colors.background ?? colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather
            name="trending-up"
            size={14}
            color={risingCount ? primary : colors.mutedForeground}
          />
          <View style={styles.insightCopy}>
            <Text
              style={[styles.insightLabel, { color: colors.mutedForeground }]}
            >
              Rising
            </Text>
            <Text
              style={[
                styles.insightValue,
                { color: risingCount ? primary : colors.foreground },
              ]}
            >
              {risingCount} skills
            </Text>
          </View>
        </View>
      </View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
    overflow: "hidden",
  },
  compactCard: { borderRadius: 22, padding: 12 },
  glowOrb: {
    position: "absolute",
    right: -36,
    top: -42,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compactHeaderRow: { marginBottom: 10 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    lineHeight: 15,
  },
  scorePill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  scoreValue: { fontSize: 19, fontFamily: "Inter_700Bold" },
  scoreLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  radarRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  compactRadarRow: { gap: 10 },
  radarShell: {
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  skillList: { flex: 1, gap: 11 },
  skillRow: { gap: 7 },
  skillTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  skillName: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold" },
  skillMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillPercent: { fontSize: 11, fontFamily: "Inter_700Bold" },
  track: { height: 8, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  insightRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  insightCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  insightCopy: { flex: 1 },
  insightLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  insightValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
});
