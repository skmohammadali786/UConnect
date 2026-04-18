const DEFAULT_APP_LINK_DOMAIN = "uconnect.app";
const APP_DEEP_LINK_SCHEME = "uconnect://";

function normalizeDomain(domainInput?: string) {
  const value = (domainInput || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return value || DEFAULT_APP_LINK_DOMAIN;
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment.trim());
  } catch {
    return segment.trim();
  }
}

export function buildPostShareLink(postId: string) {
  const id = encodeURIComponent(postId.trim());
  const configuredDomain = (process.env.EXPO_PUBLIC_APP_LINK_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN || "").trim();
  if (!configuredDomain) {
    return `${APP_DEEP_LINK_SCHEME}post/${id}`;
  }
  const domain = normalizeDomain(configuredDomain);
  return `https://${domain}/post/${id}`;
}

export function extractPostIdFromLink(url: string): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;

  const fromPath = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === "post");
    if (idx < 0 || !parts[idx + 1]) return null;
    const id = decodeSegment(parts[idx + 1]);
    return id || null;
  };

  if (raw.startsWith("uconnect://")) {
    const normalized = raw.replace("uconnect://", "uconnect:///");
    try {
      const parsed = new URL(normalized);
      return fromPath(parsed.pathname);
    } catch {
      const direct = raw.match(/\/post\/([^/?#\s]+)/i)?.[1];
      return direct ? decodeSegment(direct) : null;
    }
  }

  try {
    const parsed = new URL(raw);
    const fromQuery = parsed.searchParams.get("postId") || parsed.searchParams.get("pid");
    if (fromQuery) return decodeSegment(fromQuery);
    return fromPath(parsed.pathname);
  } catch {
    const fallback = raw.match(/\/post\/([^/?#\s]+)/i)?.[1];
    return fallback ? decodeSegment(fallback) : null;
  }
}
