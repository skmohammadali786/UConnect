import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import type { DimensionValue } from "react-native";
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VaultRadarCard } from "@/components/vault/VaultRadarCard";
import { useAuth } from "@/context/AuthContext";
import { useGhostMode } from "@/context/GhostModeContext";
import { useColors } from "@/hooks/useColors";
import { useVaultActions, useVaultSummary } from "@/hooks/useVault";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { DebateSide, VaultPriority } from "@/services/vault";

type ModalType = "alert" | "nomination" | "debate" | "wiki" | "argument" | null;

const LEGEND_CATEGORIES = ["Best Developer", "Best Designer", "Best Mentor", "Best Team Leader", "Most Helpful Student", "Best Content Creator", "Community Builder", "Startup Leader", "Campus Influencer"];
const ALERT_PRIORITIES: VaultPriority[] = ["normal", "high", "critical"];
const ALERT_CATEGORIES = ["Safety Alert", "Medical Emergency", "Blood Required", "Lost ID", "Lost Item", "Need Notes", "Need Transport", "Urgent Academic Help"];
const WIKI_CATEGORIES = ["Academics", "Professors", "Hostels", "Placements", "Internships", "Clubs", "Labs", "Events", "Study Resources"];

function Metric({ label, value, icon, colors }: { label: string; value: string | number; icon: any; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function percentWidth(value: unknown): DimensionValue {
  const next = Number(value ?? 0);
  if (!Number.isFinite(next)) return "0%";
  return `${Math.min(100, Math.max(0, next))}%`;
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ghost = useGhostMode();
  const { showSuccess, showError } = useToast();
  const { data: summary, isLoading, refetch } = useVaultSummary(user?.id);
  const actions = useVaultActions();
  const [modal, setModal] = useState<ModalType>(null);
  const [busy, setBusy] = useState(false);
  const [selectedDebate, setSelectedDebate] = useState<{ id: string; side: DebateSide; title: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const radarColors = useMemo(() => ({ ...colors, primary: colors.primary, secondary: colors.primarySoft }), [colors]);
  const isVerified = Boolean(user?.isVerified);
  const disabledIdentityActions = ghost.isGhostActive || !isVerified;

  const openModal = (type: ModalType, initial: Record<string, string> = {}) => {
    if ((type === "nomination" || type === "debate" || type === "wiki") && !isVerified) {
      showError("Verification required", "Verify your profile before creating nominations, debates, or wiki articles.");
      return;
    }
    setForm(initial);
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDebate(null);
    setForm({});
  };

  const submit = async () => {
    if (!user) {
      showError("Sign in required", "Join UConnect to use Vault actions.");
      return;
    }
    setBusy(true);
    try {
      if (modal === "alert") {
        await actions.createAlert.mutateAsync({
          title: form.title?.trim(),
          body: form.body?.trim(),
          category: form.category?.trim() || ALERT_CATEGORIES[0],
          priority: (form.priority as VaultPriority) || "normal",
          location: form.location?.trim() || null,
        });
        showSuccess("Alert posted", "Your campus alert is now live.");
      }
      if (modal === "nomination") {
        if (ghost.isGhostActive) throw new Error("Ghost Mode cannot nominate Vault Legends.");
        if (!isVerified) throw new Error("Verify your profile before nominating Vault Legends.");
        const username = form.username?.replace(/^@/, "").trim();
        const { data: nominee } = await supabase.from("profiles").select("id").ilike("username", username ?? "").maybeSingle();
        if (!nominee?.id) throw new Error("No user found with that username.");
        await actions.nominateLegend.mutateAsync({ nominee_id: nominee.id, category: form.category || LEGEND_CATEGORIES[0], reason: form.reason?.trim() });
        showSuccess("Nomination created", "Your legend nomination was submitted.");
      }
      if (modal === "debate") {
        if (ghost.isGhostActive) throw new Error("Ghost Mode cannot create Vault debates.");
        if (!isVerified) throw new Error("Verify your profile before creating Vault debates.");
        await actions.createDebate.mutateAsync({ title: form.title?.trim(), description: form.description?.trim() || "" });
        showSuccess("Debate opened", "Students can now join the arena.");
      }
      if (modal === "wiki") {
        if (ghost.isGhostActive) throw new Error("Ghost Mode cannot edit Vault wiki data.");
        if (!isVerified) throw new Error("Verify your profile before editing Vault wiki data.");
        await actions.createWikiArticle.mutateAsync({ title: form.title?.trim(), category: form.category?.trim() || WIKI_CATEGORIES[0], content: form.content?.trim() });
        showSuccess("Wiki article published", "Your campus knowledge was added.");
      }
      if (modal === "argument" && selectedDebate) {
        await actions.joinDebate.mutateAsync({ debate_id: selectedDebate.id, side: selectedDebate.side, body: form.body?.trim(), alias: form.alias?.trim() || undefined });
        showSuccess("Argument posted", `You joined the ${selectedDebate.side.toUpperCase()} side.`);
      }
      await refetch();
      closeModal();
    } catch (e: any) {
      showError("Vault action failed", e?.message ?? "Please check the form and try again.");
    } finally {
      setBusy(false);
    }
  };

  const vote = async (targetType: "legend_nomination" | "wiki_article", targetId: string) => {
    try {
      if (ghost.isGhostActive) throw new Error("Ghost Mode cannot vote in the Vault.");
      if (!isVerified) throw new Error("Verify your profile before voting in the Vault.");
      await actions.voteTarget.mutateAsync({ targetType, targetId, vote: "up" });
      await refetch();
      showSuccess("Vote counted");
    } catch (e: any) {
      showError("Vote failed", e?.message ?? "Try again later.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>CAMPUS INTELLIGENCE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>The Vault</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Reputation, alerts, debates, legends, and wiki knowledge.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/settings/ghost-mode" as any)} style={[styles.ghostButton, { backgroundColor: ghost.isGhostActive ? colors.primary : colors.card, borderColor: ghost.isGhostActive ? colors.primary + "55" : colors.border }]}>
            <Feather name="cloud-snow" size={18} color={ghost.isGhostActive ? colors.primaryForeground : colors.primary} />
            <Text style={[styles.ghostButtonText, { color: ghost.isGhostActive ? colors.primaryForeground : colors.foreground }]}>{ghost.activeCount}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Vault Reputation</Text>
              <Text style={[styles.heroScore, { color: colors.foreground }]}>{summary?.score ?? 0}</Text>
            </View>
            <View style={[styles.levelPill, { backgroundColor: colors.primarySoft }]}><MaterialCommunityIcons name="hexagon-multiple" size={15} color={colors.primary} /><Text style={[styles.levelText, { color: colors.primary }]}>{summary?.level ?? "Explorer"}</Text></View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: percentWidth(summary?.progress) }]} /></View>
          <Text style={[styles.heroMeta, { color: colors.mutedForeground }]}>Rank {summary?.rank ? `#${summary.rank}` : "—"} · Skill Strength {summary?.skillStrength ?? 0}%</Text>
        </View>

        <View style={styles.metricsGrid}>
          <Metric icon="award" label="Vault Rank" value={summary?.rank ? `#${summary.rank}` : "—"} colors={colors} />
          <Metric icon="zap" label="Skill Strength" value={`${summary?.skillStrength ?? 0}%`} colors={colors} />
          <Metric icon="message-square" label="Active Debates" value={summary?.debates.length ?? 0} colors={colors} />
          <Metric icon="alert-triangle" label="Active Alerts" value={summary?.alerts.length ?? 0} colors={colors} />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton icon="radio" label="Alert" onPress={() => openModal("alert", { priority: "normal", category: ALERT_CATEGORIES[0] })} colors={colors} />
          <ActionButton icon="star" label="Nominate" disabled={disabledIdentityActions} onPress={() => openModal("nomination", { category: LEGEND_CATEGORIES[0] })} colors={colors} />
          <ActionButton icon="activity" label="Debate" disabled={disabledIdentityActions} onPress={() => openModal("debate")} colors={colors} />
          <ActionButton icon="book-open" label="Wiki" disabled={disabledIdentityActions} onPress={() => openModal("wiki", { category: WIKI_CATEGORIES[0] })} colors={colors} />
        </View>
        {ghost.isGhostActive ? <Text style={[styles.ghostNote, { color: colors.mutedForeground }]}>Ghost Mode is active: browsing, alerts, and arguments work; nominations, votes, and wiki edits stay locked.</Text> : null}
        {!isVerified ? <Text style={[styles.ghostNote, { color: colors.mutedForeground }]}>Verification required: verify your profile to nominate legends, open debates, edit wiki articles, and vote.</Text> : null}

        <View style={styles.radarWrap}><VaultRadarCard skills={summary?.skills ?? []} colors={radarColors} /></View>

        <Section title="Current Campus Legends" icon="star" colors={colors} items={(summary?.legends ?? []).map((l) => ({ key: l.id, title: l.nominee_username, meta: l.category, count: l.votes_count, countLabel: l.votes_count === 1 ? "vote" : "votes", action: "Vote", onPress: () => vote("legend_nomination", l.id), disabled: ghost.isGhostActive || !isVerified }))} />
        <Section title="Active Debates" icon="activity" colors={colors} items={(summary?.debates ?? []).map((d) => ({ key: d.id, title: d.title, meta: `FOR ${d.for_count} · AGAINST ${d.against_count}`, actions: [
          { label: "For", onPress: () => { setSelectedDebate({ id: d.id, side: "for", title: d.title }); openModal("argument"); } },
          { label: "Against", onPress: () => { setSelectedDebate({ id: d.id, side: "against", title: d.title }); openModal("argument"); } },
        ] }))} />
        <Section title="Active Alerts" icon="radio" colors={colors} items={(summary?.alerts ?? []).map((a) => ({ key: a.id, title: a.title, meta: `${a.category} · ${a.priority.toUpperCase()}` }))} />
        <Section title="Trending Wiki Articles" icon="book-open" colors={colors} items={(summary?.wiki ?? []).map((w) => ({ key: w.id, title: w.title, meta: w.category, count: w.upvotes, countLabel: w.upvotes === 1 ? "upvote" : "upvotes", action: "Helpful", onPress: () => vote("wiki_article", w.id), disabled: ghost.isGhostActive || !isVerified }))} />
      </ScrollView>
      <VaultModal modal={modal} form={form} setForm={setForm} colors={colors} busy={busy} onClose={closeModal} onSubmit={submit} selectedDebate={selectedDebate} />
    </View>
  );
}

function ActionButton({ icon, label, onPress, colors, disabled }: { icon: any; label: string; onPress: () => void; colors: ReturnType<typeof useColors>; disabled?: boolean }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: disabled ? colors.muted : colors.primarySoft, borderColor: colors.border, opacity: disabled ? 0.55 : 1 }]}><Feather name={icon} size={17} color={disabled ? colors.mutedForeground : colors.primary} /><Text style={[styles.actionText, { color: disabled ? colors.mutedForeground : colors.primary }]}>{label}</Text></TouchableOpacity>;
}

function Section({ title, icon, items, colors }: { title: string; icon: any; colors: ReturnType<typeof useColors>; items: Array<{ key: string; title: string; meta: string; count?: number; countLabel?: string; action?: string; onPress?: () => void; disabled?: boolean; actions?: Array<{ label: string; onPress: () => void }> }> }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><Feather name={icon} size={16} color={colors.primary} /><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text></View><View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{items.length ? items.map((item) => <View key={item.key} style={[styles.listRow, { borderBottomColor: colors.separator }]}><View style={[styles.listDot, { backgroundColor: colors.primary }]} /><View style={{ flex: 1 }}><Text style={[styles.listTitle, { color: colors.foreground }]}>{item.title}</Text><View style={styles.metaLine}><Text style={[styles.listMeta, { color: colors.mutedForeground }]}>{item.meta}</Text>{typeof item.count === "number" ? <View style={[styles.voteBadge, { backgroundColor: colors.primarySoft, borderColor: colors.primary + "28" }]}><Feather name="arrow-up" size={11} color={colors.primary} /><Text style={[styles.voteBadgeText, { color: colors.primary }]}>{item.count} {item.countLabel ?? "votes"}</Text></View> : null}</View></View>{item.action ? <TouchableOpacity disabled={item.disabled} onPress={item.onPress} style={[styles.smallAction, { backgroundColor: colors.primarySoft, opacity: item.disabled ? 0.5 : 1 }]}><Text style={[styles.smallActionText, { color: colors.primary }]}>{item.action}</Text></TouchableOpacity> : null}{item.actions?.map((a) => <TouchableOpacity key={a.label} onPress={a.onPress} style={[styles.smallAction, { backgroundColor: colors.primarySoft }]}><Text style={[styles.smallActionText, { color: colors.primary }]}>{a.label}</Text></TouchableOpacity>)}</View>) : <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active entries yet. Be the first to shape the Vault.</Text>}</View></View>;
}

function VaultModal({ modal, form, setForm, colors, busy, onClose, onSubmit, selectedDebate }: any) {
  const title = modal === "alert" ? "Create Campus Alert" : modal === "nomination" ? "Nominate a Legend" : modal === "debate" ? "Open Debate" : modal === "wiki" ? "Publish Wiki Article" : selectedDebate ? `Join ${selectedDebate.side.toUpperCase()}` : "Vault Action";
  return <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: colors.card }]}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>{modal === "argument" && selectedDebate ? <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{selectedDebate.title}</Text> : null}
    {modal === "alert" ? <><Input formKey="title" placeholder="Alert title" form={form} setForm={setForm} colors={colors} /><Input formKey="body" placeholder="What happened?" multiline form={form} setForm={setForm} colors={colors} /><Choice values={ALERT_CATEGORIES} active={form.category || ALERT_CATEGORIES[0]} onPick={(v: string) => setForm({ ...form, category: v })} colors={colors} /><Choice values={ALERT_PRIORITIES} active={form.priority || "normal"} onPick={(v: string) => setForm({ ...form, priority: v })} colors={colors} /><Input formKey="location" placeholder="Location (optional)" form={form} setForm={setForm} colors={colors} /></> : null}
    {modal === "nomination" ? <><Input formKey="username" placeholder="Nominee username" form={form} setForm={setForm} colors={colors} /><Choice values={LEGEND_CATEGORIES} active={form.category || LEGEND_CATEGORIES[0]} onPick={(v: string) => setForm({ ...form, category: v })} colors={colors} /><Input formKey="reason" placeholder="Why should they be a legend?" multiline form={form} setForm={setForm} colors={colors} /></> : null}
    {modal === "debate" ? <><Input formKey="title" placeholder="Debate title" form={form} setForm={setForm} colors={colors} /><Input formKey="description" placeholder="Debate context" multiline form={form} setForm={setForm} colors={colors} /></> : null}
    {modal === "wiki" ? <><Input formKey="title" placeholder="Article title" form={form} setForm={setForm} colors={colors} /><Choice values={WIKI_CATEGORIES} active={form.category || WIKI_CATEGORIES[0]} onPick={(v: string) => setForm({ ...form, category: v })} colors={colors} /><Input formKey="content" placeholder="Article content" multiline form={form} setForm={setForm} colors={colors} /></> : null}
    {modal === "argument" ? <><Input formKey="alias" placeholder="Anonymous alias (optional)" form={form} setForm={setForm} colors={colors} /><Input formKey="body" placeholder="Your argument" multiline form={form} setForm={setForm} colors={colors} /></> : null}
    <View style={styles.modalActions}><TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: colors.secondary }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={onSubmit} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>{busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Submit</Text>}</TouchableOpacity></View></View></View></Modal>;
}

function Input({ formKey, placeholder, form, setForm, colors, multiline }: any) {
  return <TextInput value={form[formKey] ?? ""} onChangeText={(text) => setForm({ ...form, [formKey]: text })} placeholder={placeholder} placeholderTextColor={colors.placeholder} multiline={multiline} style={[styles.input, multiline && styles.multiline, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]} />;
}

function Choice({ values, active, onPick, colors }: any) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{values.map((v: string) => <TouchableOpacity key={v} onPress={() => onPick(v)} style={[styles.choice, { backgroundColor: active === v ? colors.primary : colors.secondary }]}><Text style={[styles.choiceText, { color: active === v ? colors.primaryForeground : colors.mutedForeground }]}>{v}</Text></TouchableOpacity>)}</ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, marginBottom: 16 },
  kicker: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },
  title: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4, maxWidth: 270 },
  ghostButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  ghostButtonText: { fontFamily: "Inter_700Bold" },
  heroCard: { marginHorizontal: 16, borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 16, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  heroScore: { fontFamily: "Inter_700Bold", fontSize: 44, marginTop: 2 },
  levelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  levelText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  progressTrack: { height: 10, borderRadius: 99, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", borderRadius: 99 },
  heroMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, marginBottom: 8 },
  metricCard: { width: "46%", marginHorizontal: "2%", borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 12, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  metricValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 8 },
  metricLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  actionButton: { flex: 1, minWidth: "22%", borderRadius: 16, borderWidth: 1, alignItems: "center", paddingVertical: 12, gap: 6 },
  actionText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  ghostNote: { marginHorizontal: 18, marginBottom: 10, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 },
  radarWrap: { marginHorizontal: 16, marginBottom: 8 },
  section: { marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 18, marginBottom: 8 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  card: { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  listDot: { width: 8, height: 8, borderRadius: 4 },
  listTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  listMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  metaLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 2 },
  voteBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  voteBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  smallAction: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  smallActionText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyText: { fontFamily: "Inter_500Medium", lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 18 },
  modalCard: { borderRadius: 24, padding: 18, maxHeight: "86%" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  modalSub: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_500Medium", marginTop: 10 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  choiceRow: { gap: 8, paddingVertical: 10 },
  choice: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  choiceText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderRadius: 14, alignItems: "center", paddingVertical: 13 },
  cancelText: { fontFamily: "Inter_700Bold" },
  submitBtn: { flex: 1, borderRadius: 14, alignItems: "center", paddingVertical: 13 },
  submitText: { fontFamily: "Inter_700Bold" },
});
