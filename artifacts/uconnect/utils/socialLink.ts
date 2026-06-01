export type SocialLinkInfo = {
  url: string;
  label: string;
  icon: "instagram" | "linkedin" | "twitter" | "facebook" | "youtube" | "github" | "web";
};

const SOCIAL_HOSTS: Array<{ pattern: RegExp; label: string; icon: SocialLinkInfo["icon"] }> = [
  { pattern: /(^|\.)instagram\.com$/i, label: "Instagram", icon: "instagram" },
  { pattern: /(^|\.)linkedin\.com$/i, label: "LinkedIn", icon: "linkedin" },
  { pattern: /(^|\.)(x|twitter)\.com$/i, label: "X", icon: "twitter" },
  { pattern: /(^|\.)facebook\.com$/i, label: "Facebook", icon: "facebook" },
  { pattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, label: "YouTube", icon: "youtube" },
  { pattern: /(^|\.)github\.com$/i, label: "GitHub", icon: "github" },
];

export function normalizeSocialLink(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSocialLinkInfo(value?: string | null): SocialLinkInfo | null {
  const url = normalizeSocialLink(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const social = SOCIAL_HOSTS.find((item) => item.pattern.test(host));
    return {
      url,
      label: social?.label ?? host,
      icon: social?.icon ?? "web",
    };
  } catch {
    return null;
  }
}
