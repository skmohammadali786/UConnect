export const DEFAULT_AURA_RING = "gradient:#6366F1,#8B5CF6,#EC4899";
export const LEGACY_DEFAULT_AURA_RING = "#6366F1";

export type AuraRingPreset = {
  name: string;
  value: string;
  colors: readonly [string, string, ...string[]];
};

export const AURA_RING_PRESETS: readonly AuraRingPreset[] = [
  { name: "Cosmic", value: "gradient:#6366F1,#8B5CF6,#EC4899", colors: ["#6366F1", "#8B5CF6", "#EC4899"] },
  { name: "Sunset", value: "gradient:#F97316,#EF4444,#EC4899", colors: ["#F97316", "#EF4444", "#EC4899"] },
  { name: "Aurora", value: "gradient:#10B981,#06B6D4,#3B82F6", colors: ["#10B981", "#06B6D4", "#3B82F6"] },
  { name: "Royal", value: "gradient:#4F46E5,#7C3AED,#C026D3", colors: ["#4F46E5", "#7C3AED", "#C026D3"] },
  { name: "Flame", value: "gradient:#F59E0B,#F97316,#DC2626", colors: ["#F59E0B", "#F97316", "#DC2626"] },
  { name: "Ocean", value: "gradient:#0EA5E9,#2563EB,#14B8A6", colors: ["#0EA5E9", "#2563EB", "#14B8A6"] },
  { name: "Candy", value: "gradient:#EC4899,#F472B6,#A855F7", colors: ["#EC4899", "#F472B6", "#A855F7"] },
  { name: "Midnight", value: "gradient:#111827,#4338CA,#06B6D4", colors: ["#111827", "#4338CA", "#06B6D4"] },
];

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexAuraColor(value: string) {
  return HEX_COLOR_REGEX.test(value.trim());
}

export function parseAuraRingColors(value?: string | null): [string, string, ...string[]] {
  const trimmed = value?.trim();
  if (!trimmed) return [...AURA_RING_PRESETS[0].colors];

  if (trimmed.toLowerCase().startsWith("gradient:")) {
    const gradientColors = trimmed
      .slice("gradient:".length)
      .split(",")
      .map((color) => color.trim().toUpperCase())
      .filter(isHexAuraColor);

    if (gradientColors.length >= 2) {
      return gradientColors.slice(0, 4) as [string, string, ...string[]];
    }
  }

  if (isHexAuraColor(trimmed)) {
    const normalized = trimmed.toUpperCase();
    return [normalized, normalized];
  }

  return [...AURA_RING_PRESETS[0].colors];
}

export function normalizeAuraRingValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_AURA_RING;

  if (trimmed.toLowerCase().startsWith("gradient:")) {
    const gradientColors = parseAuraRingColors(trimmed);
    return `gradient:${gradientColors.join(",")}`;
  }

  if (isHexAuraColor(trimmed)) return trimmed.toUpperCase();

  return DEFAULT_AURA_RING;
}

export function auraColorWithAlpha(value?: string | null, alphaHex = "22") {
  const color = parseAuraRingColors(value)[0];
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${alphaHex}`;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = color[1] ?? "6";
    const g = color[2] ?? "3";
    const b = color[3] ?? "6";
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  return `#6366F1${alphaHex}`;
}

export function getAuraRingPrimaryColor(value?: string | null) {
  return parseAuraRingColors(value)[0];
}
