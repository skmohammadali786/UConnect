import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES, QUERY_STALE_TIMES } from "@/constants/queryConfig";
import { useAuth } from "@/context/AuthContext";
import { fetchVaultSummary, createVaultAlert, nominateVaultLegend, joinVaultDebate, createVaultDebate, createVaultWikiArticle, voteVaultTarget, type VaultSummary } from "@/services/vault";

export function useVaultSummary(profileUserId?: string) {
  const { user } = useAuth();
  const userId = profileUserId ?? user?.id;
  const query = useQuery({
    queryKey: ["vault-summary", userId],
    queryFn: () => fetchVaultSummary(userId),
    staleTime: QUERY_STALE_TIMES.vault,
    gcTime: QUERY_CACHE_TIMES.vault,
    refetchOnWindowFocus: true,
  });

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
    voteTarget: useMutation({
      mutationFn: ({ targetType, targetId, vote }: { targetType: "legend_nomination" | "wiki_article"; targetId: string; vote?: "up" | "down" }) => voteVaultTarget(targetType, targetId, vote),
      onMutate: async ({ targetType, targetId, vote }) => {
        await queryClient.cancelQueries({ queryKey: ["vault-summary"] });
        const snapshots = queryClient.getQueriesData<VaultSummary>({ queryKey: ["vault-summary"] });
        const delta = vote === "down" ? -1 : 1;
        snapshots.forEach(([queryKey, previous]) => {
          if (!previous) return;
          queryClient.setQueryData<VaultSummary>(queryKey, {
            ...previous,
            legends: targetType === "legend_nomination"
              ? previous.legends.map((legend) => legend.id === targetId ? { ...legend, votes_count: Math.max(0, legend.votes_count + delta) } : legend)
              : previous.legends,
            wiki: targetType === "wiki_article"
              ? previous.wiki.map((article) => article.id === targetId ? { ...article, upvotes: Math.max(0, article.upvotes + delta) } : article)
              : previous.wiki,
          });
        });
        return { snapshots };
      },
      onError: (_error, _variables, context) => {
        context?.snapshots.forEach(([queryKey, previous]) => {
          queryClient.setQueryData(queryKey, previous);
        });
      },
      onSettled: invalidate,
    }),
  };
}
