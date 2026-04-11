import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Animated, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/components/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TYPE_COLORS: Record<string, string> = {
  Hackathon: "#3B82F6",
  Startup: "#00A86B",
  Research: "#8B5CF6",
  Competition: "#F59E0B",
  Project: "#06B6D4",
  Other: "#6B7280",
};
const STORAGE_KEY = "@uconnect_requested_teams";

function JoinModal({ visible, onClose, onSubmit, colors }: any) {
  const [message, setMessage] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request to Join</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Tell the team admin why you'd be a great fit</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="I'm interested because..."
              placeholderTextColor={colors.placeholder}
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={onClose} style={[styles.modalCancelBtn, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onSubmit(message || "I'd love to join your team!"); setMessage(""); }}
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalSubmitText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function TeamDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { teams, requestJoin, cancelRequest, approveRequest, denyRequest } = useTeams();
  const { showSuccess, showError, showInfo } = useToast();
  const [requested, setRequested] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "requests">("details");

  const team = teams.find((t) => t.id === id);

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        const ids: string[] = JSON.parse(v);
        setRequested(ids.includes(id));
      }
    });
  }, [id]);

  if (!team) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Team not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.primary }]}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = user?.id === team.posterId;
  const typeColor = TYPE_COLORS[team.type] || "#6B7280";
  const spotsLeft = team.maxMembers - team.members;
  const pendingRequests = team.requests.filter((r) => r.status === "pending");
  const approvedRequests = team.requests.filter((r) => r.status === "approved");

  const handleJoinRequest = async (message: string) => {
    if (!user) { showInfo("Sign in required"); return; }
    setJoinVisible(false);
    setRequested(true);
    await requestJoin(team.id, {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      college: user.college,
      message,
    });
    showSuccess("Request sent! 🎉", "The admin will review your request soon.");
  };

  const handleCancel = async () => {
    if (!user) return;
    setRequested(false);
    await cancelRequest(team.id, user.id);
    showInfo("Request cancelled");
  };

  const handleApprove = async (userId: string, displayName: string) => {
    await approveRequest(team.id, userId);
    showSuccess(`✅ Approved ${displayName}`, "They can now join your team!");
  };

  const handleDeny = async (userId: string, displayName: string) => {
    await denyRequest(team.id, userId);
    showInfo(`Request from ${displayName} denied`);
  };

  const viewProfile = (username: string) => {
    router.push({ pathname: "/user/[username]" as any, params: { username } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Team Request</Text>
        <View style={{ width: 38 }} />
      </View>

      {isAdmin && (
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {[{ key: "details", label: "Details" }, { key: "requests", label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` }].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key as any)}
              style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            >
              <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {activeTab === "details" ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.typeIcon, { backgroundColor: typeColor + "15" }]}>
                <Feather name="users" size={30} color={typeColor} />
              </View>
              <View style={[styles.typePill, { backgroundColor: typeColor + "20" }]}>
                <Text style={[styles.typeText, { color: typeColor }]}>{team.type}</Text>
              </View>
              <Text style={[styles.teamTitle, { color: colors.foreground }]}>{team.title}</Text>
              <View style={styles.teamMeta}>
                <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{team.members}/{team.maxMembers} members</Text>
                </View>
                <View style={[styles.metaItem, { backgroundColor: spotsLeft > 0 ? "#F59E0B20" : colors.secondary }]}>
                  <Feather name="clock" size={12} color={spotsLeft > 0 ? "#F59E0B" : colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: spotsLeft > 0 ? "#F59E0B" : colors.mutedForeground }]}>
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"} · {team.deadline}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => viewProfile(team.poster)} style={styles.posterRow}>
                <View style={[styles.posterAvatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.posterLetter, { color: colors.primary }]}>{team.poster[0]?.toUpperCase()}</Text>
                </View>
                <Text style={[styles.posterName, { color: colors.mutedForeground }]}>
                  Posted by <Text style={{ color: colors.primary }}>@{team.poster}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.desc, { color: colors.foreground }]}>{team.description}</Text>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills Needed</Text>
              <View style={styles.skillsRow}>
                {team.skills.map((s) => (
                  <View key={s} style={[styles.skillChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                    <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            {approvedRequests.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Approved Members</Text>
                {approvedRequests.map((r) => (
                  <View key={r.userId} style={[styles.memberRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: "#00A86B20" }]}>
                      <Text style={[styles.memberLetter, { color: "#00A86B" }]}>{r.displayName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: colors.foreground }]}>{r.displayName}</Text>
                      <Text style={[styles.memberCollege, { color: colors.mutedForeground }]}>@{r.username} · {r.college}</Text>
                    </View>
                    <View style={[styles.approvedBadge, { backgroundColor: "#00A86B15" }]}>
                      <Feather name="check-circle" size={13} color="#00A86B" />
                      <Text style={[styles.approvedText, { color: "#00A86B" }]}>Approved</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {pendingRequests.length === 0 ? (
              <View style={styles.noRequests}>
                <Feather name="inbox" size={40} color={colors.mutedForeground} />
                <Text style={[styles.noRequestsTitle, { color: colors.foreground }]}>No pending requests</Text>
                <Text style={[styles.noRequestsSub, { color: colors.mutedForeground }]}>Share your team post to attract more members!</Text>
              </View>
            ) : (
              pendingRequests.map((r) => (
                <View key={r.userId} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.requestHeader}>
                    <TouchableOpacity onPress={() => viewProfile(r.username)} style={styles.requesterInfo}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.memberLetter, { color: colors.primary }]}>{r.displayName[0]?.toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={[styles.memberName, { color: colors.foreground }]}>{r.displayName}</Text>
                        <Text style={[styles.memberCollege, { color: colors.mutedForeground }]}>@{r.username} · {r.college}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => viewProfile(r.username)} style={[styles.viewProfileBtn, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.viewProfileText, { color: colors.foreground }]}>View</Text>
                    </TouchableOpacity>
                  </View>
                  {r.message && (
                    <View style={[styles.messageBox, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.messageText, { color: colors.foreground }]}>"{r.message}"</Text>
                    </View>
                  )}
                  <View style={styles.actionBtns}>
                    <TouchableOpacity onPress={() => handleDeny(r.userId, r.displayName)} style={[styles.denyBtn, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
                      <Feather name="x" size={15} color="#EF4444" />
                      <Text style={[styles.denyText, { color: "#EF4444" }]}>Deny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleApprove(r.userId, r.displayName)} style={[styles.approveBtn, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={15} color="#FFF" />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {!isAdmin && spotsLeft > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}>
          {requested ? (
            <TouchableOpacity onPress={handleCancel} style={[styles.requestedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="check" size={16} color={colors.foreground} />
              <Text style={[styles.requestedBtnText, { color: colors.foreground }]}>Request Sent · Tap to Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setJoinVisible(true)} style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
              <Feather name="user-plus" size={16} color="#FFF" />
              <Text style={styles.joinBtnText}>Request to Join</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isAdmin && spotsLeft === 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}>
          <View style={[styles.fullBar, { backgroundColor: colors.secondary }]}>
            <Feather name="users" size={16} color={colors.mutedForeground} />
            <Text style={[styles.fullBarText, { color: colors.mutedForeground }]}>Team is full</Text>
          </View>
        </View>
      )}

      <JoinModal visible={joinVisible} onClose={() => setJoinVisible(false)} onSubmit={handleJoinRequest} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 12, alignItems: "center" },
  typeIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  teamTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 26 },
  teamMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  posterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  posterAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  posterLetter: { fontSize: 13, fontFamily: "Inter_700Bold" },
  posterName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  skillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  memberLetter: { fontSize: 16, fontFamily: "Inter_700Bold" },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberCollege: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  approvedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  approvedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  requestCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requesterInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  viewProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewProfileText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  messageBox: { borderRadius: 10, padding: 10 },
  messageText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, fontStyle: "italic" },
  actionBtns: { flexDirection: "row", gap: 10 },
  denyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  denyText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  approveText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  noRequests: { alignItems: "center", gap: 14, paddingTop: 48 },
  noRequestsTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  noRequestsSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bottomBar: { borderTopWidth: 1, padding: 16 },
  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  joinBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  requestedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1 },
  requestedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fullBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  fullBarText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalSubmitBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  modalSubmitText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_400Regular" },
  backLink: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backLinkText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
