import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/context/PostsContext";
import { useSocial } from "@/context/SocialContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useVaultSummary } from "@/hooks/useVault";
import {
  ProfileActionButton,
  ProfileHero,
  ProfileHeroIconButton,
  ProfileStatsCard,
  ProfileTabs,
  ProfileVaultSummary,
} from "@/components/profile";
import { DEFAULT_AURA_RING, normalizeAuraRingValue } from "@/utils/auraRing";

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
  const [activeTab, setActiveTab] = useState<"posts" | "reposts">("posts");
  const [repostRows, setRepostRows] = useState<
    { post_id: string; created_at: string }[]
  >([]);
  const { data: vaultSummary, refetch: refetchVaultSummary } = useVaultSummary(profile?.id);

  const key = username?.toLowerCase() || "";

  useFocusEffect(
    React.useCallback(() => {
      if (profile?.id) refetchVaultSummary();
    }, [profile?.id, refetchVaultSummary]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: ND,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 90,
        friction: 14,
        useNativeDriver: ND,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!key) {
      setProfileLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", key)
          .maybeSingle();

        if (data) {
          const { data: repostData } = await supabase
            .from("reposts")
            .select("post_id, created_at")
            .eq("user_id", data.id)
            .order("created_at", { ascending: false });

          setProfile({
            id: data.id,
            displayName: data.display_name || data.username,
            username: data.username,
            college: data.college || "",
            branch: data.branch || "",
            year: data.year || "",
            bio: data.bio || "",
            interests: data.interests || [],
            followers: data.followers ?? 0,
            following: data.following ?? 0,
            isVerified: Boolean(data.is_verified),
            avatar: data.avatar || null,
            avatarRingColor: normalizeAuraRingValue(data.avatar_ring_color || DEFAULT_AURA_RING),
            banner: data.banner || null,
            socialLink: data.social_link || "",
          });
          setRepostRows(
            (repostData ?? []) as { post_id: string; created_at: string }[],
          );
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
            avatarRingColor: DEFAULT_AURA_RING,
            banner: null,
            socialLink: "",
          });
          setRepostRows([]);
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
          avatarRingColor: DEFAULT_AURA_RING,
          banner: null,
          socialLink: "",
        });
        setRepostRows([]);
      }
      setProfileLoading(false);
    })();
  }, [key]);

  const isMe = profile && (me?.id === profile.id || me?.username === key);
  const following = profile ? isFollowing(profile.id) : false;

  const userPosts = posts.filter((p) =>
    profile ? p.authorId === profile.id || p.authorUsername === key : false,
  );

  const handleFollow = () => {
    if (!profile) return;
    Animated.sequence([
      Animated.spring(followAnim, {
        toValue: 0.88,
        tension: 250,
        friction: 6,
        useNativeDriver: ND,
      }),
      Animated.spring(followAnim, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: ND,
      }),
    ]).start();
    toggleFollow(profile.id);
    showSuccess(following ? `Unfollowed @${key}` : `Now following @${key}!`);
  };

  const handleMessage = async () => {
    if (!profile) return;
    try {
      const convId = await startConversation(
        profile.id,
        profile.username,
        false,
        {
          username: profile.username,
          avatar: profile.avatar ?? null,
          isVerified: Boolean(profile.isVerified),
        },
      );
      router.push({
        pathname: "/chat/[id]" as any,
        params: {
          id: convId,
          participantId: profile.id,
          username: profile.username,
        },
      });
    } catch {}
  };

  const openConnections = (mode: "followers" | "following") => {
    if (!profile) return;
    router.push({
      pathname: "/connections",
      params: { userId: profile.id, mode, username: profile.username },
    });
  };

  if (profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
              backgroundColor: colors.headerBg,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            @{key}
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) return null;

  const followerCount = profile.followers ?? 0;
  const postsById = new Map(posts.map((p) => [p.id, p]));
  const repostedPosts = repostRows
    .map((r) => {
      const original = postsById.get(r.post_id);
      if (!original) return null;
      return {
        ...original,
        repostedByUsername: profile.username,
        repostedAt: r.created_at,
      };
    })
    .filter(Boolean) as typeof posts;
  const listData = activeTab === "posts" ? userPosts : repostedPosts;
  return (
    <Animated.View
  style={[
    { flex: 1, backgroundColor: colors.background },
    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
  ]}
>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} currentUserId={me?.id || ""} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <ProfileHero
              profile={profile}
              colors={colors}
              topInset={Platform.OS === "web" ? 16 : insets.top}
              leftControl={
                <ProfileHeroIconButton onPress={() => router.back()} colors={colors}>
                  <Feather name="arrow-left" size={22} color={colors.foreground} />
                </ProfileHeroIconButton>
              }
              title={<Text style={[styles.heroTitle, { color: "#FFF" }]}>@{key}</Text>}
              rightControls={
                <ProfileHeroIconButton colors={colors}>
                  <Feather name="more-horizontal" size={22} color={colors.foreground} />
                </ProfileHeroIconButton>
              }
              actions={
                isMe ? (
                  <ProfileActionButton
                    icon="edit-2"
                    variant="outline"
                    label="Edit Profile"
                    colors={colors}
                    onPress={() => router.push("/edit-profile")}
                  />
                ) : (
                  <>
                    <ProfileActionButton
                      icon="message-circle"
                      variant="soft"
                      label="Message"
                      colors={colors}
                      onPress={handleMessage}
                    />
                    <Animated.View style={{ transform: [{ scale: followAnim }] }}>
                      <ProfileActionButton
                        icon={following ? "user-check" : "user-plus"}
                        variant={following ? "outline" : "primary"}
                        label={following ? "Following" : "Follow"}
                        colors={colors}
                        onPress={handleFollow}
                      />
                    </Animated.View>
                  </>
                )
              }
              onQrPress={() =>
                router.push({
                  pathname: "/scan-connect",
                  params: { username: profile.username, allowScan: isMe ? "1" : "0" },
                })
              }
            />

            <ProfileStatsCard
              colors={colors}
              attachedTile={{ label: "Vault Score", value: vaultSummary?.score ?? 0, icon: "award" }}
              items={[
                { label: "Posts", value: userPosts.length },
                { label: "Followers", value: followerCount, onPress: () => openConnections("followers") },
                { label: "Following", value: profile.following, onPress: () => openConnections("following") },
                { label: "Skill Strength", value: `${vaultSummary?.skillStrength ?? 0}%` },
              ]}
            />

            <ProfileVaultSummary summary={vaultSummary} colors={colors} mode="compact" />

            {profile.interests?.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsRow}>
                {profile.interests.map((interest: string) => (
                  <View key={interest} style={[styles.chip, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>  
                    <Text style={[styles.chipText, { color: colors.primary }]}>{interest}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <ProfileTabs
              items={[
                { key: "posts", icon: "file-text", label: "Posts", count: userPosts.length },
                { key: "reposts", icon: "repeat", label: "Reposts", count: repostedPosts.length },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
              colors={colors}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name={activeTab === "posts" ? "file-text" : "repeat"}
              size={32}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTab === "posts" ? "No posts yet" : "No reposts yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {activeTab === "posts"
                ? "This user hasn't posted anything publicly yet."
                : "This user hasn't reposted any posts yet."}
            </Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.28)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cover: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, aspectRatio: 16 / 7 },
  coverOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 14,
    aspectRatio: 16 / 7,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  coverAccent: {
    position: "absolute",
    right: 24,
    top: 20,
    width: 90,
    height: 90,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: -28,
    marginBottom: 10,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 4 },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    alignItems: "center",
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  messageBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  followText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  nameSection: { paddingHorizontal: 16, gap: 5, marginBottom: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  qrBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  usernameText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  socialLinkBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 3,
  },
  socialLinkText: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 190 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28 },
  vaultMiniCard: { marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  vaultMiniKicker: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.6 },
  vaultMiniTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  vaultMiniStats: { flexDirection: "row", justifyContent: "space-between" },
  vaultMiniNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  vaultMiniLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  interestsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
  },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
