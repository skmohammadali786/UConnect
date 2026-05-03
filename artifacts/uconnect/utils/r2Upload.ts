import { supabase } from "../lib/supabase";

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

export async function uploadImageToR2(
  file: Blob,
  fileType?: string,
): Promise<UploadResult> {
  const resolvedType = fileType ?? file.type;
  if (!resolvedType) {
    throw new Error("fileType is required");
  }

  const normalizedType = resolvedType.toLowerCase();
  if (!normalizedType.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }

  const { data, error } = await supabase.functions.invoke<SignedUploadResponse>(
    "r2-upload-url",
    {
      body: { fileType: normalizedType },
    },
  );

  if (error) {
    throw error;
  }

  if (!data?.uploadUrl || !data.publicUrl || !data.path) {
    throw new Error("Invalid signed upload response");
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: data.method ?? "PUT",
    headers: {
      "Content-Type": normalizedType,
      ...(data.headers ?? {}),
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return {
    publicUrl: data.publicUrl,
    path: data.path,
  };
}
