import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { fetchVaultSummary, createVaultAlert, nominateVaultLegend, joinVaultDebate, createVaultDebate, createVaultWikiArticle, voteVaultTarget } from "@/services/vault";

export function useVaultSummary(profileUserId?: string) {
  const { user } = useAuth();
  const userId = profileUserId ?? user?.id;
  const subscriptionId = useRef(`vault-${Math.random().toString(36).slice(2)}`);
  const query = useQuery({
    queryKey: ["vault-summary", userId],
    queryFn: () => fetchVaultSummary(userId),
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`vault-home-${userId ?? "public"}-${subscriptionId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_alerts" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_debates" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_nominations" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_legend_badges" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_scores" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_wiki_articles" }, () => query.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [query.refetch, userId]);

  return query;
}

export function useVaultActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vault-summary"] });
  return {
    createAlert: useMutation({ mutationFn: createVaultAlert, onSuccess: invalidate }),
    nominateLegend: useMutation({ mutationFn: nominateVaultLegend, onSuccess: invalidate }),
    joinDebate: useMutation({ mutationFn: joinVaultDebate, onSuccess: invalidate }),
    createDebate: useMutation({ mutationFn: createVaultDebate, onSuccess: invalidate }),
    createWikiArticle: useMutation({ mutationFn: createVaultWikiArticle, onSuccess: invalidate }),
    voteTarget: useMutation({ mutationFn: ({ targetType, targetId, vote }: { targetType: "legend_nomination" | "wiki_article"; targetId: string; vote?: "up" | "down" }) => voteVaultTarget(targetType, targetId, vote), onSuccess: invalidate }),
  };
}
