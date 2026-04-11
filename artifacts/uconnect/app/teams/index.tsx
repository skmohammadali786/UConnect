import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/components/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TYPES = ["All", "Hackathon", "Startup", "Research", "Competition", "Project"];
const TYPE_COLORS: Record<string, string> = {
  Hackathon: "#3B82F6",
  Startup: "#00A86B",
  Research: "#8B5CF6",
  Competition: "#F59E0B",
  Project: "#06B6D4",
  Other: "#6B7280",
};
const STORAGE_KEY = "@uconnect_requested_teams";

function TeamCard({ item, index, requestedIds, onRequest, onCancel, isMyTeam, pendingCount, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const requested = requestedIds.has(item.id);
  const typeColor = TYPE_COLORS[item.type] || "#6B7280";
  const spotsLeft = item.maxMembers - item.members;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: Platform.OS !== "web" }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/teams/[id]" as any, params: { id: item.id } })}
        style={[styles.card, { backgroundColor: colors.card, borderColor: (requested || isMyTeam) ? colors.primary + "50" : colors.border }]}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isMyTeam && pendingCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: "#EF4444" }]}>
                <Text style={styles.notifText}>{pendingCount}</Text>
              </View>
            )}
            <Text style={[styles.deadline, { color: colors.mutedForeground }]}>{item.deadline}</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>

        <View style={styles.skills}>
          {item.skills.slice(0, 3).map((skill: string) => (
            <View key={skill} style={[styles.skill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.skillText, { color: colors.mutedForeground }]}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 3 && (
            <Text style={[styles.moreSkills, { color: colors.mutedForeground }]}>+{item.skills.length - 3}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.memberInfo}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.memberText, { color: colors.mutedForeground }]}>
              {item.members}/{item.maxMembers} · {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
            </Text>
            <Text style={[styles.poster, { color: colors.mutedForeground }]}>by @{item.poster}</Text>
          </View>

          {isMyTeam ? (
            <View style={[styles.myTeamBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Feather name="shield" size={12} color={colors.primary} />
              <Text style={[styles.myTeamText, { color: colors.primary }]}>Admin</Text>
            </View>
          ) : spotsLeft > 0 ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); requested ? onCancel(item.id) : onRequest(item.id); }}
              style={[
                styles.requestBtn,
                requested
                  ? { backgroundColor: colors.secondary, borderColor: colors.border }
                  : { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.requestText, { color: requested ? colors.foreground : "#FFF" }]}>
                {requested ? "✓ Requested" : "Request"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.fullBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.fullText, { color: colors.mutedForeground }]}>Full</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TeamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { teams, requestJoin, cancelRequest, getPendingRequests } = useTeams();
  const { showSuccess, showInfo } = useToast();
  const [selectedType, setSelectedType] = useState("All");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setRequestedIds(new Set(JSON.parse(v)));
    });
  }, []);

  const pendingRequests = user ? getPendingRequests(user.id) : [];

  const filteredTeams = selectedType === "All" ? teams : teams.filter((t) => t.type === selectedType);

  const handleRequest = async (teamId: string) => {
    if (!user) { showInfo("Sign in required", "Please sign in to request joining a team."); return; }
    setRequestedIds((prev) => new Set([...prev, teamId]));
    await requestJoin(teamId, {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      college: user.college,
      message: "I'd love to join your team!",
    });
    showSuccess("Request sent! 🎉", "The team admin will review your request.");
  };

  const handleCancel = async (teamId: string) => {
    setRequestedIds((prev) => { const n = new Set(prev); n.delete(teamId); return n; });
    if (user) await cancelRequest(teamId, user.id);
    showInfo("Request cancelled");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Teams</Text>
        <TouchableOpacity onPress={() => router.push("/teams/create")} style={[styles.createBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Feather name="plus" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {pendingRequests.length > 0 && (
        <TouchableOpacity style={[styles.pendingBanner, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
          <Feather name="bell" size={16} color="#EF4444" />
          <Text style={[styles.pendingText, { color: "#EF4444" }]}>
            {pendingRequests.length} pending join request{pendingRequests.length > 1 ? "s" : ""} for your team{pendingRequests.length > 1 ? "s" : ""}
          </Text>
          <Feather name="chevron-right" size={16} color="#EF4444" />
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilter}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSelectedType(t)}
            style={[styles.typeChip, { backgroundColor: selectedType === t ? colors.primary : colors.card, borderColor: selectedType === t ? colors.primary : colors.border }]}
          >
            <Text style={[styles.typeChipText, { color: selectedType === t ? "#FFF" : colors.foreground }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredTeams}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TeamCard
            item={item}
            index={index}
            requestedIds={requestedIds}
            onRequest={handleRequest}
            onCancel={handleCancel}
            isMyTeam={user?.id === item.posterId}
            pendingCount={item.requests.filter((r: any) => r.status === "pending").length}
            colors={colors}
          />
        )}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No teams yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Be the first to post a team request!</Text>
            <TouchableOpacity onPress={() => router.push("/teams/create")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyBtnText}>Create Team Post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  createBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 10, margin: 12, marginBottom: 0, borderRadius: 12, borderWidth: 1, padding: 12 },
  pendingText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  typeFilter: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  notifBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },
  deadline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 22 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  skillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  moreSkills: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "center" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  memberText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  poster: { fontSize: 11, fontFamily: "Inter_400Regular" },
  requestBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  requestText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fullBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fullText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  myTeamBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  myTeamText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 14, paddingTop: 64 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
