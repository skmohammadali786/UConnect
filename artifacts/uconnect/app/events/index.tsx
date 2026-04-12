import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  isPaid: boolean;
  price?: string;
}

const INITIAL_EVENTS: Event[] = [
  { id: "e1", title: "Rendezvous 2025 - Cultural Fest", category: "Cultural", location: "IIT Delhi Campus", date: "Nov 22-24", time: "10:00 AM", organizer: "IIT Delhi", attendees: 2400, maxAttendees: 5000, isPaid: false },
  { id: "e2", title: "HackIIIT Hackathon", category: "Tech", location: "Online + IIIT Delhi", date: "Dec 1-2", time: "9:00 AM", organizer: "IIIT Delhi CSE", attendees: 180, maxAttendees: 200, isPaid: false },
  { id: "e3", title: "Finance & Markets Summit", category: "Finance", location: "LH3 Auditorium", date: "Nov 28", time: "2:00 PM", organizer: "Finance Club", attendees: 120, maxAttendees: 150, isPaid: true, price: "₹200" },
  { id: "e4", title: "Open Mic Night", category: "Cultural", location: "SAC Lawns", date: "Nov 18", time: "7:00 PM", organizer: "Arts Council", attendees: 89, maxAttendees: 200, isPaid: false },
  { id: "e5", title: "Machine Learning Workshop", category: "Tech", location: "Bharti 101", date: "Nov 20", time: "11:00 AM", organizer: "ML Club", attendees: 45, maxAttendees: 60, isPaid: false },
];

const CATEGORIES = ["All", "Tech", "Cultural", "Sports", "Finance", "Academic"];
const CAT_COLORS: Record<string, string> = { Tech: "#3B82F6", Cultural: "#8B5CF6", Sports: "#F59E0B", Finance: "#00A86B", Academic: "#06B6D4" };

function EventCard({ item, index, rsvpIds, onRSVP, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const isGoing = rsvpIds.has(item.id);
  const catColor = CAT_COLORS[item.category] || "#6B7280";

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 65, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity onPress={() => router.push({ pathname: "/events/[id]" as any, params: { id: item.id } })} style={[styles.card, { backgroundColor: colors.card, borderColor: isGoing ? colors.primary + "50" : colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.catBadge, { backgroundColor: catColor + "20" }]}>
            <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
          </View>
          {item.isPaid && (
            <View style={[styles.paidBadge, { backgroundColor: "#F59E0B20" }]}>
              <Text style={[styles.paidText, { color: "#F59E0B" }]}>{item.price}</Text>
            </View>
          )}
          {isGoing && (
            <View style={[styles.goingBadge, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="check" size={10} color={colors.primary} />
              <Text style={[styles.goingText, { color: colors.primary }]}>Going</Text>
            </View>
          )}
        </View>
        <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}><Feather name="calendar" size={13} color={colors.mutedForeground} /><Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.date}</Text></View>
          <View style={styles.metaItem}><Feather name="clock" size={13} color={colors.mutedForeground} /><Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.time}</Text></View>
          <View style={styles.metaItem}><Feather name="map-pin" size={13} color={colors.mutedForeground} /><Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text></View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.attendeeRow}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.attendeeText, { color: colors.mutedForeground }]}>{item.attendees + (isGoing ? 1 : 0)}/{item.maxAttendees}</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onRSVP(item.id); }}
            style={[styles.attendBtn, { backgroundColor: isGoing ? colors.primary : "transparent", borderColor: isGoing ? colors.primary : colors.border }]}
          >
            <Text style={[styles.attendBtnText, { color: isGoing ? "#FFF" : colors.foreground }]}>{isGoing ? "Going" : "Attend"}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [rsvpIds, setRsvpIds] = useState<Set<string>>(new Set());
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user || user.id === "demo_user_001") return;
    (async () => {
      try {
        const { data } = await supabase
          .from("event_rsvps")
          .select("event_id")
          .eq("user_id", user.id);
        if (data) setRsvpIds(new Set(data.map((r: any) => r.event_id)));
      } catch {}
    })();
  }, [user?.id]);

  const handleRSVP = async (id: string) => {
    const already = rsvpIds.has(id);
    const updated = new Set(rsvpIds);
    if (already) { updated.delete(id); } else { updated.add(id); }
    setRsvpIds(updated);
    if (user && user.id !== "demo_user_001") {
      if (already) {
        await supabase.rpc("unrsvp_event", { p_user_id: user.id, p_event_id: id });
      } else {
        await supabase.rpc("rsvp_event", { p_user_id: user.id, p_event_id: id });
      }
    }
    const event = INITIAL_EVENTS.find((e) => e.id === id);
    if (!already) showSuccess(`RSVP confirmed!`, event?.title);
  };

  const filtered = INITIAL_EVENTS.filter((e) => activeCategory === "All" || e.category === activeCategory);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <TypewriterText
            text="Events"
            style={[styles.title, { color: colors.foreground }]}
            delay={300}
            speed={70}
          />
          {rsvpIds.size > 0 && <Text style={[styles.subtitle, { color: colors.primary }]}>{rsvpIds.size} attending</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push("/events/create")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>
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
        renderItem={({ item, index }) => <EventCard item={item} index={index} rsvpIds={rsvpIds} onRSVP={handleRSVP} colors={colors} />}
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
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  paidBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paidText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  goingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  goingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
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
