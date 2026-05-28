const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const FALLBACK_MIME_TYPES = [
  { extension: ".md", mimeType: "text/markdown" },
  { extension: ".txt", mimeType: "text/plain" },
  { extension: ".docx", mimeType: DOCX_MIME_TYPE },
  { extension: ".png", mimeType: "image/png" },
  { extension: ".jpg", mimeType: "image/jpeg" },
  { extension: ".jpeg", mimeType: "image/jpeg" },
  { extension: ".webp", mimeType: "image/webp" },
  { extension: ".gif", mimeType: "image/gif" },
] as const;

const ALLOWED_ASSET_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/markdown",
  DOCX_MIME_TYPE,
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function getAssetMimeType(file: File) {
  return file.type || getFallbackMimeType(file.name);
}

export function getFallbackMimeType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  const match = FALLBACK_MIME_TYPES.find(({ extension }) =>
    lowerName.endsWith(extension),
  );

  return match?.mimeType ?? "application/octet-stream";
}

export function isAllowedAssetFile(file: File) {
  return ALLOWED_ASSET_MIME_TYPES.has(getAssetMimeType(file));
}

export async function extractAssetText(file: File) {
  const mimeType = getAssetMimeType(file);
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "application/markdown"
  ) {
    return file.text();
  }

  return null;
}
