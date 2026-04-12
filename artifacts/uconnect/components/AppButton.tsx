import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  icon?: keyof typeof Feather.glyphMap;
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
  icon,
}: AppButtonProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const ND = Platform.OS !== "web";

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: false, tension: 280, friction: 8 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 180, friction: 8 }).start();
  };

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
      ? "#FFFFFF"
      : variant === "destructive"
      ? "#FFFFFF"
      : variant === "outline"
      ? colors.primary
      : variant === "ghost"
      ? colors.foreground
      : colors.foreground;

  const borderColor = variant === "outline" ? colors.primary : "transparent";
  const height = size === "sm" ? 36 : size === "lg" ? 52 : 46;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  const px = size === "sm" ? 12 : size === "lg" ? 24 : 18;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { width: "100%" }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled || loading}
        style={[
          styles.base,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: variant === "outline" ? 1.5 : 0,
            height,
            paddingHorizontal: px,
            opacity: disabled ? 0.4 : 1,
            borderRadius: colors.radius,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {icon && <Feather name={icon} size={size === "sm" ? 14 : 16} color={textColor} style={{ marginRight: 6 }} />}
            <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
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
