import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

const TEAM_DATA: Record<string, any> = {
  t1: { id: "t1", title: "Looking for ML team members for Smart India Hackathon", type: "Hackathon", description: "We're building an AI-based crop disease detection system for SIH 2025. Our current team has 2 backend devs and we need someone with ML/Computer Vision expertise. Experience with TensorFlow or PyTorch preferred.", skills: ["Python", "TensorFlow", "Computer Vision", "OpenCV"], members: 2, maxMembers: 4, deadline: "Nov 20", poster: "priya_cs23", requirements: ["Basic ML knowledge", "Ability to commit 4+ hours/day during hackathon", "Comfortable with Python", "Interested in agri-tech"] },
};

export default function TeamDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const team = TEAM_DATA[id] || TEAM_DATA["t1"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Team Request</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.typeIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="users" size={32} color={colors.primary} />
          </View>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.typeText, { color: colors.primary }]}>{team.type}</Text>
          </View>
          <Text style={[styles.teamTitle, { color: colors.foreground }]}>{team.title}</Text>
          <View style={styles.memberStatus}>
            <Feather name="users" size={14} color={colors.mutedForeground} />
            <Text style={[styles.memberText, { color: colors.mutedForeground }]}>{team.members}/{team.maxMembers} members</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.deadline, { color: colors.warning }]}>Deadline: {team.deadline}</Text>
          </View>
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.desc, { color: colors.foreground }]}>{team.description}</Text>
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills Needed</Text>
          <View style={styles.skills}>
            {(team.skills as string[]).map((s) => (
              <View key={s} style={[styles.skillChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Requirements</Text>
          {(team.requirements as string[]).map((r, i) => (
            <View key={i} style={styles.req}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.reqText, { color: colors.foreground }]}>{r}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.posterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.posterAvatar, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="user" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.posterText, { color: colors.foreground }]}>Posted by <Text style={{ color: colors.primary }}>@{team.poster}</Text></Text>
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <AppButton title="Request to Join" onPress={() => Alert.alert("Request Sent!", "The team leader will review your request and reach out.", [{ text: "OK" }])} fullWidth size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  typeIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  teamTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 26 },
  memberStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dot: { fontSize: 13 },
  deadline: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  skillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  req: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  reqText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  posterRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 14 },
  posterAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  posterText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
});
