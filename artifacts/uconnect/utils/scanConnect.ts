export function buildScanConnectQrValue(username: string) {
  return `uconnect://user/${encodeURIComponent(username.trim().toLowerCase())}`;
}

export function extractUsernameFromScanPayload(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  const normalize = (candidate: string) => {
    const clean = decodeURIComponent(candidate.replace(/^@/, "").trim().toLowerCase());
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) return null;
    return clean;
  };

  if (raw.startsWith("uconnect://user/")) {
    return normalize(raw.replace("uconnect://user/", "").split(/[/?#\s]/)[0] || "");
  }

  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const userIndex = parts.findIndex((p) => p.toLowerCase() === "user");
    if (userIndex >= 0 && parts[userIndex + 1]) {
      return normalize(parts[userIndex + 1]);
    }
  } catch {}

  const slashPath = raw.split(/[?#\s]/)[0];
  if (slashPath.includes("/user/")) {
    const candidate = slashPath.split("/user/")[1]?.split("/")[0] || "";
    return normalize(candidate);
  }

  return normalize(raw);
}
