import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { safeInsertNotification } from "@/utils/notifications";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { uploadMediaUriToR2 } from "@/utils/r2Upload";
import { formatRelativeTime } from "@/utils/time";
const TYPE_COLORS: Record<string, string> = {
  Hackathon: "#3B82F6",
  Startup: "#00A86B",
  Research: "#8B5CF6",
  Competition: "#F59E0B",
  Project: "#06B6D4",
  Other: "#6B7280",
};

const ND = Platform.OS !== "web";

function JoinModal({ visible, onClose, onSubmit, colors }: any) {
  const [message, setMessage] = useState("");
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: ND }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: ND }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 160, useNativeDriver: ND }),
        Animated.timing(slideAnim, { toValue: 400, duration: 160, useNativeDriver: ND }),
      ]).start();
      setMessage("");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKeyboardWrap}
      >
        <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="user-plus" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request to Join</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Tell the admin why you'd be a great fit</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.secondary }]}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="I'm interested because..."
              placeholderTextColor={colors.placeholder}
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={onClose} style={[styles.modalCancelBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onSubmit(message || "I'd love to join your team!"); }}
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="send" size={15} color="#FFF" />
                <Text style={styles.modalSubmitText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type TeamFeedItem =
  | {
      type: "post";
      id: string;
      content: string;
      mediaUrls: string[];
      createdAt: string;
      authorName: string;
      authorAvatar: string | null;
    }
  | {
      type: "poll";
      id: string;
      question: string;
      options: string[];
      counts: number[];
      userVoteIndex: number | null;
      createdAt: string;
    }
  | {
      type: "task";
      id: string;
      title: string;
      items: { id: string; title: string; isCompleted: boolean; completedBy: string | null }[];
      createdAt: string;
    }
  | {
      type: "event";
      id: string;
      title: string;
      description: string;
      eventDate: string;
      location: string;
      createdAt: string;
    };

export default function TeamDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, tab, itemType, itemId } = useLocalSearchParams<{ id: string; tab?: string; itemType?: string; itemId?: string }>();
  const { user } = useAuth();
  const { teams, requestJoin, cancelRequest, approveRequest, denyRequest, getMembership, isTeamAdmin, refreshTeamsAndMemberships } = useTeams();
  const { showSuccess, showError, showInfo } = useToast();
  const [requested, setRequested] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "details" | "requests">("details");
  const [feedItems, setFeedItems] = useState<TeamFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [pollSubscriptionIds, setPollSubscriptionIds] = useState<string[]>([]);
  const [taskListSubscriptionIds, setTaskListSubscriptionIds] = useState<string[]>([]);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [postMediaMeta, setPostMediaMeta] = useState<{ fileType?: string; fileName?: string } | null>(null);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskItems, setTaskItems] = useState<string[]>([""]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const team = teams.find((t) => t.id === id);
  const membership = team && user ? getMembership(team.id) : null;
  const isAdmin = team && user ? isTeamAdmin(team.id) : false;
  const isMember = Boolean(team && user && (isAdmin || membership));
  const lastTeamIdRef = useRef<string | null>(null);
  const highlightedFeedItemId = typeof itemId === "string" && typeof itemType === "string" ? itemId : undefined;

  useEffect(() => {
    refreshTeamsAndMemberships();
  }, [refreshTeamsAndMemberships]);

  useEffect(() => {
    if (team && user) {
      const hasRequested = team.requests.some((r) => r.userId === user.id && r.status === "pending");
      setRequested(hasRequested);
    }
  }, [team, user?.id]);

  useEffect(() => {
    if (!team) return;
    const isNewTeam = lastTeamIdRef.current !== team.id;
    if (isNewTeam) {
      lastTeamIdRef.current = team.id;
      setActiveTab(tab === "feed" ? "feed" : isMember ? "feed" : "details");
      return;
    }
    if (!isMember) {
      setActiveTab("details");
    }
  }, [team?.id, isMember, tab]);

  useEffect(() => {
    if (!team) {
      lastTeamIdRef.current = null;
    }
  }, [team?.id]);

  if (!team) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Team not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.primary }]}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[team.type] || "#6B7280";
  const spotsLeft = team.maxMembers - team.members;
  const pendingRequests = team.requests.filter((r) => r.status === "pending");
  const approvedRequests = team.requests.filter((r) => r.status === "approved");

  const handleJoinRequest = async (message: string) => {
    if (!user) { showInfo("Sign in required"); return; }
    setJoinVisible(false);
    try {
      await requestJoin(team.id, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        college: user.college,
        message,
      });
      setRequested(true);
      showSuccess("Request sent!", "The admin will review your request soon.");
    } catch {
      setRequested(false);
      showError("Request failed", "Please try again.");
    }
  };
  const handleCancel = async () => {
    if (!user) return;
    try {
      await cancelRequest(team.id, user.id);
      setRequested(false);
      showInfo("Request cancelled");
    } catch {
      showError("Cancel failed", "Please try again.");
    }
  };

  const handleApprove = async (userId: string, displayName: string) => {
    try {
      await approveRequest(team.id, userId);
      showSuccess(`Approved ${displayName}`, "They can now join your team!");
    } catch {
      showError("Approve failed", "Please try again.");
    }
  };

  const handleDeny = async (userId: string, displayName: string) => {
    try {
      await denyRequest(team.id, userId);
      showInfo(`Request from ${displayName} denied`);
    } catch {
      showError("Deny failed", "Please try again.");
    }
  };

  const viewProfile = (username: string) => {
    router.push({ pathname: "/user/[username]" as any, params: { username } });
  };

  const loadFeed = useCallback(async () => {
    if (!team) {
      setFeedItems([]);
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    try {
      const [postRes, pollRes, taskListRes, eventRes] = await Promise.all([
        supabase.from("team_posts").select("*").eq("team_id", team.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("team_polls").select("*").eq("team_id", team.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("team_task_lists").select("*").eq("team_id", team.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("team_events").select("*").eq("team_id", team.id).order("created_at", { ascending: false }).limit(30),
      ]);

      const taskLists = (taskListRes.data ?? []) as any[];
      const taskListIds = taskLists.map((t) => t.id);
      setTaskListSubscriptionIds(taskListIds);
      const taskItemsRes = taskListIds.length > 0
        ? await supabase.from("team_task_items").select("*").in("task_list_id", taskListIds)
        : { data: [] as any[] };

      const polls = (pollRes.data ?? []) as any[];
      const pollIds = polls.map((p) => p.id);
      setPollSubscriptionIds(pollIds);
      const pollVotesRes = pollIds.length > 0
        ? await supabase.from("team_poll_votes").select("poll_id,option_index,user_id").in("poll_id", pollIds)
        : { data: [] as any[] };

      const pollVoteMap = new Map<string, { counts: number[]; userVoteIndex: number | null }>();
      polls.forEach((p) => {
        pollVoteMap.set(p.id, { counts: new Array((p.options ?? []).length).fill(0), userVoteIndex: null });
      });
      (pollVotesRes.data ?? []).forEach((vote: any) => {
        const poll = pollVoteMap.get(vote.poll_id);
        if (!poll) return;
        if (poll.counts[vote.option_index] !== undefined) {
          poll.counts[vote.option_index] += 1;
        }
        if (user && vote.user_id === user.id) {
          poll.userVoteIndex = vote.option_index;
        }
      });

      const items: TeamFeedItem[] = [];
      (postRes.data ?? []).forEach((row: any) => {
        items.push({
          type: "post",
          id: row.id,
          content: row.content ?? "",
          mediaUrls: row.media_urls ?? [],
          createdAt: row.created_at,
          authorName: row.author_username ?? "Admin",
          authorAvatar: row.author_avatar ?? null,
        });
      });
      polls.forEach((row: any) => {
        const voteInfo = pollVoteMap.get(row.id);
        items.push({
          type: "poll",
          id: row.id,
          question: row.question,
          options: row.options ?? [],
          counts: voteInfo?.counts ?? [],
          userVoteIndex: voteInfo?.userVoteIndex ?? null,
          createdAt: row.created_at,
        });
      });
      const taskItemsByList = new Map<string, any[]>();
      (taskItemsRes.data ?? []).forEach((row: any) => {
        if (!taskItemsByList.has(row.task_list_id)) taskItemsByList.set(row.task_list_id, []);
        taskItemsByList.get(row.task_list_id)!.push(row);
      });
      taskLists.forEach((row: any) => {
        const itemsList = (taskItemsByList.get(row.id) ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          isCompleted: Boolean(i.is_completed),
          completedBy: i.completed_by ?? null,
        }));
        items.push({
          type: "task",
          id: row.id,
          title: row.title,
          items: itemsList,
          createdAt: row.created_at,
        });
      });
      (eventRes.data ?? []).forEach((row: any) => {
        items.push({
          type: "event",
          id: row.id,
          title: row.title,
          description: row.description ?? "",
          eventDate: row.event_date ?? "TBD",
          location: row.location ?? "TBD",
          createdAt: row.created_at,
        });
      });

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFeedItems(items);
    } catch {
      setFeedItems([]);
    }
    setFeedLoading(false);
  }, [team?.id, user?.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!team?.id) return;
    let channel = supabase
      .channel(`team-feed-${team.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_posts", filter: `team_id=eq.${team.id}` }, () => loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_polls", filter: `team_id=eq.${team.id}` }, () => loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_task_lists", filter: `team_id=eq.${team.id}` }, () => loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_events", filter: `team_id=eq.${team.id}` }, () => loadFeed());

    pollSubscriptionIds.forEach((pollId) => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "team_poll_votes", filter: `poll_id=eq.${pollId}` }, () => loadFeed());
    });
    taskListSubscriptionIds.forEach((taskListId) => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "team_task_items", filter: `task_list_id=eq.${taskListId}` }, () => loadFeed());
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [team?.id, pollSubscriptionIds.join(","), taskListSubscriptionIds.join(","), loadFeed]);

  const notifyTeamMembers = useCallback(async (feedItem: { id: string; type: "post" | "poll" | "task" | "event"; title: string; body: string }) => {
    if (!user || !team) return;
    try {
      const { data: memberRows } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id)
        .neq("user_id", user.id);
      const recipientIds = Array.from(new Set((memberRows ?? []).map((row: any) => row.user_id).filter(Boolean)));
      await Promise.all(recipientIds.map((recipientId) => safeInsertNotification({
        user_id: recipientId,
        type: "team",
        title: feedItem.title,
        body: feedItem.body,
        action_id: team.id,
        action_type: "team",
        redirect_path: `/teams/${team.id}?tab=feed&itemType=${feedItem.type}&itemId=${feedItem.id}`,
        entity_type: "team",
        entity_id: team.id,
        secondary_entity_type: `team_${feedItem.type}`,
        secondary_entity_id: feedItem.id,
        metadata: { teamId: team.id, teamTitle: team.title, feedItemType: feedItem.type, feedItemId: feedItem.id },
      })));
    } catch (error) {
      console.warn("Failed to notify team members:", error);
    }
  }, [team?.id, team?.title, user?.id]);

  const handlePickMedia = async () => {
    if (Platform.OS === "web") {
      showInfo("Photo upload", "Photo picking works best on the mobile app.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Permission denied", "Allow photo access in Settings.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPostMedia(asset.uri);
        setPostMediaMeta({ fileType: asset.mimeType ?? undefined, fileName: asset.fileName ?? undefined });
      }
    } catch {
      showError("Failed", "Could not pick photo. Try again.");
    }
  };

  const handleCreatePost = async () => {
    if (!user || !team || !isAdmin || isPostingUpdate) return;
    if (!postContent.trim() && !postMedia) {
      showInfo("Add content", "Write a message or attach an image.");
      return;
    }
    setIsPostingUpdate(true);
    try {
      let mediaUrls: string[] = [];
      if (postMedia) {
        const uploaded = await uploadMediaUriToR2(postMedia, { fileType: postMediaMeta?.fileType, kind: "image" });
        if (!uploaded.publicUrl) {
          throw new Error("Cloudflare R2 upload did not return a public URL");
        }
        mediaUrls = [uploaded.publicUrl];
      }
      const { data: postRow, error } = await supabase.from("team_posts").insert({
        team_id: team.id,
        author_id: user.id,
        author_username: user.username,
        author_avatar: user.avatar ?? null,
        content: postContent.trim(),
        media_urls: mediaUrls,
      }).select("id").single();
      if (error) throw error;
      if (postRow?.id) {
        await notifyTeamMembers({
          id: postRow.id,
          type: "post",
          title: `New update in ${team.title}`,
          body: postContent.trim() || "Admin shared a new photo update.",
        });
      }
      setPostContent("");
      setPostMedia(null);
      setPostMediaMeta(null);
      showSuccess("Posted to team feed!");
      loadFeed();
    } catch (error) {
      console.error("Failed to create team feed post", error);
      showError("Post failed", error instanceof Error ? error.message : "Try again in a moment.");
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!user || !team || !isAdmin) return;
    const question = pollQuestion.trim();
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      showInfo("Add at least 2 options", "Polls need a question and two options.");
      return;
    }
    try {
      const { data: pollRow, error } = await supabase.from("team_polls").insert({
        team_id: team.id,
        question,
        options,
        created_by: user.id,
      }).select("id").single();
      if (error) throw error;
      if (pollRow?.id) {
        await notifyTeamMembers({
          id: pollRow.id,
          type: "poll",
          title: `New poll in ${team.title}`,
          body: question,
        });
      }
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollModalVisible(false);
      showSuccess("Poll posted!");
      loadFeed();
    } catch {
      showError("Poll failed", "Try again.");
    }
  };

  const handleCreateTask = async () => {
    if (!user || !team || !isAdmin) return;
    const title = taskTitle.trim();
    const items = taskItems.map((i) => i.trim()).filter(Boolean);
    if (!title || items.length === 0) {
      showInfo("Add tasks", "Give the list a title and at least one task.");
      return;
    }
    try {
      const { data: listRow, error } = await supabase
        .from("team_task_lists")
        .insert({ team_id: team.id, title, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      const { error: itemsError } = await supabase.from("team_task_items").insert(items.map((item) => ({ task_list_id: listRow.id, title: item })));
      if (itemsError) throw itemsError;
      if (listRow?.id) {
        await notifyTeamMembers({
          id: listRow.id,
          type: "task",
          title: `New tasks in ${team.title}`,
          body: title,
        });
      }
      setTaskTitle("");
      setTaskItems([""]);
      setTaskModalVisible(false);
      showSuccess("Task list posted!");
      loadFeed();
    } catch {
      showError("Task failed", "Try again.");
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !team || !isAdmin) return;
    const title = eventTitle.trim();
    if (!title) {
      showInfo("Event title needed");
      return;
    }
    try {
      const { data: eventRow, error } = await supabase.from("team_events").insert({
        team_id: team.id,
        title,
        description: eventDescription.trim() || title,
        event_date: eventDate.trim() || "TBD",
        location: eventLocation.trim() || "TBD",
        created_by: user.id,
      }).select("id").single();
      if (error) throw error;
      if (eventRow?.id) {
        await notifyTeamMembers({
          id: eventRow.id,
          type: "event",
          title: `New event in ${team.title}`,
          body: title,
        });
      }
      setEventTitle("");
      setEventDate("");
      setEventLocation("");
      setEventDescription("");
      setEventModalVisible(false);
      showSuccess("Event scheduled!");
      loadFeed();
    } catch {
      showError("Event failed", "Try again.");
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    if (!user || !team || !isMember) {
      showInfo("Sign in required");
      return;
    }
    const currentPoll = feedItems.find((item) => item.type === "poll" && item.id === pollId);
    if (!currentPoll || currentPoll.type !== "poll") return;
    if (optionIndex < 0 || optionIndex >= currentPoll.options.length) return;
    if (currentPoll.userVoteIndex === optionIndex) return;
    try {
      const { error } = await supabase.from("team_poll_votes").upsert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      }, { onConflict: "poll_id,user_id" });
      if (error) throw error;
      setFeedItems((prev) =>
        prev.map((item) => {
          if (item.type !== "poll" || item.id !== pollId) return item;
          const counts = [...item.counts];
          if (item.userVoteIndex !== null && counts[item.userVoteIndex] !== undefined) {
            counts[item.userVoteIndex] = Math.max(0, counts[item.userVoteIndex] - 1);
          }
          if (counts[optionIndex] !== undefined) counts[optionIndex] += 1;
          return { ...item, counts, userVoteIndex: optionIndex };
        }),
      );
    } catch {
      showError("Vote failed", "Try again.");
    }
  };

  const handleToggleTaskItem = async (listId: string, itemId: string) => {
    if (!user || !team || !isMember) return;
    const targetList = feedItems.find((item) => item.type === "task" && item.id === listId) as TeamFeedItem | undefined;
    if (!targetList || targetList.type !== "task") return;
    const targetItem = targetList.items.find((i) => i.id === itemId);
    if (!targetItem) return;
    const next = !targetItem.isCompleted;
    try {
      const { error } = await supabase.from("team_task_items").update({
        is_completed: next,
        completed_by: next ? user.id : null,
        completed_at: next ? new Date().toISOString() : null,
      }).eq("id", itemId);
      if (error) throw error;
      setFeedItems((prev) =>
        prev.map((item) => {
          if (item.type !== "task" || item.id !== listId) return item;
          return {
            ...item,
            items: item.items.map((i) => i.id === itemId ? { ...i, isCompleted: next, completedBy: next ? user.id : null } : i),
          };
        }),
      );
    } catch {
      showError("Update failed", "Try again.");
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  };

  const addPollOption = () => {
    setPollOptions((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  };

  const updateTaskItem = (index: number, value: string) => {
    setTaskItems((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addTaskItem = () => {
    setTaskItems((prev) => (prev.length >= 6 ? prev : [...prev, ""]));
  };

  const renderFeedItem = (item: TeamFeedItem) => {
    if (item.type === "post") {
      return (
        <View key={`post-${item.id}`} style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }, highlightedFeedItemId === item.id && { borderColor: colors.primary, borderWidth: 2 }]}>
          <View style={styles.feedHeaderRow}>
            {item.authorAvatar ? (
              <Image source={{ uri: item.authorAvatar }} style={styles.feedAvatarImg} />
            ) : (
              <View style={[styles.feedAvatarFallback, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.feedAvatarLetter, { color: colors.primary }]}>{item.authorName[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.feedAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
              <Text style={[styles.feedTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.feedBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Feather name="shield" size={12} color={colors.primary} />
              <Text style={[styles.feedBadgeText, { color: colors.primary }]}>Admin</Text>
            </View>
          </View>
          {item.content ? (
            <Text style={[styles.feedContent, { color: colors.foreground }]}>{item.content}</Text>
          ) : null}
          {item.mediaUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {item.mediaUrls.map((uri) => (
                <View key={uri} style={[styles.feedMediaWrap, { backgroundColor: colors.secondary }]}>
                  <Image source={{ uri }} style={styles.feedMedia} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      );
    }
    if (item.type === "poll") {
      return (
        <View key={`poll-${item.id}`} style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }, highlightedFeedItemId === item.id && { borderColor: colors.primary, borderWidth: 2 }]}>
          <View style={styles.feedHeaderRow}>
            <View style={[styles.feedIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="bar-chart-2" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feedTitle, { color: colors.foreground }]}>Poll</Text>
              <Text style={[styles.feedTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={[styles.feedQuestion, { color: colors.foreground }]}>{item.question}</Text>
          <View style={styles.pollOptions}>
            {item.options.map((opt, idx) => {
              const count = item.counts[idx] ?? 0;
              const isSelected = item.userVoteIndex === idx;
              return (
                <TouchableOpacity
                  key={`${item.id}-${idx}`}
                  onPress={() => handleVotePoll(item.id, idx)}
                  style={[
                    styles.pollOption,
                    {
                      backgroundColor: isSelected ? colors.primary + "20" : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.pollOptionText, { color: colors.foreground }]}>{opt}</Text>
                  <Text style={[styles.pollCount, { color: colors.mutedForeground }]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    if (item.type === "task") {
      return (
        <View key={`task-${item.id}`} style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }, highlightedFeedItemId === item.id && { borderColor: colors.primary, borderWidth: 2 }]}>
          <View style={styles.feedHeaderRow}>
            <View style={[styles.feedIcon, { backgroundColor: "#00A86B20" }]}>
              <Feather name="check-square" size={16} color="#00A86B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feedTitle, { color: colors.foreground }]}>Tasks</Text>
              <Text style={[styles.feedTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={[styles.feedQuestion, { color: colors.foreground }]}>{item.title}</Text>
          <View style={styles.taskList}>
            {item.items.map((task) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => handleToggleTaskItem(item.id, task.id)}
                style={[styles.taskRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View style={[styles.taskCheck, { backgroundColor: task.isCompleted ? "#00A86B" : "transparent", borderColor: task.isCompleted ? "#00A86B" : colors.border }]}>
                  {task.isCompleted && <Feather name="check" size={12} color="#FFF" />}
                </View>
                <Text style={[styles.taskText, { color: colors.foreground }, task.isCompleted && styles.taskTextDone]}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    return (
      <View key={`event-${item.id}`} style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }, highlightedFeedItemId === item.id && { borderColor: colors.primary, borderWidth: 2 }]}>
        <View style={styles.feedHeaderRow}>
          <View style={[styles.feedIcon, { backgroundColor: "#F59E0B20" }]}>
            <Feather name="calendar" size={16} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.feedTitle, { color: colors.foreground }]}>Event</Text>
            <Text style={[styles.feedTime, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={[styles.feedQuestion, { color: colors.foreground }]}>{item.title}</Text>
        {item.description ? <Text style={[styles.feedContent, { color: colors.mutedForeground }]}>{item.description}</Text> : null}
        <View style={styles.eventMetaRow}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>{item.eventDate}</Text>
        </View>
        <View style={styles.eventMetaRow}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>{item.location}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{team.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {((isAdmin || isMember)
          ? [
            { key: "feed", label: "Feed" },
            { key: "details", label: "Details" },
            { key: "requests", label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` },
          ]
          : [
            { key: "feed", label: "Feed" },
            { key: "details", label: "Details" },
          ]).map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key as any)}
                style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              >
                <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {activeTab === "feed" ? (
          <>
            {isAdmin && (
              <View style={[styles.feedComposer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.feedComposerTitle, { color: colors.foreground }]}>Post an update</Text>
                <TextInput
                  value={postContent}
                  onChangeText={setPostContent}
                  placeholder="Share progress, links, or a quick update..."
                  placeholderTextColor={colors.placeholder}
                  style={[styles.feedComposerInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  multiline
                />
                {postMedia && (
                  <View style={[styles.feedMediaPreview, { backgroundColor: colors.secondary }]}>
                    <Image source={{ uri: postMedia }} style={styles.feedMedia} resizeMode="cover" />
                    <TouchableOpacity onPress={() => setPostMedia(null)} style={[styles.removeMediaBtn, { backgroundColor: colors.overlay }]}>
                      <Feather name="x" size={13} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.feedComposerActions}>
                  <TouchableOpacity onPress={handlePickMedia} style={[styles.composerAction, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="image" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.composerActionText, { color: colors.mutedForeground }]}>Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPollModalVisible(true)} style={[styles.composerAction, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="bar-chart-2" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.composerActionText, { color: colors.mutedForeground }]}>Poll</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTaskModalVisible(true)} style={[styles.composerAction, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="check-square" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.composerActionText, { color: colors.mutedForeground }]}>Tasks</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEventModalVisible(true)} style={[styles.composerAction, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="calendar" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.composerActionText, { color: colors.mutedForeground }]}>Event</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleCreatePost}
                  disabled={isPostingUpdate}
                  style={[styles.feedPostBtn, { backgroundColor: colors.primary }, isPostingUpdate && { opacity: 0.65 }]}
                >
                  {isPostingUpdate ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="send" size={15} color="#FFF" />
                  )}
                  <Text style={styles.feedPostBtnText}>{isPostingUpdate ? "Posting..." : "Post to feed"}</Text>
                </TouchableOpacity>
              </View>
            )}
            {(
              <>
                {feedLoading ? (
                  <View style={styles.feedLoading}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : feedItems.length === 0 ? (
                  <View style={styles.noRequests}>
                    <Feather name="rss" size={36} color={colors.mutedForeground} />
                    <Text style={[styles.noRequestsTitle, { color: colors.foreground }]}>No updates yet</Text>
                    <Text style={[styles.noRequestsSub, { color: colors.mutedForeground }]}>Admins will post updates, polls, tasks, and events here.</Text>
                  </View>
                ) : (
                  feedItems.map(renderFeedItem)
                )}
              </>
            )}
          </>
        ) : activeTab === "details" ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.typeIcon, { backgroundColor: typeColor + "15" }]}>
                <Feather name="users" size={30} color={typeColor} />
              </View>
              <View style={[styles.typePill, { backgroundColor: typeColor + "20" }]}>
                <Text style={[styles.typeText, { color: typeColor }]}>{team.type}</Text>
              </View>
              <Text style={[styles.teamTitle, { color: colors.foreground }]}>{team.title}</Text>
              <View style={styles.teamMeta}>
                <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{team.members}/{team.maxMembers} members</Text>
                </View>
                <View style={[styles.metaItem, { backgroundColor: spotsLeft > 0 ? "#F59E0B20" : colors.secondary }]}>
                  <Feather name="clock" size={12} color={spotsLeft > 0 ? "#F59E0B" : colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: spotsLeft > 0 ? "#F59E0B" : colors.mutedForeground }]}>
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"} · {team.deadline}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => viewProfile(team.poster)} style={styles.posterRow}>
                <View style={[styles.posterAvatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.posterLetter, { color: colors.primary }]}>{team.poster[0]?.toUpperCase()}</Text>
                </View>
                <Text style={[styles.posterName, { color: colors.mutedForeground }]}>
                  Posted by <Text style={{ color: colors.primary }}>@{team.poster}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.desc, { color: colors.foreground }]}>{team.description}</Text>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills Needed</Text>
              <View style={styles.skillsRow}>
                {team.skills.map((s) => (
                  <View key={s} style={[styles.skillChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                    <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            {approvedRequests.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Approved Members</Text>
                {approvedRequests.map((r) => (
                  <View key={r.userId} style={[styles.memberRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: "#00A86B20" }]}>
                      <Text style={[styles.memberLetter, { color: "#00A86B" }]}>{r.displayName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: colors.foreground }]}>{r.displayName}</Text>
                      <Text style={[styles.memberCollege, { color: colors.mutedForeground }]}>@{r.username} · {r.college}</Text>
                    </View>
                    <View style={[styles.approvedBadge, { backgroundColor: "#00A86B15" }]}>
                      <Feather name="check-circle" size={13} color="#00A86B" />
                      <Text style={[styles.approvedText, { color: "#00A86B" }]}>Approved</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {pendingRequests.length === 0 ? (
              <View style={styles.noRequests}>
                <Feather name="inbox" size={40} color={colors.mutedForeground} />
                <Text style={[styles.noRequestsTitle, { color: colors.foreground }]}>No pending requests</Text>
                <Text style={[styles.noRequestsSub, { color: colors.mutedForeground }]}>Share your team post to attract more members!</Text>
              </View>
            ) : (
              pendingRequests.map((r) => (
                <View key={r.userId} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.requestHeader}>
                    <TouchableOpacity onPress={() => viewProfile(r.username)} style={styles.requesterInfo}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.memberLetter, { color: colors.primary }]}>{r.displayName[0]?.toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={[styles.memberName, { color: colors.foreground }]}>{r.displayName}</Text>
                        <Text style={[styles.memberCollege, { color: colors.mutedForeground }]}>@{r.username} · {r.college}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => viewProfile(r.username)} style={[styles.viewProfileBtn, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.viewProfileText, { color: colors.foreground }]}>View</Text>
                    </TouchableOpacity>
                  </View>
                  {r.message && (
                    <View style={[styles.messageBox, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.messageText, { color: colors.foreground }]}>"{r.message}"</Text>
                    </View>
                  )}
                  <View style={styles.actionBtns}>
                    <TouchableOpacity onPress={() => handleDeny(r.userId, r.displayName)} style={[styles.denyBtn, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
                      <Feather name="x" size={15} color="#EF4444" />
                      <Text style={[styles.denyText, { color: "#EF4444" }]}>Deny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleApprove(r.userId, r.displayName)} style={[styles.approveBtn, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={15} color="#FFF" />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {!isAdmin && !isMember && spotsLeft > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}>
          {requested ? (
            <TouchableOpacity onPress={handleCancel} style={[styles.requestedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="check" size={16} color={colors.foreground} />
              <Text style={[styles.requestedBtnText, { color: colors.foreground }]}>Request Sent · Tap to Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setJoinVisible(true)} style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
              <Feather name="user-plus" size={16} color="#FFF" />
              <Text style={styles.joinBtnText}>Request to Join</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isAdmin && !isMember && spotsLeft === 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}>
          <View style={[styles.fullBar, { backgroundColor: colors.secondary }]}>
            <Feather name="users" size={16} color={colors.mutedForeground} />
            <Text style={[styles.fullBarText, { color: colors.mutedForeground }]}>Team is full</Text>
          </View>
        </View>
      )}

      <JoinModal visible={joinVisible} onClose={() => setJoinVisible(false)} onSubmit={handleJoinRequest} colors={colors} />

      <Modal visible={pollModalVisible} transparent animationType="fade" onRequestClose={() => setPollModalVisible(false)}>
        <View style={[styles.actionOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.actionKeyboard}>
            <ScrollView contentContainerStyle={styles.actionScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.actionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>Create Poll</Text>
                <TextInput
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  placeholder="Ask your team a question"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                />
                <View style={styles.optionList}>
                  {pollOptions.map((opt, idx) => (
                    <TextInput
                      key={`poll-opt-${idx}`}
                      value={opt}
                      onChangeText={(value) => updatePollOption(idx, value)}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor={colors.placeholder}
                      style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    />
                  ))}
                </View>
                <TouchableOpacity onPress={addPollOption} style={[styles.addOptionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="plus" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.addOptionText, { color: colors.mutedForeground }]}>Add option</Text>
                </TouchableOpacity>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => setPollModalVisible(false)} style={[styles.actionCancel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.actionCancelText, { color: colors.foreground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreatePoll} style={[styles.actionSubmit, { backgroundColor: colors.primary }]}>
                    <Text style={styles.actionSubmitText}>Post Poll</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={taskModalVisible} transparent animationType="fade" onRequestClose={() => setTaskModalVisible(false)}>
        <View style={[styles.actionOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.actionKeyboard}>
            <ScrollView contentContainerStyle={styles.actionScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.actionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>Create Task List</Text>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Task list title"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                />
                <View style={styles.optionList}>
                  {taskItems.map((opt, idx) => (
                    <TextInput
                      key={`task-item-${idx}`}
                      value={opt}
                      onChangeText={(value) => updateTaskItem(idx, value)}
                      placeholder={`Task ${idx + 1}`}
                      placeholderTextColor={colors.placeholder}
                      style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                    />
                  ))}
                </View>
                <TouchableOpacity onPress={addTaskItem} style={[styles.addOptionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="plus" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.addOptionText, { color: colors.mutedForeground }]}>Add task</Text>
                </TouchableOpacity>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => setTaskModalVisible(false)} style={[styles.actionCancel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.actionCancelText, { color: colors.foreground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateTask} style={[styles.actionSubmit, { backgroundColor: colors.primary }]}>
                    <Text style={styles.actionSubmitText}>Post Tasks</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={eventModalVisible} transparent animationType="fade" onRequestClose={() => setEventModalVisible(false)}>
        <View style={[styles.actionOverlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.actionKeyboard}>
            <ScrollView contentContainerStyle={styles.actionScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.actionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>Schedule Event</Text>
                <TextInput
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  placeholder="Event title"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                />
                <TextInput
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="Date & time (e.g. May 25, 6PM)"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                />
                <TextInput
                  value={eventLocation}
                  onChangeText={setEventLocation}
                  placeholder="Location"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                />
                <TextInput
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  placeholder="Short description"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.actionInput, styles.actionMultiline, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                  multiline
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => setEventModalVisible(false)} style={[styles.actionCancel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.actionCancelText, { color: colors.foreground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateEvent} style={[styles.actionSubmit, { backgroundColor: colors.primary }]}>
                    <Text style={styles.actionSubmitText}>Post Event</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 12, alignItems: "center" },
  typeIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  teamTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 26 },
  teamMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  posterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  posterAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  posterLetter: { fontSize: 13, fontFamily: "Inter_700Bold" },
  posterName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  skillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  memberLetter: { fontSize: 16, fontFamily: "Inter_700Bold" },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberCollege: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  approvedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  approvedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  requestCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requesterInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  viewProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewProfileText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  messageBox: { borderRadius: 10, padding: 10 },
  messageText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, fontStyle: "italic" },
  actionBtns: { flexDirection: "row", gap: 10 },
  denyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  denyText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  approveText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  noRequests: { alignItems: "center", gap: 14, paddingTop: 48 },
  noRequestsTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  noRequestsSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bottomBar: { borderTopWidth: 1, padding: 16 },
  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  joinBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  requestedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1 },
  requestedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fullBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  fullBarText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  feedComposer: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  feedComposerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  feedComposerInput: { borderRadius: 12, borderWidth: 1, padding: 12, minHeight: 90, fontSize: 14, fontFamily: "Inter_400Regular" },
  feedComposerActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  composerAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  composerActionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  feedPostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  feedPostBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  feedLoading: { paddingVertical: 30, alignItems: "center" },
  feedCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  feedHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  feedAvatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  feedAvatarLetter: { fontSize: 16, fontFamily: "Inter_700Bold" },
  feedAuthor: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  feedTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  feedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  feedBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  feedContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  feedMediaWrap: { width: 220, height: 160, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  feedMedia: { width: "100%", height: "100%" },
  feedMediaPreview: { width: "100%", height: 180, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  removeMediaBtn: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  feedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  feedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  feedQuestion: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pollOptions: { gap: 8 },
  pollOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pollOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pollCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  taskList: { gap: 8 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  taskCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  taskText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  taskTextDone: { textDecorationLine: "line-through", opacity: 0.65 },
  eventMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 20 },
  actionKeyboard: { width: "100%" },
  actionScroll: { flexGrow: 1, justifyContent: "center" },
  actionModal: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  actionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  actionInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  actionMultiline: { minHeight: 80, textAlignVertical: "top" },
  optionList: { gap: 10 },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  addOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionButtons: { flexDirection: "row", gap: 10, marginTop: 6 },
  actionCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  actionCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionSubmit: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionSubmitText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  modal: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 36, gap: 14 },
  modalKeyboardWrap: { flex: 1, justifyContent: "flex-end" },
  modalScrollContent: { flexGrow: 1, justifyContent: "flex-end" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  modalInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalSubmitBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  modalSubmitText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_400Regular" },
  backLink: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backLinkText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
