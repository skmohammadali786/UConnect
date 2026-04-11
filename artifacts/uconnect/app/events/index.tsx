import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Event {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  time: string;
  organizer: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  isPaid: boolean;
  price?: string;
}

const EVENTS: Event[] = [
  { id: "e1", title: "Rendezvous 2025 - Cultural Fest", category: "Cultural", location: "IIT Delhi Campus", date: "Nov 22-24", time: "10:00 AM", organizer: "IIT Delhi", attendees: 2400, maxAttendees: 5000, isAttending: false, isPaid: false },
  { id: "e2", title: "HackIIIT Hackathon", category: "Tech", location: "Online + IIIT Delhi", date: "Dec 1-2", time: "9:00 AM", organizer: "IIIT Delhi CSE", attendees: 180, maxAttendees: 200, isAttending: true, isPaid: false },
  { id: "e3", title: "Finance & Markets Summit", category: "Finance", location: "LH3 Auditorium", date: "Nov 28", time: "2:00 PM", organizer: "Finance Club", attendees: 120, maxAttendees: 150, isAttending: false, isPaid: true, price: "₹200" },
  { id: "e4", title: "Open Mic Night", category: "Cultural", location: "SAC Lawns", date: "Nov 18", time: "7:00 PM", organizer: "Arts Council", attendees: 89, maxAttendees: 200, isAttending: false, isPaid: false },
  { id: "e5", title: "Machine Learning Workshop", category: "Tech", location: "Bharti 101", date: "Nov 20", time: "11:00 AM", organizer: "ML Club", attendees: 45, maxAttendees: 60, isAttending: true, isPaid: false },
];

const CATEGORIES = ["All", "Tech", "Cultural", "Sports", "Finance", "Academic"];

const CAT_COLORS: Record<string, string> = {
  Tech: "#3B82F6", Cultural: "#8B5CF6", Sports: "#F59E0B", Finance: "#00A86B", Academic: "#06B6D4",
};

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const [events, setEvents] = useState(EVENTS);

  const filtered = events.filter((e) => activeCategory === "All" || e.category === activeCategory);

  const toggleAttend = (id: string) => {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, isAttending: !e.isAttending, attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1 } : e));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Events</Text>
        <TouchableOpacity onPress={() => router.push("/events/create")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setActiveCategory(c)} style={[styles.filterChip, { backgroundColor: activeCategory === c ? colors.primary : colors.card, borderColor: activeCategory === c ? colors.primary : colors.border }]}>
                <Text style={[styles.filterText, { color: activeCategory === c ? "#FFF" : colors.foreground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/events/[id]" as any, params: { id: item.id } })} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[item.category] || "#6B7280") + "20" }]}>
                <Text style={[styles.catText, { color: CAT_COLORS[item.category] || "#6B7280" }]}>{item.category}</Text>
              </View>
              {item.isPaid && (
                <View style={[styles.paidBadge, { backgroundColor: colors.warning + "20" }]}>
                  <Text style={[styles.paidText, { color: colors.warning }]}>{item.price}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.attendeeRow}>
                <Feather name="users" size={13} color={colors.mutedForeground} />
                <Text style={[styles.attendeeText, { color: colors.mutedForeground }]}>{item.attendees}/{item.maxAttendees}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleAttend(item.id)}
                style={[styles.attendBtn, { backgroundColor: item.isAttending ? colors.primary : "transparent", borderColor: item.isAttending ? colors.primary : colors.border }]}
              >
                <Text style={[styles.attendBtnText, { color: item.isAttending ? "#FFF" : colors.foreground }]}>
                  {item.isAttending ? "Going" : "Attend"}
                </Text>
              </TouchableOpacity>
            </View>
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
  cardHeader: { flexDirection: "row", gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  paidBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paidText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  eventTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 23 },
  eventMeta: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  attendeeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  attendeeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attendBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  attendBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
