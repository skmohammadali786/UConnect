import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  duration: string;
  stipend: string;
  type: "Remote" | "Hybrid" | "Onsite";
  skills: string[];
  deadline: string;
  postedBy: string;
  isVerified: boolean;
}

const INTERNSHIPS: Internship[] = [
  { id: "i1", company: "Google", role: "Software Engineering Intern", location: "Bangalore", duration: "3 months", stipend: "₹1,00,000/month", type: "Hybrid", skills: ["Python", "Algorithms", "System Design"], deadline: "Nov 30, 2025", postedBy: "placement_cell", isVerified: true },
  { id: "i2", company: "Microsoft", role: "Product Management Intern", location: "Hyderabad", duration: "6 months", stipend: "₹80,000/month", type: "Onsite", skills: ["Product Thinking", "Excel", "SQL"], deadline: "Dec 10, 2025", postedBy: "arjun_mech22", isVerified: true },
  { id: "i3", company: "Startupboost", role: "Full Stack Developer", location: "Remote", duration: "3 months", stipend: "₹20,000/month", type: "Remote", skills: ["React", "Node.js", "MongoDB"], deadline: "Nov 20, 2025", postedBy: "priya_cs23", isVerified: false },
  { id: "i4", company: "Goldman Sachs", role: "Quantitative Analyst Intern", location: "Mumbai", duration: "2 months", stipend: "₹1,20,000/month", type: "Onsite", skills: ["Statistics", "Python", "Finance"], deadline: "Dec 5, 2025", postedBy: "placement_cell", isVerified: true },
  { id: "i5", company: "Groww", role: "Android Developer Intern", location: "Bangalore", duration: "4 months", stipend: "₹60,000/month", type: "Hybrid", skills: ["Kotlin", "Jetpack Compose", "REST APIs"], deadline: "Nov 25, 2025", postedBy: "anonymous", isVerified: false },
];

const TYPE_COLORS = { Remote: "#00A86B", Hybrid: "#3B82F6", Onsite: "#8B5CF6" };

export default function InternshipsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeType, setActiveType] = useState<string>("All");

  const filtered = INTERNSHIPS.filter((i) => activeType === "All" || i.type === activeType);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Internships</Text>
        <TouchableOpacity onPress={() => router.push("/internships/post")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            {["All", "Remote", "Hybrid", "Onsite"].map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveType(t)} style={[styles.filterChip, { backgroundColor: activeType === t ? colors.primary : colors.card, borderColor: activeType === t ? colors.primary : colors.border }]}>
                <Text style={[styles.filterText, { color: activeType === t ? "#FFF" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/internships/[id]" as any, params: { id: item.id } })} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.companyIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="briefcase" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardTitle}>
                <View style={styles.titleRow}>
                  <Text style={[styles.company, { color: colors.foreground }]}>{item.company}</Text>
                  {item.isVerified && <Feather name="check-circle" size={14} color={colors.primary} />}
                </View>
                <Text style={[styles.role, { color: colors.mutedForeground }]}>{item.role}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[item.type] || "#6B7280") + "20" }]}>
                <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] || "#6B7280" }]}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.duration}</Text>
              </View>
            </View>
            <Text style={[styles.stipend, { color: colors.primary }]}>{item.stipend}</Text>
            <View style={styles.skills}>
              {item.skills.map((s) => (
                <View key={s} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.skillText, { color: colors.foreground }]}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.deadline, { color: colors.mutedForeground }]}>Deadline: {item.deadline}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  companyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  company: { fontSize: 16, fontFamily: "Inter_700Bold" },
  role: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stipend: { fontSize: 16, fontFamily: "Inter_700Bold" },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  skillText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  deadline: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
