import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_VIDEO_DURATION_SECONDS = 30;

const normalizeEnv = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const safeJson = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const asStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string")
    .map(([k, v]) => [k, (v as string).trim()]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gumletApiKey = normalizeEnv(Deno.env.get("GUMLET_API_KEY"));
  const gumletSourceId = normalizeEnv(Deno.env.get("GUMLET_SOURCE_ID"));

  if (!gumletApiKey || !gumletSourceId) {
    return json({ error: "Server is missing Gumlet configuration" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = typeof body.action === "string" ? body.action : "createUpload";

  if (action === "createUpload") {
    const fileType = typeof body.fileType === "string" ? body.fileType.trim().toLowerCase() : "";
    if (!fileType.startsWith("video/")) {
      return json({ error: "Only video uploads are supported" }, 400);
    }

    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";

    const maxDurationSeconds = Number(body.maxDurationSeconds ?? MAX_VIDEO_DURATION_SECONDS);
    if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      return json({ error: `Video duration must be <= ${MAX_VIDEO_DURATION_SECONDS} seconds` }, 400);
    }

    const payload = {
      source_id: gumletSourceId,
      format: "hls",
      resolution: ["360p", "720p"],
      mp4_access: false,
      keep_original: false,
      title: fileName || `uconnect-${crypto.randomUUID()}`,
      metadata: {
        max_duration_seconds: MAX_VIDEO_DURATION_SECONDS,
        app: "uconnect",
      },
    };

    const createRes = await fetch("https://api.gumlet.com/v1/video/assets/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gumletApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const createData = await safeJson(createRes) as Record<string, unknown>;
    if (!createRes.ok) {
      console.error("gumlet create upload failed", createData);
      return json({ error: "Failed to create Gumlet upload URL", details: createData }, 502);
    }

    const uploadUrl = pickFirstString(
      createData?.upload_url,
      createData?.uploadUrl,
      createData?.url,
      createData?.upload?.url,
      createData?.upload?.upload_url,
    );
    const assetId = pickFirstString(
      createData?.asset_id,
      createData?.assetId,
      createData?.id,
      createData?.asset?.id,
    );

    if (!uploadUrl || !assetId) {
      console.error("gumlet response missing upload url/asset id", createData);
      return json({ error: "Unexpected Gumlet response", details: createData }, 502);
    }

    const fields = asStringRecord(createData?.upload?.fields ?? createData?.fields);
    const explicitMethod = pickFirstString(createData?.method, createData?.upload?.method)?.toUpperCase();
    const method = explicitMethod === "POST" || (!explicitMethod && fields)
      ? "POST"
      : "PUT";

    return json({
      uploadUrl,
      assetId,
      status: pickFirstString(createData?.status) ?? "created",
      maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
      maxResolution: "720p",
      method: method === "POST" ? "POST" : "PUT",
      headers: method === "POST" ? {} : { "Content-Type": fileType },
      fields,
      fieldName: pickFirstString(createData?.upload?.field_name, createData?.upload?.fieldName, createData?.fieldName) ?? undefined,
    });
  }

  if (action === "getPlayback") {
      type GumletAssetStatus = {
        playback_url?: string;
        playbackUrl?: string;
        output?: { hls?: string; [key: string]: unknown };
        assets?: { hls?: string; [key: string]: unknown };
        stream_url?: string;
        streamUrl?: string;
        status?: string;
        [key: string]: unknown;
      };
    const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
    if (!assetId) return json({ error: "assetId is required" }, 400);

    const statusRes = await fetch(`https://api.gumlet.com/v1/video/assets/${assetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${gumletApiKey}` },
    });

    const statusData = await safeJson(statusRes) as GumletAssetStatus;
    if (!statusRes.ok) {
      console.error("gumlet asset fetch failed", statusData);
      return json({ error: "Failed to fetch Gumlet asset", details: statusData }, 502);
    }

    const playbackUrl =
      pickFirstString(
        statusData?.playback_url,
        statusData?.playbackUrl,
        statusData?.output?.hls,
        statusData?.assets?.hls,
        statusData?.stream_url,
        statusData?.streamUrl,
      ) ?? null;

    return json({
      assetId,
      status: pickFirstString(statusData?.status) ?? "unknown",
      playbackUrl,
      raw: statusData,
    });
  }

  return json({ error: "Unsupported action" }, 400);
});
