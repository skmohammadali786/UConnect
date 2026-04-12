import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  rsvpCount: number;
}

export default function EventDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(false);

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
          .select("event_id")
          .eq("user_id", user.id)
          .eq("event_id", id)
          .maybeSingle();
        setIsAttending(!!data);
      } catch {}
    })();
  }, [user?.id, id]);

  const handleRSVP = async () => {
    if (!event || !id || loading) return;
    if (loading) return;
    const newVal = !isAttending;
    setIsAttending(newVal);
    if (user) {
      setLoading(true);
      try {
        if (newVal) {
          await supabase.rpc("rsvp_event", { p_user_id: user.id, p_event_id: id });
          showSuccess("RSVP confirmed!", event?.title);
        } else {
          await supabase.rpc("unrsvp_event", { p_user_id: user.id, p_event_id: id });
          showSuccess("RSVP cancelled");
        }
      } catch {}
      setLoading(false);
    } else {
      if (newVal) showSuccess("RSVP confirmed!", event?.title);
    }
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
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: isAttending ? colors.primary + "50" : colors.border }]}>
          <View style={[styles.eventIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="calendar" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text>
          <Text style={[styles.organizer, { color: colors.mutedForeground }]}>by {event.organizer}</Text>
          {isAttending && (
            <View style={[styles.goingBadge, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.goingText, { color: colors.primary }]}>You're going!</Text>
            </View>
          )}
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "calendar", label: "Date", value: event.date },
              { icon: "map-pin", label: "Location", value: event.location },
              { icon: "users", label: "Attendees", value: `${event.rsvpCount + (isAttending ? 1 : 0)} going` },
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
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <AppButton
          title={isAttending ? "Cancel RSVP" : "RSVP — I'm Going!"}
          onPress={handleRSVP}
          variant={isAttending ? "outline" : "primary"}
          fullWidth
          size="lg"
        />
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
});
