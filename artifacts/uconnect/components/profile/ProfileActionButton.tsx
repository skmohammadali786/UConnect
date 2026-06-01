import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

type Variant = "primary" | "outline" | "soft" | "icon" | "more";

export function ProfileActionButton({
  label,
  icon,
  variant = "soft",
  colors,
  onPress,
  style,
  disabled = false,
}: {
  label?: string;
  icon: FeatherName;
  variant?: Variant;
  colors: any;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const isIconOnly = variant === "icon" || variant === "more" || !label;
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const foreground = isPrimary ? "#FFF" : isOutline ? colors.primary : colors.foreground;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        isIconOnly ? styles.iconOnly : styles.withLabel,
        {
          backgroundColor: isPrimary
            ? colors.primary
            : isOutline
              ? colors.profileCard ?? colors.card
              : colors.profileSoftGreen ?? colors.secondary,
          borderColor: isPrimary ? colors.primary : colors.primary + "35",
          opacity: disabled ? 0.55 : 1,
          shadowColor: isPrimary ? colors.primary : colors.profileShadow ?? colors.shadow,
        },
        style,
      ]}
    >
      <Feather name={variant === "more" ? "more-horizontal" : icon} size={isIconOnly ? 18 : 15} color={foreground} />
      {label ? <Text style={[styles.label, { color: foreground }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  withLabel: { gap: 7, paddingHorizontal: 15 },
  iconOnly: { width: 42, height: 42, borderRadius: 15 },
  label: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
