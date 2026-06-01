import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { auraColorWithAlpha, getAuraRingPrimaryColor, parseAuraRingColors } from "@/utils/auraRing";

type AuraRingAvatarProps = {
  avatarUri?: string | null;
  initials: string;
  ringValue?: string | null;
  size: number;
  ringWidth?: number;
  textColor?: string;
  textSize?: number;
};

export function AuraRingAvatar({
  avatarUri,
  initials,
  ringValue,
  size,
  ringWidth = 3,
  textColor,
  textSize,
}: AuraRingAvatarProps) {
  const ringColors = parseAuraRingColors(ringValue);
  const innerSize = size - ringWidth * 2;
  const primaryColor = getAuraRingPrimaryColor(ringValue);

  return (
    <LinearGradient
      colors={ringColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: ringWidth }]}
    >
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: auraColorWithAlpha(ringValue ?? undefined, "24"),
            },
          ]}
        >
          <Text style={[styles.initials, { color: textColor ?? primaryColor, fontSize: textSize ?? Math.round(size * 0.42) }]}>
            {initials}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: "center", justifyContent: "center" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "Inter_700Bold" },
});
