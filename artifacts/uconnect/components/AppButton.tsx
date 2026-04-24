import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: false, tension: 280, friction: 8 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 200, friction: 8 }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const textColor =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "destructive"
      ? colors.destructiveForeground
      : variant === "outline"
      ? colors.primary
      : variant === "ghost"
      ? colors.foreground
      : colors.secondaryForeground;

  const height = size === "sm" ? 40 : size === "lg" ? 56 : 48;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  const px = size === "sm" ? 14 : size === "lg" ? 24 : 18;

  const gradient = useMemo(() => {
    if (variant === "primary") return [colors.primary, "#18BB7E"] as const;
    if (variant === "destructive") return ["#EF4444", "#DC2626"] as const;
    return null;
  }, [variant, colors.primary]);

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
            backgroundColor: gradient ? "transparent" : variant === "secondary" ? colors.secondary : "transparent",
            borderColor: variant === "outline" ? colors.primary : "transparent",
            borderWidth: variant === "outline" ? 1.5 : 0,
            height,
            paddingHorizontal: px,
            opacity: disabled ? 0.45 : 1,
            borderRadius: colors.radius + 2,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: variant === "primary" || variant === "destructive" ? 0.2 : 0,
            shadowRadius: 22,
            elevation: variant === "primary" || variant === "destructive" ? 6 : 0,
          },
          style,
        ]}
      >
        {gradient ? <LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, { borderRadius: colors.radius + 2 }]} /> : null}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <>
              {icon && <Feather name={icon} size={size === "sm" ? 14 : 16} color={textColor} style={{ marginRight: 6 }} />}
              <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
