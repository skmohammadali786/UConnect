import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const encoder = new TextEncoder();

const UPLOAD_URL_EXPIRY_SECONDS = 900;

const encodeRfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hmacSha256 = async (
  key: ArrayBuffer | string,
  message: string,
): Promise<ArrayBuffer> => {
  const rawKey = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
};

const sha256Hex = async (message: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(message)));

const buildCanonicalQueryString = (
  params: Record<string, string>,
): string =>
  Object.keys(params)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(params[key])}`)
    .join("&");

const normalizeEnv = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const getFileExtension = (fileType: string): string => {
  const subtype = fileType.split("/")[1] ?? "bin";
  const normalized = subtype.split("+")[0].toLowerCase();
  if (normalized === "jpeg") {
    return "jpg";
  }
  if (normalized === "quicktime") {
    return "mov";
  }
  if (normalized === "x-msvideo") {
    return "avi";
  }
  return normalized;
};

const buildObjectPath = (endpointPath: string, bucket: string, key: string) => {
  const basePath = endpointPath.replace(/^\/+|\/+$/g, "");
  const segments = [basePath, bucket, key].filter(Boolean);
  return `/${segments.map((segment) => encodeRfc3986(segment)).join("/")}`;
};

const createSignedUploadUrl = async ({
  accessKey,
  secretKey,
  endpoint,
  bucket,
  key,
  contentType,
  expiresInSeconds,
}: {
  accessKey: string;
  secretKey: string;
  endpoint: string;
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds: number;
}) => {
  const url = new URL(endpoint);
  const host = url.host;
  const canonicalUri = buildObjectPath(url.pathname, bucket, key);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalHeaders = `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n`;
  const signedHeaders = "host;x-amz-content-sha256";

  const canonicalQueryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": `${expiresInSeconds}`,
    "X-Amz-SignedHeaders": signedHeaders,
  };

  const canonicalQueryString = buildCanonicalQueryString(
    canonicalQueryParams,
  );

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const dateKey = await hmacSha256(`AWS4${secretKey}`, dateStamp);
  const regionKey = await hmacSha256(dateKey, region);
  const serviceKey = await hmacSha256(regionKey, "s3");
  const signingKey = await hmacSha256(serviceKey, "aws4_request");
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const signedUrl =
    `${url.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl: signedUrl,
    contentType,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { fileType?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const rawFileType = body?.fileType;
  if (typeof rawFileType !== "string") {
    return new Response(JSON.stringify({ error: "fileType is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileType = rawFileType.trim().toLowerCase();
  if (!fileType.startsWith("image/") && !fileType.startsWith("video/")) {
    return new Response(
      JSON.stringify({ error: "Only image or video uploads are supported" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const accessKey = normalizeEnv(Deno.env.get("R2_ACCESS_KEY"));
  const secretKey = normalizeEnv(Deno.env.get("R2_SECRET_KEY"));
  const endpoint = normalizeEnv(Deno.env.get("R2_ENDPOINT"));
  const bucket = normalizeEnv(Deno.env.get("R2_BUCKET"));
  const publicUrl = normalizeEnv(Deno.env.get("R2_PUBLIC_URL"));

  if (!accessKey || !secretKey || !endpoint || !bucket || !publicUrl) {
    return new Response(
      JSON.stringify({ error: "Server is missing R2 configuration" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const extension = getFileExtension(fileType);
  const objectKey = `uploads/${crypto.randomUUID()}.${extension}`;

  try {
    const { uploadUrl, contentType } = await createSignedUploadUrl({
      accessKey,
      secretKey,
      endpoint,
      bucket,
      key: objectKey,
      contentType: fileType,
      expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS,
    });

    const publicPath = objectKey
      .split("/")
      .map((segment) => encodeRfc3986(segment))
      .join("/");

    const basePublicUrl = publicUrl.replace(/\/+$/g, "");

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl: `${basePublicUrl}/${publicPath}`,
        path: objectKey,
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "x-amz-content-sha256": payloadHash,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Failed to create signed URL", error);
    return new Response(
      JSON.stringify({ error: "Failed to create signed upload URL" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
