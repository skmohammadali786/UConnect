import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

const INTERNSHIP_DATA: Record<string, any> = {
  i1: { id: "i1", company: "Google", role: "Software Engineering Intern", location: "Bangalore", duration: "3 months", stipend: "₹1,00,000/month", type: "Hybrid", skills: ["Python", "Algorithms", "System Design", "Data Structures"], deadline: "Nov 30, 2025", postedBy: "placement_cell", isVerified: true, description: "Join Google's engineering team to work on real products used by millions. Interns work on meaningful projects with full software engineer mentorship.", requirements: ["Currently pursuing B.Tech/M.Tech in CS or related", "Strong DSA fundamentals", "Problem solving skills", "Competitive programming background preferred"] },
};

export default function InternshipDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const internship = INTERNSHIP_DATA[id] || INTERNSHIP_DATA["i1"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Internship</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.companyIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="briefcase" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.company, { color: colors.foreground }]}>{internship.company}</Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>{internship.role}</Text>
          <View style={styles.chips}>
            {[internship.type, internship.location, internship.duration].map((v) => (
              <View key={v} style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.foreground }]}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.stipend, { color: colors.primary }]}>{internship.stipend}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About the Role</Text>
          <Text style={[styles.desc, { color: colors.foreground }]}>{internship.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Requirements</Text>
          {(internship.requirements as string[]).map((r, i) => (
            <View key={i} style={styles.reqItem}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.reqText, { color: colors.foreground }]}>{r}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills Required</Text>
          <View style={styles.skills}>
            {(internship.skills as string[]).map((s) => (
              <View key={s} style={[styles.skillChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.deadlineRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={16} color={colors.warning} />
          <Text style={[styles.deadlineText, { color: colors.foreground }]}>Apply before <Text style={{ color: colors.warning, fontFamily: "Inter_600SemiBold" }}>{internship.deadline}</Text></Text>
        </View>
      </ScrollView>
      <View style={[styles.applyBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <AppButton title="Apply Now" onPress={() => Alert.alert("Apply", "Application submitted! The company will contact your college email.")} fullWidth size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  companyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  company: { fontSize: 22, fontFamily: "Inter_700Bold" },
  role: { fontSize: 15, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stipend: { fontSize: 20, fontFamily: "Inter_700Bold" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  reqItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reqText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  skillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 14 },
  deadlineText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  applyBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
});
