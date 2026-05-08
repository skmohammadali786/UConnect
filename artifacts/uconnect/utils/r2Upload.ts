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

function inferMimeTypeFromUri(uriOrName: string): string | null {
  const clean = uriOrName.split("?")[0]?.split("#")[0] ?? "";
  const ext = clean.split(".").pop()?.toLowerCase();
  return ext ? EXTENSION_MIME_MAP[ext] ?? null : null;
}

function resolveMimeTypeForUpload(
  uri: string,
  fileType?: string,
  fileName?: string,
): { fileType: string; isDataUri: boolean } {
  const dataMatch = DATA_URI_REGEX.exec(uri);
  const resolvedType = normalizeFileType(
    fileType
      ?? dataMatch?.[1]
      ?? inferMimeTypeFromUri(uri)
      ?? inferMimeTypeFromUri(fileName ?? ""),
  );
  if (!resolvedType) {
    throw new Error("fileType is required");
  }
  return { fileType: resolvedType, isDataUri: Boolean(dataMatch) };
}

async function resolveUploadPayload(
  uri: string,
  fileType?: string,
  fileName?: string,
): Promise<{ body: Blob | ArrayBuffer; fileType: string }> {
  const dataMatch = DATA_URI_REGEX.exec(uri);
  if (dataMatch) {
    const resolvedType = normalizeFileType(fileType ?? dataMatch[1]);
    if (!resolvedType) {
      throw new Error("fileType is required");
    }
    return { body: base64ToArrayBuffer(dataMatch[2]), fileType: resolvedType };
  }

  const resolvedType = normalizeFileType(
    fileType
      ?? inferMimeTypeFromUri(uri)
      ?? inferMimeTypeFromUri(fileName ?? ""),
  );
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
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
  fieldName?: string;
  fields?: Record<string, string>;
};

type GumletPlaybackResponse = {
  status?: string;
  playbackUrl?: string | null;
};

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
): Promise<{ publicUrl: string | null; assetId: string; status: string }> {
  if (isRemoteUri(uri)) {
    throw new Error("Remote URLs must be uploaded separately");
  }

  const { fileType, isDataUri } = resolveMimeTypeForUpload(
    uri,
    options.fileType,
    options.fileName,
  );
  assertAllowedType(fileType, "video");

  const create = await supabase.functions.invoke<GumletCreateUploadResponse>(
    "gumlet-video-upload",
    { body: { action: "createUpload", fileType, fileName: options.fileName ?? undefined, maxDurationSeconds: 30 } },
  );

  if (create.error) throw create.error;
  if (!create.data?.uploadUrl || !create.data?.assetId) {
    throw new Error("Invalid Gumlet upload response");
  }

  const method = create.data.method ?? "PUT";
  const shouldUseFileSystemUpload = !isDataUri && Platform.OS !== "web";
  if (shouldUseFileSystemUpload) {
    if (method === "POST" && create.data.fields && Object.keys(create.data.fields).length > 0) {
      const uploadResult = await FileSystem.uploadAsync(create.data.uploadUrl, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: create.data.fieldName ?? "file",
        parameters: create.data.fields,
        mimeType: fileType,
      });
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Gumlet upload failed with ${uploadResult.status}`);
      }
    } else {
      if (method === "POST") {
        throw new Error("Gumlet returned POST upload method without multipart form fields");
      }

      const uploadHeaders: Record<string, string> = { ...(create.data.headers ?? {}) };
      if (!Object.keys(uploadHeaders).some((key) => key.toLowerCase() === "content-type")) {
        uploadHeaders["Content-Type"] = fileType;
      }

      const uploadResult = await FileSystem.uploadAsync(create.data.uploadUrl, uri, {
        httpMethod: method,
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: uploadHeaders,
        mimeType: fileType,
      });
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Gumlet upload failed with ${uploadResult.status}`);
      }
    }
  } else {
    const { body } = await resolveUploadPayload(uri, fileType, options.fileName);
    const videoBlob = body instanceof Blob ? body : new Blob([body], { type: fileType });
    let uploadResponse: Response;

    if (method === "POST" && create.data.fields && Object.keys(create.data.fields).length > 0) {
      const formData = new FormData();
      Object.entries(create.data.fields).forEach(([key, value]) => formData.append(key, value));
      formData.append(
        create.data.fieldName ?? "file",
        videoBlob,
        options.fileName ?? `video-${Date.now()}.mp4`,
      );

      uploadResponse = await fetch(create.data.uploadUrl, {
        method,
        body: formData,
      });
    } else {
      if (method === "POST") {
        throw new Error("Gumlet returned POST upload method without multipart form fields");
      }

      const uploadHeaders: Record<string, string> = { ...(create.data.headers ?? {}) };
      if (!Object.keys(uploadHeaders).some((key) => key.toLowerCase() === "content-type")) {
        uploadHeaders["Content-Type"] = fileType;
      }

      uploadResponse = await fetch(create.data.uploadUrl, {
        method,
        headers: uploadHeaders,
        body: videoBlob,
      });
    }

    if (!uploadResponse.ok) {
      throw new Error(`Gumlet upload failed with ${uploadResponse.status}`);
    }
  }

  const maxPolls = 20;
  let latestStatus = "processing";
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const status = await supabase.functions.invoke<GumletPlaybackResponse>(
      "gumlet-video-upload",
      { body: { action: "getPlayback", assetId: create.data.assetId } },
    );
    if (status.error) continue;
    latestStatus = status.data?.status ?? latestStatus;
    if (status.data?.playbackUrl) {
      return {
        publicUrl: status.data.playbackUrl,
        assetId: create.data.assetId,
        status: latestStatus,
      };
    }
  }

  return {
    publicUrl: null,
    assetId: create.data.assetId,
    status: latestStatus,
  };
}
