import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  organizer: string;
  college: string;
  rsvpCount: number;
  createdAt: string;
}

function rowToEvent(r: any): Event {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    date: r.date,
    organizer: r.organizer,
    college: r.college,
    rsvpCount: r.rsvp_count ?? 0,
    createdAt: r.created_at,
  };
}

function EventCard({ item, index, rsvpIds, onRSVP, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const isGoing = rsvpIds.has(item.id);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 65, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/events/[id]" as any, params: { id: item.id } })}
        style={[styles.card, { backgroundColor: colors.card, borderColor: isGoing ? colors.primary + "50" : colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.orgBadge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="calendar" size={13} color={colors.primary} />
            <Text style={[styles.orgText, { color: colors.primary }]} numberOfLines={1}>{item.organizer}</Text>
          </View>
          {isGoing && (
            <View style={[styles.goingBadge, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="check" size={10} color={colors.primary} />
              <Text style={[styles.goingText, { color: colors.primary }]}>Going</Text>
            </View>
          )}
        </View>
        <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
        {item.description ? (
          <Text style={[styles.eventDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.attendeeRow}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.attendeeText, { color: colors.mutedForeground }]}>{item.rsvpCount + (isGoing ? 1 : 0)} attending</Text>
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
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpIds, setRsvpIds] = useState<Set<string>>(new Set());
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

  const loadEvents = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setEvents(data.map(rowToEvent));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadRsvps = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", user.id);
      if (data) setRsvpIds(new Set(data.map((r: any) => r.event_id)));
    } catch {}
  }, [user?.id]);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { loadRsvps(); }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
    loadRsvps();
  };

  const handleRSVP = async (id: string) => {
    if (!user) return;
    const already = rsvpIds.has(id);
    const updated = new Set(rsvpIds);
    if (already) { updated.delete(id); } else { updated.add(id); }
    setRsvpIds(updated);

    if (already) {
      await supabase.rpc("unrsvp_event", { p_user_id: user.id, p_event_id: id });
    } else {
      await supabase.rpc("rsvp_event", { p_user_id: user.id, p_event_id: id });
      const event = events.find((e) => e.id === id);
      showSuccess("RSVP confirmed!", event?.title);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <TypewriterText text="Events" style={[styles.title, { color: colors.foreground }]} delay={300} speed={70} />
          {rsvpIds.size > 0 && <Text style={[styles.subtitle, { color: colors.primary }]}>{rsvpIds.size} attending</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push("/events/create")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <EventCard item={item} index={index} rsvpIds={rsvpIds} onRSVP={handleRSVP} colors={colors} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to create an event for your college!</Text>
              <TouchableOpacity onPress={() => router.push("/events/create")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.emptyBtnText}>Create Event</Text>
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  orgBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  orgText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  goingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  goingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  eventTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 23 },
  eventDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  eventMeta: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  attendeeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  attendeeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attendBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  attendBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
