import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { safeInsertNotification } from "@/utils/notifications";

const ND = Platform.OS !== "web";

interface InternshipDetail {
  id: string;
  company: string;
  role: string;
  location: string;
  duration: string;
  stipend: string;
  type: string;
  skills: string[];
  deadline: string;
  postedBy: string;
  isVerified: boolean;
  description: string;
  posterId: string;
}

interface InternshipApplication {
  id: string;
  userId: string;
  status: string;
  applyMessage: string;
  reviewReason: string | null;
  createdAt: string;
  applicantName: string;
  applicantUsername: string;
  applicantCollege: string;
}

export default function InternshipDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showInfo, showError } = useToast();
  const { user } = useAuth();
  const [application, setApplication] = useState<{ id: string; status: string; reason: string | null } | null>(null);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [internshipLoading, setInternshipLoading] = useState(true);
  const [hostApplications, setHostApplications] = useState<InternshipApplication[]>([]);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const applyAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: ND }).start();
  }, []);

  useEffect(() => {
    if (!id) {
      setInternshipLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("internships")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setInternship({
            id: data.id,
            company: data.company,
            role: data.role,
            location: data.location,
            duration: data.duration,
            stipend: data.stipend,
            type: data.type,
            skills: data.skills ?? [],
            deadline: data.deadline,
            postedBy: data.poster_username,
            isVerified: data.is_verified,
            description: data.description ?? "",
            posterId: data.poster_id,
          });
        } else {
          setInternship(null);
        }
      } catch {
        setInternship(null);
      }
      setInternshipLoading(false);
    })();
  }, [id]);

  const isHost = !!user && internship?.posterId === user.id;

  useEffect(() => {
    if (!user || !internship?.id) {
      setApplication(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("internship_applications")
        .select("id,status,review_reason")
        .eq("user_id", user.id)
        .eq("internship_id", internship.id)
        .maybeSingle();
      if (!data) {
        setApplication(null);
        return;
      }
      setApplication({
        id: data.id,
        status: data.status ?? "pending",
        reason: data.review_reason ?? null,
      });
    })();
  }, [internship?.id, user?.id]);

  const loadHostApplications = async () => {
    if (!internship?.id || !isHost) {
      setHostApplications([]);
      return;
    }
    const { data } = await supabase
      .from("internship_applications")
      .select("id,user_id,status,apply_message,review_reason,created_at")
      .eq("internship_id", internship.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    if (rows.length === 0) {
      setHostApplications([]);
      return;
    }
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id,username,display_name,college")
      .in("id", userIds);
    const byId = new Map((profileRows ?? []).map((p: any) => [p.id, p]));
    setHostApplications(rows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        status: r.status ?? "pending",
        applyMessage: r.apply_message ?? "",
        reviewReason: r.review_reason ?? null,
        createdAt: r.created_at,
        applicantName: p?.display_name || p?.username || "Student",
        applicantUsername: p?.username || "student",
        applicantCollege: p?.college || "",
      };
    }));
  };

  useEffect(() => {
    loadHostApplications();
  }, [internship?.id, isHost]);

  const handleApply = async () => {
    if (!internship) return;
    if (!user) {
      showInfo("Sign in required", "Please sign in to apply for internships.");
      return;
    }
    setApplyConfirm(false);
    await supabase.rpc("apply_internship", { p_internship_id: internship.id, p_message: "" });
    setApplication({ id: `${Date.now()}`, status: "pending", reason: null });
    Animated.sequence([
      Animated.spring(applyAnim, { toValue: 1.08, tension: 200, friction: 5, useNativeDriver: ND }),
      Animated.spring(applyAnim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: ND }),
    ]).start();
    showSuccess(`Applied to ${internship.company}!`, "Application sent. They'll contact your college email.");
  };

  const handleReview = async (app: InternshipApplication, status: "approved" | "rejected") => {
    if (!internship || !user) return;
    setActioningId(app.id);
    const reason = reasonDrafts[app.id]?.trim() || null;
    try {
      await supabase.rpc("review_internship_application", {
        p_application_id: app.id,
        p_new_status: status,
        p_reason: reason,
      });
      setHostApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status, reviewReason: reason } : a)),
      );
      const notifyError = await safeInsertNotification({
        user_id: app.userId,
        type: "system",
        title: `Internship Application ${status}`,
        body: status === "approved"
          ? `Your application for ${internship.role} at ${internship.company} was approved.`
          : `Your application for ${internship.role} at ${internship.company} was rejected.`,
        action_id: internship.id,
        action_type: "internship_application_status",
        redirect_path: `/internships/${internship.id}`,
        entity_type: "internship",
        entity_id: internship.id,
        secondary_entity_type: "reviewer",
        secondary_entity_id: user.id,
        metadata: { decision: status, reason: reason ?? null, applicationId: app.id },
      });
      if (notifyError) {
        showInfo("Application updated", "Status saved, but notification could not be sent.");
      }
      if (status === "approved") {
        showSuccess(`Approved ${app.applicantName}`, internship.company);
      } else {
        showInfo(`Rejected ${app.applicantName}`, reason ?? "Application updated");
      }
    } catch {
      showError("Could not update application", "Please try again.");
    }
    setActioningId(null);
  };

  if (internshipLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Internship</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!internship) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Internship</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Feather name="briefcase" size={36} color={colors.mutedForeground} />
          <Text style={[styles.desc, { color: colors.foreground, marginTop: 12, textAlign: "center" }]}>Internship not found</Text>
        </View>
      </View>
    );
  }

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
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: application ? colors.primary + "60" : colors.border }]}>
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
          {application && (
            <View style={[styles.appliedBanner, { backgroundColor: application.status === "rejected" ? "#EF444412" : "#00A86B12", borderColor: application.status === "rejected" ? "#EF444430" : "#00A86B30" }]}>
              <Feather name={application.status === "rejected" ? "x-circle" : application.status === "approved" ? "check-circle" : "clock"} size={15} color={application.status === "rejected" ? "#EF4444" : application.status === "approved" ? "#00A86B" : colors.primary} />
              <Text style={[styles.appliedBannerText, { color: application.status === "rejected" ? "#EF4444" : application.status === "approved" ? "#00A86B" : colors.primary }]}>
                Application status: {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </Text>
            </View>
          )}
          {application?.reason ? <Text style={[styles.reasonText, { color: colors.mutedForeground }]}>Reason: {application.reason}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About the Role</Text>
          <Text style={[styles.desc, { color: colors.foreground }]}>{internship.description}</Text>
        </View>

        <View style={[styles.deadlineRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={16} color={colors.primary} />
          <Text style={[styles.deadlineText, { color: colors.foreground }]}>
            Posted by <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>@{internship.postedBy}</Text>
          </Text>
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
        {isHost ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Applications</Text>
            {hostApplications.length === 0 ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>No applications yet.</Text>
            ) : hostApplications.map((app) => (
              <View key={app.id} style={[styles.hostCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.hostRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hostName, { color: colors.foreground }]}>{app.applicantName}</Text>
                    <Text style={[styles.hostMeta, { color: colors.mutedForeground }]}>@{app.applicantUsername} {app.applicantCollege ? `• ${app.applicantCollege}` : ""}</Text>
                  </View>
                  <View style={[styles.hostStatus, { backgroundColor: app.status === "rejected" ? "#EF444414" : app.status === "approved" ? "#00A86B14" : colors.primary + "14" }]}>
                    <Text style={[styles.hostStatusText, { color: app.status === "rejected" ? "#EF4444" : app.status === "approved" ? "#00A86B" : colors.primary }]}>{app.status}</Text>
                  </View>
                </View>
                {app.applyMessage ? <Text style={[styles.hostMessage, { color: colors.foreground }]}>{app.applyMessage}</Text> : null}
                {app.reviewReason ? <Text style={[styles.hostReason, { color: colors.mutedForeground }]}>Reason: {app.reviewReason}</Text> : null}
                <TextInput
                  placeholder="Optional decision reason"
                  placeholderTextColor={colors.placeholder}
                  value={reasonDrafts[app.id] ?? ""}
                  onChangeText={(t) => setReasonDrafts((prev) => ({ ...prev, [app.id]: t }))}
                  style={[styles.reasonInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
                />
                <View style={styles.hostActions}>
                  <TouchableOpacity disabled={actioningId === app.id} onPress={() => handleReview(app, "approved")} style={[styles.hostApprove, { backgroundColor: "#00A86B18", borderColor: "#00A86B55" }]}>
                    <Text style={[styles.hostActionText, { color: "#00A86B" }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={actioningId === app.id} onPress={() => handleReview(app, "rejected")} style={[styles.hostReject, { backgroundColor: "#EF444418", borderColor: "#EF444455" }]}>
                    <Text style={[styles.hostActionText, { color: "#EF4444" }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

      </ScrollView>

      <View style={[styles.applyBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        {application ? (
          <Animated.View style={[styles.appliedBtn, { backgroundColor: "#00A86B12", borderColor: "#00A86B40", transform: [{ scale: applyAnim }] }]}>
            <Feather name="check-circle" size={20} color="#00A86B" />
            <View>
              <Text style={[styles.appliedBtnTitle, { color: "#00A86B" }]}>Application {application.status}</Text>
              <Text style={[styles.appliedBtnSub, { color: "#00A86B" + "90" }]}>Watch your college email for updates</Text>
            </View>
          </Animated.View>
        ) : !isHost ? (
          <TouchableOpacity onPress={() => setApplyConfirm(true)} style={[styles.applyBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
            <Feather name="send" size={18} color="#FFF" />
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        ) : null}
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
  reasonText: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  hostCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  hostMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  hostStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  hostStatusText: { fontSize: 11, textTransform: "capitalize", fontFamily: "Inter_600SemiBold" },
  hostMessage: { fontSize: 13, fontFamily: "Inter_400Regular" },
  hostReason: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reasonInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  hostActions: { flexDirection: "row", gap: 8 },
  hostApprove: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  hostReject: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  hostActionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
