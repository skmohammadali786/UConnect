import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";

const FAQS = [
  {
    q: "How does anonymous posting work?",
    a: "When you post anonymously, your name and profile photo are hidden from other users. Only the UConnect team can see the original poster if required for safety investigations.",
  },
  {
    q: "Can I delete my posts?",
    a: "Yes! Tap the three-dot menu on any of your posts and select Delete. Once deleted, the post is permanently removed.",
  },
  {
    q: "How do I report harmful content?",
    a: "Tap the three-dot menu on any post and select Report. Choose a reason and submit — our team reviews reports within 24 hours.",
  },
  {
    q: "Is my data stored securely?",
    a: "UConnect stores your data locally on your device only. We do not send your personal information to any external servers.",
  },
  {
    q: "How do team join requests work?",
    a: "When you request to join a team, the team creator gets a notification and can approve or deny your request from their profile.",
  },
  {
    q: "Can I change my college after signing up?",
    a: "Your college is verified during sign-up and cannot be changed to maintain trust. Contact support if you've transferred colleges.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, []);

  const toggle = (i: number) => {
    if (openIndex === i) {
      setOpenIndex(null);
    } else {
      setOpenIndex(i);
    }
  };

  const handleEmailSupport = async () => {
    const email = "support@uconnect.social";
    const subject = encodeURIComponent("UConnect Support Request");
    const url = `mailto:${email}?subject=${subject}`;
    try {
      await Linking.openURL(url);
      return;
    } catch {}
    showError("Could not open email app", email);
  };



  const handleChatSupport = async () => {
    const chatUrl = "uconnect://user/uconnect";
    const fallbackUrl = "https://uconnect.app/user/uconnect";
    try {
      await Linking.openURL(chatUrl);
      return;
    } catch {}
    try {
      await Linking.openURL(fallbackUrl);
      return;
    } catch {}
    showError("Could not open chat", "@uconnect");
  };
  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Help & Support</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="life-buoy" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>How can we help?</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>Browse the FAQs below or reach us directly</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Frequently Asked Questions</Text>

        {FAQS.map((faq, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => toggle(i)}
            style={[styles.faqCard, { backgroundColor: colors.card, borderColor: openIndex === i ? colors.primary + "40" : colors.border }]}
          >
            <View style={styles.faqRow}>
              <Text style={[styles.faqQ, { color: colors.foreground, flex: 1, paddingRight: 10 }]}>{faq.q}</Text>
              <Feather name={openIndex === i ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
            </View>
            {openIndex === i && (
              <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact Us</Text>

        {[
          { icon: "mail", label: "Email Support", sub: "support@uconnect.social", action: handleEmailSupport },
          { icon: "message-circle", label: "Chat With Us", sub: "Official @uconnect account", action: handleChatSupport },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.action}
            style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.contactIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8 },
  faqCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  faqRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  faqQ: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  faqA: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, borderTopWidth: 1, paddingTop: 10, borderTopColor: "#2A2A2A" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  contactIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
