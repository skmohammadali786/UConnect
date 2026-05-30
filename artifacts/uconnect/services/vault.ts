import { supabase } from "@/lib/supabase";

export type VaultLevel = "Explorer" | "Contributor" | "Builder" | "Mentor" | "Leader" | "Legend";
export type VaultPriority = "critical" | "high" | "normal";
export type DebateSide = "for" | "against";

export interface VaultSummary {
  score: number;
  level: VaultLevel;
  progress: number;
  rank: number | null;
  skillStrength: number;
  legends: Array<{ id: string; category: string; nominee_username: string; votes_count: number }>;
  debates: Array<{ id: string; title: string; ends_at: string; for_count: number; against_count: number }>;
  alerts: Array<{ id: string; title: string; category: string; priority: VaultPriority; expires_at: string }>;
  wiki: Array<{ id: string; title: string; category: string; upvotes: number; view_count: number }>;
  skills: Array<{ skill_name: string; strength: number; trend: number }>;
  badges: Array<{ id: string; label: string; category: string; awarded_at: string }>;
}

const fallback: VaultSummary = {
  score: 0,
  level: "Explorer",
  progress: 0,
  rank: null,
  skillStrength: 0,
  legends: [],
  debates: [],
  alerts: [],
  wiki: [],
  skills: [],
  badges: [],
};

function finiteNumber(value: unknown, fallbackValue = 0) {
  const next = Number(value ?? fallbackValue);
  return Number.isFinite(next) ? next : fallbackValue;
}

function textValue(value: unknown, fallbackValue: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallbackValue;
}

function normalizeVaultSummary(data: Partial<VaultSummary> | null | undefined): VaultSummary {
  const merged = { ...fallback, ...(data ?? {}) } as VaultSummary;
  const progress = Math.min(100, Math.max(0, finiteNumber(merged.progress)));
  const skills = Array.isArray(merged.skills) ? merged.skills : [];
  return {
    ...merged,
    score: finiteNumber(merged.score),
    level: textValue(merged.level, "Explorer") as VaultLevel,
    progress,
    rank: merged.rank === null || merged.rank === undefined ? null : finiteNumber(merged.rank, 0),
    skillStrength: Math.min(100, Math.max(0, finiteNumber(merged.skillStrength))),
    legends: (Array.isArray(merged.legends) ? merged.legends : []).map((legend, index) => ({
      id: textValue((legend as any)?.id, `legend-${index}`),
      category: textValue((legend as any)?.category, "Campus Legend"),
      nominee_username: textValue((legend as any)?.nominee_username, "Unknown student"),
      votes_count: finiteNumber((legend as any)?.votes_count),
    })),
    debates: (Array.isArray(merged.debates) ? merged.debates : []).map((debate, index) => ({
      id: textValue((debate as any)?.id, `debate-${index}`),
      title: textValue((debate as any)?.title, "Untitled debate"),
      ends_at: textValue((debate as any)?.ends_at, new Date().toISOString()),
      for_count: finiteNumber((debate as any)?.for_count),
      against_count: finiteNumber((debate as any)?.against_count),
    })),
    alerts: (Array.isArray(merged.alerts) ? merged.alerts : []).map((alert, index) => ({
      id: textValue((alert as any)?.id, `alert-${index}`),
      title: textValue((alert as any)?.title, "Campus alert"),
      category: textValue((alert as any)?.category, "Safety Alert"),
      priority: textValue((alert as any)?.priority, "normal") as VaultPriority,
      expires_at: textValue((alert as any)?.expires_at, new Date().toISOString()),
    })),
    wiki: (Array.isArray(merged.wiki) ? merged.wiki : []).map((article, index) => ({
      id: textValue((article as any)?.id, `wiki-${index}`),
      title: textValue((article as any)?.title, "Untitled article"),
      category: textValue((article as any)?.category, "Academics"),
      upvotes: finiteNumber((article as any)?.upvotes),
      view_count: finiteNumber((article as any)?.view_count),
    })),
    skills: skills.map((skill, index) => ({
      skill_name: textValue((skill as any)?.skill_name, `Skill ${index + 1}`),
      strength: Math.min(100, Math.max(0, finiteNumber((skill as any)?.strength))),
      trend: finiteNumber((skill as any)?.trend),
    })),
    badges: (Array.isArray(merged.badges) ? merged.badges : []).map((badge, index) => ({
      id: textValue((badge as any)?.id, `badge-${index}`),
      label: textValue((badge as any)?.label, "Vault Badge"),
      category: textValue((badge as any)?.category, "Vault"),
      awarded_at: textValue((badge as any)?.awarded_at, new Date().toISOString()),
    })),
  };
}

export function getVaultLevel(score: number): VaultLevel {
  if (score >= 12000) return "Legend";
  if (score >= 7000) return "Leader";
  if (score >= 3500) return "Mentor";
  if (score >= 1500) return "Builder";
  if (score >= 400) return "Contributor";
  return "Explorer";
}

export function getVaultProgress(score: number) {
  const thresholds = [0, 400, 1500, 3500, 7000, 12000];
  const index = Math.max(0, thresholds.findIndex((t, i) => score >= t && (i === thresholds.length - 1 || score < thresholds[i + 1])));
  const start = thresholds[index] ?? 0;
  const end = thresholds[index + 1] ?? start + 5000;
  return Math.min(100, Math.max(0, Math.round(((score - start) / (end - start)) * 100)));
}

export async function fetchVaultSummary(userId?: string): Promise<VaultSummary> {
  try {
    const { data, error } = await supabase.rpc("get_vault_home", { p_user_id: userId ?? null });
    if (!error && data) return normalizeVaultSummary(data as Partial<VaultSummary>);
  } catch {}

  const [scoreRes, legendsRes, debatesRes, alertsRes, wikiRes, skillsRes, badgesRes] = await Promise.all([
    userId ? supabase.from("vault_scores").select("score, level, campus_rank").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("vault_nominations").select("id, category, nominee_username, votes_count").eq("status", "active").order("votes_count", { ascending: false }).limit(6),
    supabase.from("vault_debates").select("id, title, ends_at, for_count, against_count").eq("status", "active").order("ends_at", { ascending: true }).limit(5),
    supabase.from("vault_alerts").select("id, title, category, priority, expires_at").eq("status", "active").order("priority_rank", { ascending: true }).order("created_at", { ascending: false }).limit(5),
    supabase.from("vault_wiki_articles").select("id, title, category, upvotes, view_count").eq("status", "published").order("upvotes", { ascending: false }).limit(5),
    userId ? supabase.from("vault_skills").select("skill_name, strength, trend").eq("user_id", userId).order("strength", { ascending: false }).limit(9) : Promise.resolve({ data: [] }),
    userId ? supabase.from("vault_legend_badges").select("id, label, category, awarded_at").eq("user_id", userId).order("awarded_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
  ]);
  const score = (scoreRes.data as any)?.score ?? 0;
  const skills = (skillsRes.data ?? []) as VaultSummary["skills"];
  return normalizeVaultSummary({
    score,
    level: ((scoreRes.data as any)?.level ?? getVaultLevel(score)) as VaultLevel,
    progress: getVaultProgress(score),
    rank: (scoreRes.data as any)?.campus_rank ?? null,
    skillStrength: skills.length ? Math.round(skills.reduce((sum, s) => sum + (s.strength ?? 0), 0) / skills.length) : 0,
    legends: (legendsRes.data ?? []) as any,
    debates: (debatesRes.data ?? []) as any,
    alerts: (alertsRes.data ?? []) as any,
    wiki: (wikiRes.data ?? []) as any,
    skills,
    badges: (badgesRes.data ?? []) as any,
  });
}

export async function createVaultAlert(input: { title: string; body: string; category: string; priority: VaultPriority; location?: string | null }) {
  const { data, error } = await supabase.rpc("create_vault_alert", input);
  if (error) throw error;
  return data;
}

export async function nominateVaultLegend(input: { nominee_id: string; category: string; reason: string }) {
  const { data, error } = await supabase.rpc("nominate_vault_legend", input);
  if (error) throw error;
  return data;
}

export async function joinVaultDebate(input: { debate_id: string; side: DebateSide; body: string; alias?: string }) {
  const { data, error } = await supabase.rpc("join_vault_debate", input);
  if (error) throw error;
  return data;
}

export async function createVaultDebate({ title, description }: { title: string; description: string }) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to create a debate.");
  const { data, error } = await supabase
    .from("vault_debates")
    .insert({ creator_id: userId, title: title.trim(), description: description.trim(), status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createVaultWikiArticle({ title, category, content }: { title: string; category: string; content: string }) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to create a wiki article.");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "vault-article";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("vault_wiki_articles")
    .insert({
      author_id: userId,
      author_username: (profile as any)?.username ?? "vault-user",
      title: title.trim(),
      slug,
      category: category.trim(),
      body_markdown: content.trim(),
      status: "published",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function voteVaultTarget(targetType: "legend_nomination" | "wiki_article", targetId: string, vote: "up" | "down" = "up") {
  const { error } = await supabase.rpc("vote_vault_target", { target_type: targetType, target_id: targetId, vote });
  if (!error) return;

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to vote.");
  const { error: voteError } = await supabase
    .from("vault_votes")
    .upsert({ user_id: userId, target_type: targetType, target_id: targetId, vote }, { onConflict: "user_id,target_type,target_id" });
  if (voteError) throw voteError;
}
