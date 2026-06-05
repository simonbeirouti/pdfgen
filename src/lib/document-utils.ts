import {
  areDocumentThemesEqual,
  contentBlocksToText,
  editableTextToContentBlocks,
  getPagePreset,
  normalizeDocumentContentBlocks,
  normalizeDocumentTheme,
  type DocumentContentBlock,
  type DocumentRow,
  type DocumentTheme,
  type PagePreset,
} from "@/lib/documents";

export type SavePatch = Pick<
  DocumentRow,
  | "title"
  | "formatted_content"
  | "content_blocks"
  | "page_preset"
  | "custom_width"
  | "custom_height"
  | "theme"
>;

type DraftState = {
  title: string;
  contentBlocks: DocumentContentBlock[];
  pagePreset: PagePreset;
  customWidth: number;
  customHeight: number;
  theme: DocumentTheme;
};

type EditableDocumentState = DraftState;

export function getEditableContentBlocks(
  document: Pick<DocumentRow, "formatted_content" | "content_blocks">,
) {
  const contentBlocks = normalizeDocumentContentBlocks(
    document.content_blocks,
  );

  return contentBlocks.length
    ? contentBlocks
    : editableTextToContentBlocks(document.formatted_content);
}

export function createEditableDocumentJson({
  title,
  contentBlocks,
  pagePreset,
  customWidth,
  customHeight,
  theme,
}: EditableDocumentState) {
  return JSON.stringify(
    {
      title: title.trim() || "Untitled",
      page_preset: pagePreset,
      custom_width: pagePreset === "custom" ? customWidth : null,
      custom_height: pagePreset === "custom" ? customHeight : null,
      theme: normalizeDocumentTheme(theme),
      content_blocks: normalizeDocumentContentBlocks(contentBlocks),
    },
    null,
    2,
  );
}

const SLUG_UNSAFE_CHARACTERS = /[^a-z0-9]+/g;
const SLUG_EDGE_DASHES = /(^-|-$)/g;

export function createSavePatch({
  title,
  contentBlocks,
  pagePreset,
  customWidth,
  customHeight,
  theme,
}: DraftState): SavePatch {
  const normalizedContentBlocks =
    normalizeDocumentContentBlocks(contentBlocks);

  return {
    title: title.trim() || "Untitled",
    formatted_content: contentBlocksToText(normalizedContentBlocks),
    content_blocks: normalizedContentBlocks,
    page_preset: pagePreset,
    custom_width: pagePreset === "custom" ? customWidth : null,
    custom_height: pagePreset === "custom" ? customHeight : null,
    theme: normalizeDocumentTheme(theme),
  };
}

export function createSavePatchFromDocumentJson(
  value: string,
  fallback: EditableDocumentState,
): SavePatch {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? `Document JSON is invalid: ${error.message}`
        : "Document JSON is invalid.",
      { cause: error },
    );
  }

  if (Array.isArray(parsed)) {
    return createSavePatch({
      ...fallback,
      contentBlocks: normalizeDocumentContentBlocks(parsed),
    });
  }

  if (!isRecord(parsed)) {
    throw new Error("Document JSON must be an object or content block array.");
  }

  const pagePreset =
    typeof parsed.page_preset === "string"
      ? getPagePreset(parsed.page_preset).value
      : fallback.pagePreset;
  const customWidth = normalizePositiveNumber(
    parsed.custom_width,
    fallback.customWidth,
  );
  const customHeight = normalizePositiveNumber(
    parsed.custom_height,
    fallback.customHeight,
  );

  return createSavePatch({
    title: typeof parsed.title === "string" ? parsed.title : fallback.title,
    contentBlocks:
      "content_blocks" in parsed
        ? normalizeDocumentContentBlocks(parsed.content_blocks)
        : fallback.contentBlocks,
    pagePreset,
    customWidth,
    customHeight,
    theme: normalizeDocumentTheme(parsed.theme ?? fallback.theme),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

export function hasSavePatchChanged(current: SavePatch, next: SavePatch) {
  return (
    current.title !== next.title ||
    current.formatted_content !== next.formatted_content ||
    JSON.stringify(current.content_blocks) !==
      JSON.stringify(next.content_blocks) ||
    current.page_preset !== next.page_preset ||
    current.custom_width !== next.custom_width ||
    current.custom_height !== next.custom_height ||
    !areDocumentThemesEqual(current.theme, next.theme)
  );
}

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "asset";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

export function sortDocuments(documents: DocumentRow[]) {
  return [...documents].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

export function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(SLUG_UNSAFE_CHARACTERS, "-")
      .replace(SLUG_EDGE_DASHES, "") || "document"
  );
}
