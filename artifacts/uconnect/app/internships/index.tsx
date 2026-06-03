import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { useGhostMode } from "@/context/GhostModeContext";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  description: string;
}
interface ApplicationState {
  status: string;
  reviewReason: string | null;
}

interface InternshipRow {
  id: string;
  company: string;
  role: string;
  location: string;
  duration: string;
  stipend: number;
  type: Internship['type'];
  skills?: string[];
  deadline: string;
  poster_username: string;
  is_verified: boolean;
  description?: string;
}

function rowToInternship(r: InternshipRow): Internship {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    location: r.location,
    duration: r.duration,
    stipend: r.stipend,
    type: r.type,
    skills: r.skills ?? [],
    deadline: r.deadline,
    postedBy: r.poster_username,
    isVerified: r.is_verified,
    description: r.description ?? "",
  };
}

const TYPE_COLORS: Record<string, string> = { Remote: "#00A86B", Hybrid: "#3B82F6", Onsite: "#8B5CF6" };

interface InternshipCardProps {
  item: Internship;
  index: number;
  applications: Record<string, ApplicationState>;
  onApply: (id: string) => void;
  colors: {
    card: string;
    primary: string;
    border: string;
    foreground: string;
    mutedForeground: string;
  };
}

function InternshipCard({ item, index, applications, onApply, colors }: InternshipCardProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const application = applications[item.id] as ApplicationState | undefined;
  const applied = !!application;
  const statusLabel = application?.status ?? "pending";
  const isApproved = statusLabel === "approved" || statusLabel === "hired";
  const isRejected = statusLabel === "rejected";

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity onPress={() => router.push({ pathname: "/internships/[id]", params: { id: item.id } })} style={[styles.card, { backgroundColor: colors.card, borderColor: applied ? colors.primary + "50" : colors.border }]}>        
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
        {item.skills.length > 0 && (
          <View style={styles.skills}>
            {item.skills.slice(0, 4).map((s: string) => (
              <View key={s} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.skillText, { color: colors.foreground }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.cardBottom}>
          <Text style={[styles.deadline, { color: colors.mutedForeground }]}>Deadline: {item.deadline}</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onApply(item.id); }}
            style={[styles.applyBtn, { backgroundColor: applied ? colors.primary + "20" : colors.primary, borderColor: applied ? colors.primary : "transparent", borderWidth: applied ? 1 : 0 }]}
          >
            <Feather name={applied ? "x" : "external-link"} size={13} color={applied ? colors.primary : "#FFF"} />
            <Text style={[styles.applyText, { color: applied ? colors.primary : "#FFF" }]}>{applied ? "Withdraw" : "Apply"}</Text>
          </TouchableOpacity>
        </View>
        {applied ? (
          <View style={[styles.statusBadge, { backgroundColor: isRejected ? "#EF444414" : isApproved ? "#00A86B14" : colors.primary + "14", borderColor: isRejected ? "#EF444440" : isApproved ? "#00A86B40" : colors.primary + "40" }]}>
            <Feather name={isRejected ? "x-circle" : isApproved ? "check-circle" : "clock"} size={13} color={isRejected ? "#EF4444" : isApproved ? "#00A86B" : colors.primary} />
            <Text style={[styles.statusText, { color: isRejected ? "#EF4444" : isApproved ? "#00A86B" : colors.primary }]}>
              {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
            </Text>
          </View>
        ) : null}
        {application?.reviewReason ? <Text style={[styles.statusReason, { color: colors.mutedForeground }]}>Reason: {application.reviewReason}</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function InternshipsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const ghost = useGhostMode();
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [activeType, setActiveType] = useState<string>("All");
  const [applications, setApplications] = useState<Record<string, ApplicationState>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const loadInternships = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("internships")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setInternships(data.map(rowToInternship));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  type InternshipApplicationRow = {
    internship_id: string;
    status: string | null;
    review_reason: string | null;
  };

  const loadApplications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from<InternshipApplicationRow>("internship_applications")
        .select("internship_id,status,review_reason")
        .eq("user_id", user.id);
      if (data) {
        const next: Record<string, ApplicationState> = {};
        for (const row of data) {
          next[row.internship_id] = {
            status: row.status ?? "pending",
            reviewReason: row.review_reason ?? null,
          };
        }
        setApplications(next);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => { loadInternships(); }, []);
  useEffect(() => { loadApplications(); }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInternships();
    loadApplications();
  };

  const handleApply = async (id: string) => {
    if (!user) return;
    if (!ghost.canPerformIdentityAction("apply_internship")) {
      showError("Ghost Mode active", "Turn off Ghost Mode before applying to internships.");
      return;
    }
    const already = !!applications[id];
    const updated = { ...applications };

    if (already) {
      await supabase.from("internship_applications").delete().eq("user_id", user.id).eq("internship_id", id);
      delete updated[id];
    } else {
      await supabase.rpc("apply_internship", { p_internship_id: id, p_message: "" });
      const item = internships.find((i) => i.id === id);
      showSuccess(`Applied to ${item?.company}!`, "Application tracked successfully.");
      updated[id] = { status: "pending", reviewReason: null };
    }
    setApplications(updated);
  };

  const filtered = internships.filter((i) => activeType === "All" || i.type === activeType);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <TypewriterText text="Internships" style={[styles.title, { color: colors.foreground }]} delay={300} speed={55} />
          {Object.keys(applications).length > 0 && <Text style={[styles.subtitle, { color: colors.primary }]}>{Object.keys(applications).length} applications</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push("/internships/post")} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
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
          renderItem={({ item, index }) => (
            <InternshipCard item={item} index={index} applications={applications} onApply={handleApply} colors={colors} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="briefcase" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No internships yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Post the first internship opportunity for your college!</Text>
              <TouchableOpacity onPress={() => router.push("/internships/post")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.emptyBtnText}>Post Internship</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  createBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deadline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  applyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusBadge: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusReason: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
