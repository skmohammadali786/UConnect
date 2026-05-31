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


async function buildSkillFallback(userId?: string): Promise<VaultSummary["skills"]> {
  if (!userId) return [];
  const { data: profile } = await supabase
    .from("profiles")
    .select("interests, branch")
    .eq("id", userId)
    .maybeSingle();
  const interests = Array.isArray((profile as any)?.interests) ? (profile as any).interests : [];
  const branch = typeof (profile as any)?.branch === "string" && (profile as any).branch.trim() ? [(profile as any).branch] : [];
  const names = Array.from(new Set([...interests, ...branch].map((value) => String(value).trim()).filter(Boolean))).slice(0, 7);
  return names.map((skill_name, index) => ({
    skill_name,
    strength: Math.max(35, 72 - index * 6),
    trend: index < 3 ? 4 - index : 0,
  }));
}

async function ensureRadarSkills(summary: VaultSummary, userId?: string): Promise<VaultSummary> {
  if (summary.skills.length > 0 || !userId) return summary;
  const skills = await buildSkillFallback(userId);
  if (skills.length === 0) return summary;
  return normalizeVaultSummary({
    ...summary,
    skills,
    skillStrength: Math.round(skills.reduce((sum, skill) => sum + skill.strength, 0) / skills.length),
  });
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
    if (!error && data) return ensureRadarSkills(normalizeVaultSummary(data as Partial<VaultSummary>), userId);
  } catch {}

  const settled = await Promise.allSettled([
    userId ? supabase.from("vault_scores").select("score, level, campus_rank").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("vault_nominations").select("id, category, nominee_username, votes_count").eq("status", "active").order("votes_count", { ascending: false }).limit(6),
    supabase.from("vault_debates").select("id, title, ends_at, for_count, against_count").eq("status", "active").order("ends_at", { ascending: true }).limit(5),
    supabase.from("vault_alerts").select("id, title, category, priority, expires_at").eq("status", "active").order("priority_rank", { ascending: true }).order("created_at", { ascending: false }).limit(5),
    supabase.from("vault_wiki_articles").select("id, title, category, upvotes, view_count").eq("status", "published").order("upvotes", { ascending: false }).limit(5),
    userId ? supabase.from("vault_skills").select("skill_name, strength, trend").eq("user_id", userId).order("strength", { ascending: false }).limit(9) : Promise.resolve({ data: [] }),
    userId ? supabase.from("vault_legend_badges").select("id, label, category, awarded_at").eq("user_id", userId).order("awarded_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
  ]);
  const result = <T,>(index: number, fallbackValue: T): T => {
    const item = settled[index];
    if (item?.status !== "fulfilled" || (item.value as any)?.error) return fallbackValue;
    return item.value as T;
  };
  const scoreRes = result(0, { data: null } as any);
  const legendsRes = result(1, { data: [] } as any);
  const debatesRes = result(2, { data: [] } as any);
  const alertsRes = result(3, { data: [] } as any);
  const wikiRes = result(4, { data: [] } as any);
  const skillsRes = result(5, { data: [] } as any);
  const badgesRes = result(6, { data: [] } as any);
  const score = (scoreRes.data as any)?.score ?? 0;
  const skills = ((skillsRes.data ?? []) as VaultSummary["skills"]).length
    ? (skillsRes.data ?? []) as VaultSummary["skills"]
    : await buildSkillFallback(userId);
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

function isMissingRpc(error: any) {
  return typeof error?.message === "string" && error.message.includes("Could not find the function");
}

export async function nominateVaultLegend(input: { nominee_id: string; category: string; reason: string }) {
  const payload = {
    nominee_id: input.nominee_id,
    category: input.category?.trim() || "Campus Legend",
    reason: input.reason?.trim() || "Nominated from The Vault.",
  };
  const { data, error } = await supabase.rpc("nominate_vault_legend", payload);
  if (!error) return data;
  if (!isMissingRpc(error)) throw error;

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to nominate a legend.");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", payload.nominee_id).maybeSingle();
  const { data: inserted, error: insertError } = await supabase
    .from("vault_nominations")
    .insert({ nominee_id: payload.nominee_id, nominee_username: (profile as any)?.username ?? "Unknown student", nominator_id: userId, category: payload.category, reason: payload.reason })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted?.id;
}

export async function joinVaultDebate(input: { debate_id: string; side: DebateSide; body: string; alias?: string }) {
  const payload = {
    debate_id: input.debate_id,
    side: input.side,
    body: input.body?.trim() || `Joining the ${input.side} side.`,
    alias: input.alias?.trim() || null,
  };
  const { data, error } = await supabase.rpc("join_vault_debate", payload);
  if (!error) return data;
  if (!isMissingRpc(error)) throw error;

  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to join a debate.");
  const alias = payload.alias || `Vault Ghost ${Math.floor(Math.random() * 900 + 100)}`;
  const { data: inserted, error: insertError } = await supabase
    .from("vault_arguments")
    .insert({ debate_id: payload.debate_id, author_id: userId, anonymous_alias: alias, side: payload.side, body: payload.body })
    .select("id")
    .single();
  if (insertError) throw insertError;
  const { data: debate } = await supabase.from("vault_debates").select("for_count, against_count").eq("id", payload.debate_id).maybeSingle();
  await supabase
    .from("vault_debates")
    .update(payload.side === "for"
      ? { for_count: ((debate as any)?.for_count ?? 0) + 1 }
      : { against_count: ((debate as any)?.against_count ?? 0) + 1 })
    .eq("id", payload.debate_id);
  return inserted?.id;
}

export async function createVaultDebate({ title, description }: { title: string; description: string }) {
  const safeTitle = title?.trim();
  if (!safeTitle) throw new Error("Add a debate title.");
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to create a debate.");
  const { data, error } = await supabase
    .from("vault_debates")
    .insert({ creator_id: userId, title: safeTitle, description: description?.trim() ?? "", status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createVaultWikiArticle({ title, category, content }: { title: string; category: string; content: string }) {
  const safeTitle = title?.trim();
  const safeContent = content?.trim();
  if (!safeTitle) throw new Error("Add an article title.");
  if (!safeContent) throw new Error("Add article content.");
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sign in to create a wiki article.");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  const baseSlug = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "vault-article";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("vault_wiki_articles")
    .insert({
      author_id: userId,
      author_username: (profile as any)?.username ?? "vault-user",
      title: safeTitle,
      slug,
      category: category?.trim() || "Academics",
      body_markdown: safeContent,
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
  const { data: existing } = await supabase
    .from("vault_votes")
    .select("vote")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  const { error: voteError } = await supabase
    .from("vault_votes")
    .upsert({ user_id: userId, target_type: targetType, target_id: targetId, vote }, { onConflict: "user_id,target_type,target_id" });
  if (voteError) throw voteError;
  if ((existing as any)?.vote === vote) return;

  const table = targetType === "wiki_article" ? "vault_wiki_articles" : "vault_nominations";
  const countColumn = targetType === "wiki_article" ? "upvotes" : "votes_count";
  const { data: target } = await supabase.from(table).select(countColumn).eq("id", targetId).maybeSingle();
  const previousDelta = (existing as any)?.vote === "up" ? -1 : (existing as any)?.vote === "down" ? 1 : 0;
  const nextDelta = vote === "up" ? 1 : -1;
  await supabase
    .from(table)
    .update({ [countColumn]: Math.max(0, ((target as any)?.[countColumn] ?? 0) + previousDelta + nextDelta) })
    .eq("id", targetId);
}
