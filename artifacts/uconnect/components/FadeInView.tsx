import React, { useEffect, useRef } from "react";
import { Animated, Platform, ViewProps } from "react-native";

const ND = Platform.OS !== "web";

interface FadeInViewProps extends ViewProps {
  delay?: number;
  duration?: number;
  from?: "bottom" | "top" | "none";
  distance?: number;
}

export function FadeInView({ children, delay = 0, duration = 320, from = "bottom", distance = 18, style, ...rest }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from === "bottom" ? distance : from === "top" ? -distance : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: ND }),
      Animated.spring(translateY, { toValue: 0, tension: 90, friction: 11, delay, useNativeDriver: ND }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

export function ScaleOnPress({ children, style, ...rest }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: ND, tension: 250, friction: 10 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: ND, tension: 250, friction: 10 }).start();

  return (
    <Animated.View
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      style={[{ transform: [{ scale }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
