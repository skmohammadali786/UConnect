import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";

interface Team {
  id: string;
  title: string;
  type: string;
  description: string;
  skills: string[];
  members: number;
  maxMembers: number;
  deadline: string;
  poster: string;
}

const TEAMS: Team[] = [
  { id: "t1", title: "Looking for ML team members for Smart India Hackathon", type: "Hackathon", description: "Building an AI-based crop disease detection system. Need 2 more team members.", skills: ["Python", "TensorFlow", "Computer Vision"], members: 2, maxMembers: 4, deadline: "Nov 20", poster: "priya_cs23" },
  { id: "t2", title: "Startup co-founders wanted - EdTech idea", type: "Startup", description: "Working on a peer-to-peer tutoring platform. Looking for a designer and a backend dev.", skills: ["React Native", "Node.js", "UI/UX"], members: 1, maxMembers: 3, deadline: "Open", poster: "arjun_mech22" },
  { id: "t3", title: "ACM ICPC team - need competitive programmer", type: "Competition", description: "Our team qualified for regionals. One member dropped. Need someone rated 1800+ on Codeforces.", skills: ["CP", "Algorithms", "C++"], members: 2, maxMembers: 3, deadline: "Nov 30", poster: "anonymous" },
  { id: "t4", title: "Research project: NLP for Indian languages", type: "Research", description: "IIT Delhi NLP lab project. Looking for students interested in NLP and ML research.", skills: ["NLP", "Python", "PyTorch"], members: 3, maxMembers: 5, deadline: "Dec 15", poster: "shreya_ee24" },
];

const TYPES = ["All", "Hackathon", "Startup", "Research", "Competition"];
const TYPE_COLORS: Record<string, string> = { Hackathon: "#3B82F6", Startup: "#00A86B", Research: "#8B5CF6", Competition: "#F59E0B" };
const STORAGE_KEY = "@uconnect_requested_teams";

function TeamCard({ item, index, requestedIds, onRequest, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const requested = requestedIds.has(item.id);
  const typeColor = TYPE_COLORS[item.type] || "#6B7280";
  const spotsLeft = item.maxMembers - item.members;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity onPress={() => router.push({ pathname: "/teams/[id]" as any, params: { id: item.id } })} style={[styles.card, { backgroundColor: colors.card, borderColor: requested ? colors.primary + "50" : colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <Text style={[styles.deadline, { color: colors.mutedForeground }]}>Deadline: {item.deadline}</Text>
          {spotsLeft <= 1 && !requested && (
            <View style={[styles.urgentBadge, { backgroundColor: "#EF444420" }]}>
              <Text style={[styles.urgentText, { color: "#EF4444" }]}>1 spot left!</Text>
            </View>
          )}
        </View>
        <Text style={[styles.teamTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.skills}>
          {item.skills.map((s: string) => (
            <View key={s} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.skillText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.membersRow}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.membersText, { color: colors.mutedForeground }]}>{item.members}/{item.maxMembers} members</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onRequest(item.id); }}
            style={[styles.requestBtn, { backgroundColor: requested ? colors.primary + "20" : colors.primary, borderColor: requested ? colors.primary : "transparent", borderWidth: requested ? 1 : 0 }]}
          >
            <Text style={[styles.requestText, { color: requested ? colors.primary : "#FFF" }]}>{requested ? "Requested" : "Request to Join"}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TeamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const [activeType, setActiveType] = useState("All");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setRequestedIds(new Set(JSON.parse(raw)));
      } catch {}
    })();
  }, []);

  const handleRequest = async (id: string) => {
    const already = requestedIds.has(id);
    const updated = new Set(requestedIds);
    if (already) { updated.delete(id); } else { updated.add(id); }
    setRequestedIds(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...updated]));
    const team = TEAMS.find((t) => t.id === id);
    if (!already) showSuccess("Request sent!", `Your request to join "${team?.poster}"'s team was sent.`);
  };

  const filtered = TEAMS.filter((t) => activeType === "All" || t.type === activeType);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Team Finder</Text>
          {requestedIds.size > 0 && <Text style={[styles.subtitle, { color: colors.primary }]}>{requestedIds.size} requested</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push("/teams/create")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveType(t)} style={[styles.filterChip, { backgroundColor: activeType === t ? colors.primary : colors.card, borderColor: activeType === t ? colors.primary : colors.border }]}>
                <Text style={[styles.filterText, { color: activeType === t ? "#FFF" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        renderItem={({ item, index }) => <TeamCard item={item} index={index} requestedIds={requestedIds} onRequest={handleRequest} colors={colors} />}
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
  subtitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deadline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  urgentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgentText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  teamTitle: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 21 },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  skillText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  membersRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  membersText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  requestBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  requestText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
