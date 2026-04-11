import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

const EVENT_DATA: Record<string, any> = {
  e1: { id: "e1", title: "Rendezvous 2025 - Cultural Fest", category: "Cultural", location: "IIT Delhi Campus", date: "Nov 22-24, 2025", time: "10:00 AM", organizer: "IIT Delhi SAC", attendees: 2400, description: "Asia's largest cultural extravaganza returns with 3 days of music, dance, drama, and competitions. This year's lineup includes international headliners, celebrity performances, and a grand DJ night.", highlights: ["DJ Night with international DJs", "Celebrity performances", "10+ competitive events", "₹10L+ prize pool", "Food stalls and exhibitions"] },
};

export default function EventDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENT_DATA[id] || EVENT_DATA["e1"];
  const [isAttending, setIsAttending] = useState(false);

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
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.eventIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="calendar" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text>
          <Text style={[styles.organizer, { color: colors.mutedForeground }]}>by {event.organizer}</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "calendar", label: "Date", value: event.date },
            { icon: "clock", label: "Time", value: event.time },
            { icon: "map-pin", label: "Location", value: event.location },
            { icon: "users", label: "Attendees", value: `${event.attendees} going` },
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
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Highlights</Text>
          {(event.highlights as string[]).map((h, i) => (
            <View key={i} style={styles.highlight}>
              <Feather name="star" size={14} color={colors.primary} />
              <Text style={[styles.highlightText, { color: colors.foreground }]}>{h}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <AppButton
          title={isAttending ? "Cancel RSVP" : "RSVP - I'm Going!"}
          onPress={() => setIsAttending((v) => !v)}
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
