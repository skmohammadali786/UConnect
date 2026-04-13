import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";
import { useSocial } from "@/context/SocialContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

const ND = Platform.OS !== "web";


export default function UserProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: me } = useAuth();
  const { posts } = usePosts();
  const { toggleFollow, isFollowing } = useSocial();
  const { startConversation } = useChat();
  const { showSuccess } = useToast();
  const followAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const key = username?.toLowerCase() || "";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: ND }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!key) { setProfileLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", key)
          .maybeSingle();

        if (data) {
          setProfile({
            id: data.id,
            displayName: data.display_name || data.username,
            username: data.username,
            college: data.college || "",
            branch: data.branch || "",
            year: data.year || "",
            bio: data.bio || "",
            interests: data.interests || [],
            followers: data.followers_count ?? 0,
            following: data.following_count ?? 0,
            isVerified: false,
            avatar: data.avatar || null,
          });
        } else {
          setProfile({
            id: "user_" + key,
            displayName: username,
            username: key,
            college: "",
            branch: "",
            year: "",
            bio: "",
            interests: [],
            followers: 0,
            following: 0,
            isVerified: false,
          });
        }
      } catch {
        setProfile({
          id: "user_" + key,
          displayName: username,
          username: key,
          college: "",
          branch: "",
          year: "",
          bio: "",
          interests: [],
          followers: 0,
          following: 0,
          isVerified: false,
        });
      }
      setProfileLoading(false);
    })();
  }, [key]);

  const isMe = profile && (me?.id === profile.id || me?.username === key);
  const following = profile ? isFollowing(profile.id) : false;

  const userPosts = posts.filter((p) =>
    profile ? (p.authorId === profile.id || p.authorUsername === key) : false
  );

  const handleFollow = () => {
    if (!profile) return;
    Animated.sequence([
      Animated.spring(followAnim, { toValue: 0.88, tension: 250, friction: 6, useNativeDriver: ND }),
      Animated.spring(followAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: ND }),
    ]).start();
    toggleFollow(profile.id);
    showSuccess(following ? `Unfollowed @${key}` : `Now following @${key}!`);
  };

  const handleMessage = async () => {
    if (!profile) return;
    try {
      const convId = await startConversation(profile.id, profile.username, false);
      router.push({ pathname: "/chat/[id]" as any, params: { id: convId, username: profile.username } });
    } catch {}
  };

  if (profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>@{key}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) return null;

  const followerCount = profile.followers + (following ? 1 : 0);
  const initials = profile.displayName?.charAt(0)?.toUpperCase() || "U";

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <FlatList
        data={userPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} currentUserId={me?.id || ""} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>@{key}</Text>
              <View style={{ width: 38 }} />
            </View>

            <View style={{ backgroundColor: colors.card }}>
              <View style={[styles.cover, { backgroundColor: colors.primary + "15" }]} />

              <View style={styles.avatarRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.card, borderWidth: 4 }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
                <View style={styles.actionRow}>
                  {!isMe && (
                    <>
                      <TouchableOpacity
                        onPress={handleMessage}
                        style={[styles.messageBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Feather name="message-circle" size={15} color={colors.foreground} />
                        <Text style={[styles.messageBtnText, { color: colors.foreground }]}>Message</Text>
                      </TouchableOpacity>
                      <Animated.View style={{ transform: [{ scale: followAnim }] }}>
                        <TouchableOpacity
                          onPress={handleFollow}
                          style={[
                            styles.followBtn,
                            following
                              ? { backgroundColor: colors.secondary, borderColor: colors.border }
                              : { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                        >
                          <Feather name={following ? "user-check" : "user-plus"} size={14} color={following ? colors.foreground : "#FFF"} />
                          <Text style={[styles.followText, { color: following ? colors.foreground : "#FFF" }]}>
                            {following ? "Following" : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </>
                  )}
                  {isMe && (
                    <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.editBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <Feather name="edit-2" size={14} color={colors.foreground} />
                      <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.nameSection}>
                <View style={styles.nameRow}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{profile.displayName}</Text>
                  {profile.isVerified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.usernameText, { color: colors.mutedForeground }]}>@{profile.username}</Text>
                <View style={styles.metaRow}>
                  {profile.college ? (
                    <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
                      <Feather name="book" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{profile.college}</Text>
                    </View>
                  ) : null}
                  {profile.year ? (
                    <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
                      <Feather name="award" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{profile.year}</Text>
                    </View>
                  ) : null}
                </View>
                {profile.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text> : null}
              </View>

              <View style={[styles.statsRow, { borderColor: colors.border, marginHorizontal: 16, marginBottom: 16 }]}>
                {[
                  { num: userPosts.length, label: "Posts" },
                  { num: followerCount, label: "Followers" },
                  { num: profile.following, label: "Following" },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.label}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: colors.primary }]}>{s.num}</Text>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
                  </React.Fragment>
                ))}
              </View>

              {profile.interests?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
                  {profile.interests.map((i: string) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                      <Text style={[styles.chipText, { color: colors.primary }]}>{i}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.tabBtn, { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}>
                <Feather name="file-text" size={15} color={colors.primary} />
                <Text style={[styles.tabLabel, { color: colors.primary }]}>Posts ({userPosts.length})</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>This user hasn't posted anything publicly yet.</Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cover: { height: 80 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, marginTop: -32, marginBottom: 10 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 8, paddingBottom: 4, alignItems: "center" },
  messageBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  messageBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  followBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  followText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  editBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  nameSection: { paddingHorizontal: 16, gap: 5, marginBottom: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  usernameText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28 },
  interestsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 10, paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
