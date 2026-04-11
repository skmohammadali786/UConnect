import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.shimmer, opacity },
        style,
      ]}
    />
  );
}

export function PostCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Skeleton width={34} height={34} borderRadius={17} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="40%" height={13} />
          <Skeleton width="25%" height={11} />
        </View>
        <Skeleton width={60} height={22} borderRadius={6} />
      </View>
      <View style={{ gap: 6, marginTop: 12 }}>
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="70%" height={14} />
      </View>
      <View style={[styles.row, { marginTop: 14, gap: 16 }]}>
        <Skeleton width={60} height={28} borderRadius={6} />
        <Skeleton width={50} height={28} borderRadius={6} />
        <Skeleton width={40} height={28} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
