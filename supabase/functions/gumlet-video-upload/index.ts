import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_VIDEO_DURATION_SECONDS = 30;

const pickPlaybackUrl = (data: any): string | null =>
  data?.playback_url
  ?? data?.playbackUrl
  ?? data?.output?.playback_url
  ?? data?.output?.playbackUrl
  ?? data?.output?.hls
  ?? data?.assets?.hls
  ?? data?.hls_url
  ?? data?.hlsUrl
  ?? null;

const normalizeEnv = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error("gumlet create upload failed", createData);
      return json({ error: "Failed to create Gumlet upload URL", details: createData }, 502);
    }

    return json({
      uploadUrl: createData.upload_url,
      assetId: createData.asset_id,
      status: createData.status ?? "created",
      maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
      maxResolution: "720p",
      method: "PUT",
      headers: {
        "Content-Type": fileType,
      },
    });
  }

  if (action === "getPlayback") {
    const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
    if (!assetId) return json({ error: "assetId is required" }, 400);

    const statusRes = await fetch(`https://api.gumlet.com/v1/video/assets/${assetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${gumletApiKey}` },
    });

    const statusData = await statusRes.json();
    if (!statusRes.ok) {
      console.error("gumlet asset fetch failed", statusData);
      return json({ error: "Failed to fetch Gumlet asset", details: statusData }, 502);
    }

    const playbackUrl = pickPlaybackUrl(statusData);

    return json({
      assetId,
      status: statusData?.status ?? "unknown",
      playbackUrl,
      raw: statusData,
    });
  }

  return json({ error: "Unsupported action" }, 400);
});
