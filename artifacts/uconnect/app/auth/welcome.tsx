import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated, Dimensions, Easing, Image, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");
const LOGO_SECTION_H = Math.max(H * 0.30, 180);

const FEATURES = [
  { icon: "shield", text: "Post anonymously, no judgment" },
  { icon: "lock", text: "Verified college students only" },
  { icon: "briefcase", text: "Internships & opportunities" },
  { icon: "users", text: "Find your hackathon team" },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Logo
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.7)).current;

  // Blob background
  const blobOpacity = useRef(new Animated.Value(0)).current;

  // Text content
  const brandFade = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(18)).current;
  const headFade = useRef(new Animated.Value(0)).current;
  const headY = useRef(new Animated.Value(24)).current;
  const subFade = useRef(new Animated.Value(0)).current;

  // Feature rows
  const featAnims = FEATURES.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    x: useRef(new Animated.Value(50)).current,
  }));

  // Buttons
  const btnFade = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    // Background blob
    Animated.timing(blobOpacity, { toValue: 0.09, duration: 900, easing: ease, useNativeDriver: false }).start();

    // Phase 1: Logo (t=150ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, easing: ease, useNativeDriver: false }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: false }),
      ]).start(() => {
        // Glow ring radiates
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 0.65, duration: 500, easing: ease, useNativeDriver: false }),
          Animated.spring(glowScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: false }),
        ]).start(() => {
          // Continuous breath
          Animated.loop(
            Animated.sequence([
              Animated.timing(logoPulse, { toValue: 1.055, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
              Animated.timing(logoPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ])
          ).start();
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowOpacity, { toValue: 0.25, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
              Animated.timing(glowOpacity, { toValue: 0.65, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ])
          ).start();
        });
      });
    }, 150);

    // Phase 2: Text (t=700ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(brandFade, { toValue: 1, duration: 380, easing: ease, useNativeDriver: false }),
        Animated.spring(brandY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: false }),
      ]).start();
    }, 700);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headFade, { toValue: 1, duration: 440, easing: ease, useNativeDriver: false }),
        Animated.spring(headY, { toValue: 0, friction: 7, tension: 100, useNativeDriver: false }),
      ]).start();
    }, 900);
    setTimeout(() => {
      Animated.timing(subFade, { toValue: 1, duration: 380, easing: ease, useNativeDriver: false }).start();
    }, 1080);

    // Phase 3: Features (t=1200ms staggered)
    FEATURES.forEach((_, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(featAnims[i].opacity, { toValue: 1, duration: 360, easing: ease, useNativeDriver: false }),
          Animated.spring(featAnims[i].x, { toValue: 0, friction: 7, tension: 90, useNativeDriver: false }),
        ]).start();
      }, 1200 + i * 110);
    });

    // Phase 4: Buttons (t=1700ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnFade, { toValue: 1, duration: 420, easing: ease, useNativeDriver: false }),
        Animated.spring(btnY, { toValue: 0, friction: 7, tension: 85, useNativeDriver: false }),
      ]).start();
    }, 1700);
  }, []);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { minHeight: H, paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Background glow */}
      <Animated.View
        style={[
          styles.blob,
          { backgroundColor: colors.primary, opacity: blobOpacity },
        ]}
      />

      {/* ── LOGO SECTION ─────────────────── */}
      <View style={[styles.logoSection, { height: LOGO_SECTION_H, paddingTop: insets.top }]}>
        {/* Glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: colors.primary,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        {/* Logo */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, logoPulse) }],
          }}
        >
          <View style={[styles.logoWrap, colors.background === "#0A0A0A" ? styles.logoWrapDark : styles.logoWrapLight]}>
            <Image
              source={colors.background === "#0A0A0A" ? require("@/assets/images/logo-dark.png") : require("@/assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>

      {/* ── TEXT SECTION ─────────────────── */}
      <View style={styles.textSection}>
        <Animated.Text
          style={[styles.brand, { color: colors.primary, opacity: brandFade, transform: [{ translateY: brandY }] }]}
        >
          UCONNECT
        </Animated.Text>
        <Animated.Text
          style={[styles.headline, { color: colors.foreground, opacity: headFade, transform: [{ translateY: headY }] }]}
        >
          Your college.{"\n"}Your voice.
        </Animated.Text>
        <Animated.Text
          style={[styles.subtitle, { color: colors.mutedForeground, opacity: subFade }]}
        >
          The anonymous social network for verified college students. Share freely, connect deeply.
        </Animated.Text>
      </View>

      {/* ── FEATURES ─────────────────────── */}
      <View style={styles.featuresSection}>
        {FEATURES.map((f, i) => (
          <Animated.View
            key={i}
            style={[
              styles.featureRow,
              { borderBottomColor: colors.border },
              {
                opacity: featAnims[i].opacity,
                transform: [{ translateX: featAnims[i].x }],
              },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "25" }]}>
              <Feather name={f.icon as any} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
          </Animated.View>
        ))}
      </View>

      {/* ── BUTTONS ──────────────────────── */}
      <Animated.View
        style={[
          styles.buttonsSection,
          { opacity: btnFade, transform: [{ translateY: btnY }] },
        ]}
      >
        <SpringButton
          onPress={() => router.push({ pathname: "/auth/login", params: { flow: "signup" } })}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="mail" size={17} color="#FFF" />
          <Text style={styles.primaryBtnText}>Get Started with College Email</Text>
        </SpringButton>

        <SpringButton
          onPress={() => router.push({ pathname: "/auth/login", params: { flow: "signin" } })}
          style={[styles.outlineBtn, { borderColor: colors.primary }]}
        >
          <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Sign In</Text>
        </SpringButton>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Only students with a valid college email can join
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function SpringButton({ onPress, style, children }: any) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(sc, { toValue: 0.94, tension: 320, friction: 8, useNativeDriver: false }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, tension: 200, friction: 8, useNativeDriver: false }).start()}
        activeOpacity={1}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { flexGrow: 1 },
  blob: {
    position: "absolute",
    width: W * 1.2,
    height: W * 1.2,
    borderRadius: W * 0.6,
    top: -W * 0.35,
    alignSelf: "center",
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapLight: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  logoWrapDark: { backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.2)" },
  logoImg: { width: 90, height: 90 },
  textSection: {
    paddingHorizontal: 28,
    paddingTop: 8,
    alignItems: "center",
    gap: 10,
  },
  brand: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 5 },
  headline: {
    fontSize: 34, fontFamily: "Inter_700Bold",
    textAlign: "center", lineHeight: 42, letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 22,
  },
  featuresSection: { paddingHorizontal: 24, paddingTop: 24, gap: 0 },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  featureText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  buttonsSection: { paddingHorizontal: 24, paddingTop: 28, gap: 12 },
  primaryBtn: {
    height: 54, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  outlineBtn: {
    height: 50, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", opacity: 0.6 },
});
