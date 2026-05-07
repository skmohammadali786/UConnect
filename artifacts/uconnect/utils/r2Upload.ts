import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

const DATA_URI_REGEX = /^data:([^;]+);base64,(.*)$/i;
const HTTP_URI_REGEX = /^https?:\/\//i;
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP: Record<string, number> = Object.fromEntries(
  [...BASE64_CHARS].map((char, index) => [char, index]),
);

type MediaKind = "image" | "video" | "any";

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
};

function normalizeFileType(fileType: string | null | undefined): string | null {
  const normalized = fileType?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/=+$/, "");
  let bytes = 0;
  let buffer = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64_LOOKUP[clean[i]];
    if (value === undefined) continue;
    buffer = (buffer << 6) | value;
    bytes += 6;
    if (bytes >= 8) {
      bytes -= 8;
      out.push((buffer >> bytes) & 0xff);
    }
  }
  return Uint8Array.from(out).buffer;
}

export function isRemoteUri(uri: string): boolean {
  return HTTP_URI_REGEX.test(uri);
}

function inferMimeTypeFromUri(uri: string): string | null {
  const clean = uri.split("?")[0]?.split("#")[0] ?? "";
  const ext = clean.split(".").pop()?.toLowerCase();
  return ext ? EXTENSION_MIME_MAP[ext] ?? null : null;
}

async function resolveUploadPayload(
  uri: string,
  fileType?: string,
): Promise<{ body: Blob | ArrayBuffer; fileType: string }> {
  const dataMatch = DATA_URI_REGEX.exec(uri);
  if (dataMatch) {
    const resolvedType = normalizeFileType(fileType ?? dataMatch[1]);
    if (!resolvedType) {
      throw new Error("fileType is required");
    }
    return { body: base64ToArrayBuffer(dataMatch[2]), fileType: resolvedType };
  }

  const resolvedType = normalizeFileType(fileType ?? inferMimeTypeFromUri(uri));
  if (!resolvedType) {
    throw new Error("fileType is required");
  }

  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return { body: await res.blob(), fileType: resolvedType };
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  return { body: base64ToArrayBuffer(base64), fileType: resolvedType };
}

function assertAllowedType(fileType: string, kind: MediaKind) {
  if (kind === "image" && !fileType.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }
  if (kind === "video" && !fileType.startsWith("video/")) {
    throw new Error("Only video uploads are supported");
  }
  if (kind === "any" && !fileType.startsWith("image/") && !fileType.startsWith("video/")) {
    throw new Error("Only image or video uploads are supported");
  }
}

export type SignedUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
};

export type UploadResult = {
  publicUrl: string;
  path: string;
};

type GumletCreateUploadResponse = {
  uploadUrl: string;
  assetId: string;
  playbackUrl?: string | null;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
};

type GumletPlaybackResponse = {
  status?: string;
  playbackUrl?: string | null;
};

type GumletUploadResult = {
  publicUrl: string;
  assetId: string;
  status: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function uploadToR2(
  file: Blob | ArrayBuffer,
  fileType: string,
): Promise<UploadResult> {
  const { data, error } = await supabase.functions.invoke<SignedUploadResponse>(
    "r2-upload-url",
    {
      body: { fileType },
    },
  );

  if (error) {
    throw error;
  }

  if (!data?.uploadUrl || !data.publicUrl || !data.path) {
    throw new Error("Invalid signed upload response");
  }

  const headers: Record<string, string> = { ...(data.headers ?? {}) };
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type",
  );
  if (!hasContentType) {
    headers["Content-Type"] = fileType;
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: data.method ?? "PUT",
    headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`,
    );
  }

  return {
    publicUrl: data.publicUrl,
    path: data.path,
  };
}

export async function uploadImageToR2(
  file: Blob,
  fileType?: string,
): Promise<UploadResult> {
  const resolvedType = normalizeFileType(fileType ?? file.type);
  if (!resolvedType) {
    throw new Error("fileType is required");
  }
  assertAllowedType(resolvedType, "image");
  return uploadToR2(file, resolvedType);
}

export async function uploadMediaUriToR2(
  uri: string,
  options: { fileType?: string; kind?: MediaKind } = {},
): Promise<UploadResult> {
  if (isRemoteUri(uri)) {
    throw new Error("Remote URLs must be uploaded separately");
  }
  const { body, fileType } = await resolveUploadPayload(uri, options.fileType);
  const kind = options.kind ?? "any";
  assertAllowedType(fileType, kind);
  return uploadToR2(body, fileType);
}

export async function uploadVideoUriToGumlet(
  uri: string,
  options: { fileType?: string; fileName?: string } = {},
): Promise<GumletUploadResult> {
  if (isRemoteUri(uri)) {
    throw new Error("Remote URLs must be uploaded separately");
  }

  const { body, fileType } = await resolveUploadPayload(uri, options.fileType);
  assertAllowedType(fileType, "video");

  const create = await supabase.functions.invoke<GumletCreateUploadResponse>(
    "gumlet-video-upload",
    { body: { action: "createUpload", fileType, fileName: options.fileName ?? undefined, maxDurationSeconds: 30 } },
  );

  if (create.error) throw create.error;
  if (!create.data?.uploadUrl || !create.data?.assetId) {
    throw new Error("Invalid Gumlet upload response");
  }

  const uploadHeaders: Record<string, string> = { ...(create.data.headers ?? {}) };
  if (!Object.keys(uploadHeaders).some((key) => key.toLowerCase() === "content-type")) {
    uploadHeaders["Content-Type"] = fileType;
  }

  const uploadResponse = await fetch(create.data.uploadUrl, {
    method: create.data.method ?? "PUT",
    headers: uploadHeaders,
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Gumlet upload failed with ${uploadResponse.status}`);
  }

  if (create.data.playbackUrl) {
    return {
      publicUrl: create.data.playbackUrl,
      assetId: create.data.assetId,
      status: "ready",
    };
  }

  const maxPolls = 40;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await sleep(3000);
    const status = await supabase.functions.invoke<GumletPlaybackResponse>(
      "gumlet-video-upload",
      { body: { action: "getPlayback", assetId: create.data.assetId } },
    );
    if (status.error) continue;
    if (status.data?.playbackUrl) {
      return {
        publicUrl: status.data.playbackUrl,
        assetId: create.data.assetId,
        status: status.data.status ?? "ready",
      };
    }
  }

  throw new Error("Video uploaded, but processing is not finished yet. Please retry posting in 1-2 minutes.");
}

