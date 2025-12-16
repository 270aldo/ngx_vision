import { getBucket } from "./firebaseAdmin";

export async function downloadFileBuffer(storagePath: string): Promise<{ buffer: Buffer; contentType?: string }> {
  const file = getBucket().file(storagePath);
  const [metadata] = await file.getMetadata();
  const [buffer] = await file.download();
  return { buffer, contentType: metadata.contentType };
}

export async function getSignedUrl(storagePath: string, opts?: { expiresInSeconds?: number }): Promise<string> {
  const file = getBucket().file(storagePath);
  const expires = Date.now() + (opts?.expiresInSeconds ?? 3600) * 1000;
  const [url] = await file.getSignedUrl({ action: "read", expires });
  return url;
}

export async function uploadBuffer(storagePath: string, buffer: Buffer, contentType: string) {
  const file = getBucket().file(storagePath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    public: false,
    metadata: { cacheControl: "no-cache, no-store, must-revalidate" },
  });
  return storagePath;
}

export async function deletePath(storagePath: string) {
  const file = getBucket().file(storagePath);
  await file.delete({ ignoreNotFound: true });
}

export async function deletePrefix(prefix: string) {
  const [files] = await getBucket().getFiles({ prefix });
  await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true })));
}

/**
 * Upload video buffer to Firebase Storage
 */
export async function uploadVideo(
  storagePath: string,
  buffer: Buffer,
  contentType: string = "video/mp4"
): Promise<string> {
  const file = getBucket().file(storagePath);
  await file.save(buffer, {
    contentType,
    resumable: true, // Use resumable for larger video files
    public: false,
    metadata: {
      cacheControl: "public, max-age=31536000", // Cache for 1 year
      contentDisposition: `inline; filename="${storagePath.split("/").pop()}"`,
    },
  });
  return storagePath;
}

/**
 * Get signed URL for video with longer expiration
 */
export async function getVideoSignedUrl(
  storagePath: string,
  opts?: { expiresInSeconds?: number }
): Promise<string> {
  const file = getBucket().file(storagePath);
  const expires = Date.now() + (opts?.expiresInSeconds ?? 7200) * 1000; // Default 2 hours
  const [url] = await file.getSignedUrl({ action: "read", expires });
  return url;
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  const file = getBucket().file(storagePath);
  const [exists] = await file.exists();
  return exists;
}

