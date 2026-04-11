import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";

const ND = Platform.OS !== "web";
const STORAGE_KEY = "@uconnect_applied_internships";

const INTERNSHIP_DATA: Record<string, any> = {
  i1: { id: "i1", company: "Google", role: "Software Engineering Intern", location: "Bangalore", duration: "3 months", stipend: "₹1,00,000/month", type: "Hybrid", skills: ["Python", "Algorithms", "System Design", "Data Structures"], deadline: "Nov 30, 2025", postedBy: "placement_cell", isVerified: true, description: "Join Google's engineering team to work on real products used by millions. Interns work on meaningful projects with full software engineer mentorship.", requirements: ["Currently pursuing B.Tech/M.Tech in CS or related", "Strong DSA fundamentals", "Problem solving skills", "Competitive programming background preferred"] },
  i2: { id: "i2", company: "Microsoft", role: "Product Management Intern", location: "Hyderabad", duration: "6 months", stipend: "₹80,000/month", type: "Onsite", skills: ["Product Thinking", "Excel", "SQL", "Communication"], deadline: "Dec 10, 2025", postedBy: "arjun_mech22", isVerified: true, description: "Work alongside Microsoft's product team to shape future products. You'll conduct user research, write PRDs, and collaborate with engineering.", requirements: ["Strong analytical mindset", "Excellent communication", "Exposure to product design tools", "Curiosity for technology"] },
  i3: { id: "i3", company: "Startupboost", role: "Full Stack Developer", location: "Remote", duration: "3 months", stipend: "₹20,000/month", type: "Remote", skills: ["React", "Node.js", "MongoDB", "REST APIs"], deadline: "Nov 20, 2025", postedBy: "priya_cs23", isVerified: false, description: "Join a fast-growing startup to build and ship features used by thousands of users daily. You'll work across the entire stack.", requirements: ["React + Node.js experience", "Basic database knowledge", "Git proficiency", "Can commit 4+ hours/day"] },
  i4: { id: "i4", company: "Goldman Sachs", role: "Quantitative Analyst Intern", location: "Mumbai", duration: "2 months", stipend: "₹1,20,000/month", type: "Onsite", skills: ["Statistics", "Python", "Finance", "Excel"], deadline: "Dec 5, 2025", postedBy: "placement_cell", isVerified: true, description: "Work with the trading and risk management teams on quantitative models that power billions of dollars in transactions.", requirements: ["Strong math/statistics foundation", "Python or R proficiency", "Finance knowledge preferred", "Excellent academics"] },
  i5: { id: "i5", company: "Groww", role: "Android Developer Intern", location: "Bangalore", duration: "4 months", stipend: "₹60,000/month", type: "Hybrid", skills: ["Kotlin", "Jetpack Compose", "REST APIs", "Android Studio"], deadline: "Nov 25, 2025", postedBy: "anonymous", isVerified: false, description: "Build features for India's most popular investment app, used by 10M+ users. You'll own and ship real user-facing features.", requirements: ["Kotlin/Java experience", "Jetpack Compose knowledge", "Understanding of MVVM", "Self-motivated learner"] },
};

export default function InternshipDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showInfo } = useToast();
  const [applied, setApplied] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const applyAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const internship = INTERNSHIP_DATA[id as string] || INTERNSHIP_DATA["i1"];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: ND }).start();
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        const ids: string[] = JSON.parse(v);
        if (ids.includes(internship.id)) setApplied(true);
      }
    });
  }, [internship.id]);

  const handleApply = async () => {
    setApplyConfirm(false);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(internship.id)) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, internship.id]));
    }
    setApplied(true);
    Animated.sequence([
      Animated.spring(applyAnim, { toValue: 1.08, tension: 200, friction: 5, useNativeDriver: ND }),
      Animated.spring(applyAnim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: ND }),
    ]).start();
    showSuccess(`Applied to ${internship.company}! 🎉`, "Application sent. They'll contact your college email.");
  };

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, { opacity: fadeAnim }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Internship</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: applied ? colors.primary + "60" : colors.border }]}>
          <View style={[styles.companyIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="briefcase" size={32} color={colors.primary} />
          </View>
          <View style={styles.companyTitle}>
            <Text style={[styles.company, { color: colors.foreground }]}>{internship.company}</Text>
            {internship.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="check-circle" size={13} color={colors.primary} />
                <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>{internship.role}</Text>
          <View style={styles.chips}>
            {[internship.type, internship.location, internship.duration].map((v: string) => (
              <View key={v} style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.foreground }]}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.stipend, { color: colors.primary }]}>{internship.stipend}</Text>
          {applied && (
            <View style={[styles.appliedBanner, { backgroundColor: "#00A86B12", borderColor: "#00A86B30" }]}>
              <Feather name="check-circle" size={15} color="#00A86B" />
              <Text style={[styles.appliedBannerText, { color: "#00A86B" }]}>You applied for this internship</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About the Role</Text>
          <Text style={[styles.desc, { color: colors.foreground }]}>{internship.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Requirements</Text>
          {(internship.requirements as string[]).map((r: string, i: number) => (
            <View key={i} style={styles.reqItem}>
              <View style={[styles.reqDot, { backgroundColor: colors.primary + "30" }]}>
                <Feather name="check" size={10} color={colors.primary} />
              </View>
              <Text style={[styles.reqText, { color: colors.foreground }]}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills Required</Text>
          <View style={styles.skills}>
            {(internship.skills as string[]).map((s: string) => (
              <View key={s} style={[styles.skillChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.deadlineRow, { backgroundColor: "#F59E0B0D", borderColor: "#F59E0B30" }]}>
          <Feather name="clock" size={16} color="#F59E0B" />
          <Text style={[styles.deadlineText, { color: colors.foreground }]}>
            Apply before <Text style={{ color: "#F59E0B", fontFamily: "Inter_700Bold" }}>{internship.deadline}</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.applyBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        {applied ? (
          <Animated.View style={[styles.appliedBtn, { backgroundColor: "#00A86B12", borderColor: "#00A86B40", transform: [{ scale: applyAnim }] }]}>
            <Feather name="check-circle" size={20} color="#00A86B" />
            <View>
              <Text style={[styles.appliedBtnTitle, { color: "#00A86B" }]}>Application Submitted</Text>
              <Text style={[styles.appliedBtnSub, { color: "#00A86B" + "90" }]}>Watch your college email for updates</Text>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity onPress={() => setApplyConfirm(true)} style={[styles.applyBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
            <Feather name="send" size={18} color="#FFF" />
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <ConfirmModal
        visible={applyConfirm}
        title={`Apply to ${internship.company}?`}
        message={`Your application will be submitted for ${internship.role}. The company will contact you via your college email.`}
        confirmText="Submit Application"
        cancelText="Not Yet"
        variant="info"
        onConfirm={handleApply}
        onCancel={() => setApplyConfirm(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: "center", gap: 12 },
  companyIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  companyTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  company: { fontSize: 24, fontFamily: "Inter_700Bold" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  role: { fontSize: 15, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stipend: { fontSize: 22, fontFamily: "Inter_700Bold" },
  appliedBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "stretch", justifyContent: "center" },
  appliedBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  reqItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reqDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  reqText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, flex: 1 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  skillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  deadlineText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  applyBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  applyBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  appliedBtn: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5 },
  appliedBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  appliedBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
