import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  organizerId: string;
  requiresApproval: boolean;
  rsvpCount: number;
}

interface AttendeeRequest {
  userId: string;
  status: string;
  requestNote: string;
  decisionReason: string | null;
  name: string;
  username: string;
  college: string;
}

export default function EventDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeRequest[]>([]);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setEventLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          setEvent({
            id: data.id,
            title: data.title,
            description: data.description,
            date: data.date,
            location: data.location,
            organizer: data.organizer,
            organizerId: data.organizer_id,
            requiresApproval: !!data.requires_approval,
            rsvpCount: data.rsvp_count ?? 0,
          });
        } else {
          setEvent(null);
        }
      } catch {
        setEvent(null);
      }
      setEventLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("user_id", user.id)
          .eq("event_id", id)
          .maybeSingle();
        setRsvpStatus(data?.status ?? null);
      } catch {}
    })();
  }, [user?.id, id]);

  const isHost = !!user && event?.organizerId === user.id;

  const loadAttendees = async () => {
    if (!id || !isHost) {
      setAttendees([]);
      return;
    }
    const { data } = await supabase
      .from("event_rsvps")
      .select("user_id,status,request_note,decision_reason")
      .eq("event_id", id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    if (rows.length === 0) {
      setAttendees([]);
      return;
    }
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,username,college")
      .in("id", userIds);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    setAttendees(rows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        userId: r.user_id,
        status: r.status ?? "pending",
        requestNote: r.request_note ?? "",
        decisionReason: r.decision_reason ?? null,
        name: p?.display_name || p?.username || "Student",
        username: p?.username || "student",
        college: p?.college || "",
      };
    }));
  };

  useEffect(() => {
    loadAttendees();
  }, [id, isHost]);

  const handleRSVP = async () => {
    if (!event || !id || loading) return;
    const hasRsvp = !!rsvpStatus;
    const nextStatus = hasRsvp ? null : event.requiresApproval ? "pending" : "approved";
    setRsvpStatus(nextStatus);
    if (user) {
      setLoading(true);
      try {
        if (!hasRsvp) {
          await supabase.rpc("rsvp_event", { p_user_id: user.id, p_event_id: id, p_request_note: "" });
          showSuccess(event.requiresApproval ? "Request sent!" : "RSVP confirmed!", event?.title);
        } else {
          await supabase.rpc("unrsvp_event", { p_user_id: user.id, p_event_id: id });
          showSuccess("RSVP cancelled");
        }
      } catch {}
      setLoading(false);
    } else {
      if (!hasRsvp) showSuccess("RSVP confirmed!", event?.title);
    }
  };

  const handleHostDecision = async (targetUserId: string, decision: "approved" | "rejected") => {
    if (!id) return;
    setActioningUserId(targetUserId);
    const reason = reasonDrafts[targetUserId]?.trim() || null;
    await supabase.rpc("review_event_attendee", {
      p_event_id: id,
      p_user_id: targetUserId,
      p_decision: decision,
      p_reason: reason,
    });
    setAttendees((prev) =>
      prev.map((a) =>
        a.userId === targetUserId ? { ...a, status: decision, decisionReason: reason } : a,
      ),
    );
    setActioningUserId(null);
  };

  if (eventLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Event Details</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Event Details</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Feather name="calendar" size={36} color={colors.mutedForeground} />
          <Text style={[styles.desc, { color: colors.foreground, marginTop: 12, textAlign: "center" }]}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Event Details</Text>
        <TouchableOpacity onPress={() => Alert.alert("Share", "Share link copied!")}>
          <Feather name="share-2" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: rsvpStatus ? colors.primary + "50" : colors.border }]}>
          <View style={[styles.eventIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="calendar" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text>
          <Text style={[styles.organizer, { color: colors.mutedForeground }]}>by {event.organizer}</Text>
          {rsvpStatus && (
            <View style={[styles.goingBadge, { backgroundColor: colors.primary + "15" }]}>
              <Feather name={rsvpStatus === "pending" ? "clock" : rsvpStatus === "approved" ? "check-circle" : "x-circle"} size={14} color={rsvpStatus === "rejected" ? "#EF4444" : colors.primary} />
              <Text style={[styles.goingText, { color: rsvpStatus === "rejected" ? "#EF4444" : colors.primary }]}>
                {rsvpStatus === "pending" ? "Pending approval" : rsvpStatus === "approved" ? "You're going!" : "Request rejected"}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "calendar", label: "Date", value: event.date },
              { icon: "map-pin", label: "Location", value: event.location },
              { icon: "users", label: "Attendees", value: `${event.rsvpCount + (rsvpStatus === "approved" ? 1 : 0)} going` },
            ].map((item) => (
              <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.desc, { color: colors.foreground }]}>{event.description}</Text>
        </View>
        {isHost ? (
          <View style={styles.hostSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Attendee Requests</Text>
            {attendees.length === 0 ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>No attendee requests yet.</Text>
            ) : attendees.map((a) => (
              <View key={a.userId} style={[styles.attendeeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.attendeeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.attendeeName, { color: colors.foreground }]}>{a.name}</Text>
                    <Text style={[styles.attendeeMeta, { color: colors.mutedForeground }]}>@{a.username}{a.college ? ` • ${a.college}` : ""}</Text>
                  </View>
                  <View style={[styles.attendeeStatus, { backgroundColor: a.status === "rejected" ? "#EF444414" : a.status === "approved" ? "#00A86B14" : "#F59E0B14" }]}>
                    <Text style={[styles.attendeeStatusText, { color: a.status === "rejected" ? "#EF4444" : a.status === "approved" ? "#00A86B" : "#F59E0B" }]}>{a.status}</Text>
                  </View>
                </View>
                {a.requestNote ? <Text style={[styles.attendeeNote, { color: colors.foreground }]}>{a.requestNote}</Text> : null}
                {a.decisionReason ? <Text style={[styles.attendeeReason, { color: colors.mutedForeground }]}>Reason: {a.decisionReason}</Text> : null}
                <TextInput
                  placeholder="Optional decision reason"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.reasonInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
                  value={reasonDrafts[a.userId] ?? ""}
                  onChangeText={(t) => setReasonDrafts((prev) => ({ ...prev, [a.userId]: t }))}
                />
                <View style={styles.attendeeActions}>
                  <TouchableOpacity disabled={actioningUserId === a.userId} onPress={() => handleHostDecision(a.userId, "approved")} style={[styles.attendeeApprove, { backgroundColor: "#00A86B18", borderColor: "#00A86B55" }]}>
                    <Text style={[styles.attendeeActionText, { color: "#00A86B" }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={actioningUserId === a.userId} onPress={() => handleHostDecision(a.userId, "rejected")} style={[styles.attendeeReject, { backgroundColor: "#EF444418", borderColor: "#EF444455" }]}>
                    <Text style={[styles.attendeeActionText, { color: "#EF4444" }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        {!isHost ? (
          <AppButton
            title={rsvpStatus ? "Cancel RSVP" : event.requiresApproval ? "Request to Attend" : "RSVP — I'm Going!"}
            onPress={handleRSVP}
            variant={rsvpStatus ? "outline" : "primary"}
            fullWidth
            size="lg"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  eventIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 28 },
  organizer: { fontSize: 14, fontFamily: "Inter_400Regular" },
  goingBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  goingText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderBottomWidth: 1 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  desc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  highlight: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  highlightText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  hostSection: { gap: 10 },
  attendeeCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  attendeeHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  attendeeName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  attendeeMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  attendeeStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  attendeeStatusText: { fontSize: 11, textTransform: "capitalize", fontFamily: "Inter_600SemiBold" },
  attendeeNote: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attendeeReason: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reasonInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  attendeeActions: { flexDirection: "row", gap: 8 },
  attendeeApprove: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  attendeeReject: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  attendeeActionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
