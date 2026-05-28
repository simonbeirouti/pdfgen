import {
  areDocumentThemesEqual,
  contentBlocksToText,
  editableTextToContentBlocks,
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
  contentText: string;
  pagePreset: PagePreset;
  customWidth: number;
  customHeight: number;
  theme: DocumentTheme;
};

export function getEditableContentText(
  document: Pick<DocumentRow, "formatted_content" | "content_blocks">,
) {
  const blockText = contentBlocksToText(
    normalizeDocumentContentBlocks(document.content_blocks),
  );

  return blockText.trim() ? blockText : document.formatted_content;
}

const SLUG_UNSAFE_CHARACTERS = /[^a-z0-9]+/g;
const SLUG_EDGE_DASHES = /(^-|-$)/g;

export function createSavePatch({
  title,
  contentText,
  pagePreset,
  customWidth,
  customHeight,
  theme,
}: DraftState): SavePatch {
  const contentBlocks: DocumentContentBlock[] =
    editableTextToContentBlocks(contentText);

  return {
    title: title.trim() || "Untitled",
    formatted_content: contentBlocksToText(contentBlocks),
    content_blocks: contentBlocks,
    page_preset: pagePreset,
    custom_width: pagePreset === "custom" ? customWidth : null,
    custom_height: pagePreset === "custom" ? customHeight : null,
    theme: normalizeDocumentTheme(theme),
  };
}

export function hasDocumentChanged(document: DocumentRow, patch: SavePatch) {
  return hasSavePatchChanged(createSavePatchFromDocument(document), patch);
}

export function createSavePatchFromDocument(document: DocumentRow): SavePatch {
  return createSavePatch({
    title: document.title,
    contentText: getEditableContentText(document),
    pagePreset: document.page_preset,
    customWidth: document.custom_width ?? 595,
    customHeight: document.custom_height ?? 842,
    theme: normalizeDocumentTheme(document.theme),
  });
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
