import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
  fullWidth = false,
}: AppButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
      ? colors.secondary
      : variant === "destructive"
      ? colors.destructive
      : "transparent";

  const textColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "destructive"
      ? colors.destructiveForeground
      : variant === "outline"
      ? colors.primary
      : variant === "ghost"
      ? colors.foreground
      : colors.secondaryForeground;

  const borderColor = variant === "outline" ? colors.primary : "transparent";

  const height = size === "sm" ? 36 : size === "lg" ? 56 : 46;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 15;
  const px = size === "sm" ? 12 : size === "lg" ? 24 : 18;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "outline" ? 1.5 : 0,
          height,
          paddingHorizontal: px,
          opacity: pressed ? 0.75 : disabled ? 0.4 : 1,
          borderRadius: colors.radius,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        style,
      ]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
