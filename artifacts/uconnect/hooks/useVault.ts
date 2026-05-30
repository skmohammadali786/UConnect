import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { fetchVaultSummary, createVaultAlert, nominateVaultLegend, joinVaultDebate, createVaultDebate, createVaultWikiArticle, voteVaultTarget } from "@/services/vault";

export function useVaultSummary(profileUserId?: string) {
  const { user } = useAuth();
  const userId = profileUserId ?? user?.id;
  const query = useQuery({
    queryKey: ["vault-summary", userId],
    queryFn: () => fetchVaultSummary(userId),
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`vault-home-${userId ?? "public"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_alerts" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_debates" }, () => query.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_nominations" }, () => query.refetch())
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
