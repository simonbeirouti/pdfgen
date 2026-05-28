export const OPENAI_MODEL_OPTIONS = [
  { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.5", label: "GPT-5.5" },
] as const;

export const DEFAULT_MODEL = OPENAI_MODEL_OPTIONS[0].value;

export type OpenAIModel = (typeof OPENAI_MODEL_OPTIONS)[number]["value"];

export const DOCUMENT_THEME_PRESET_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "compact", label: "Compact" },
  { value: "presentation", label: "Presentation" },
] as const;

export type DocumentThemePreset =
  (typeof DOCUMENT_THEME_PRESET_OPTIONS)[number]["value"];

export const DOCUMENT_THEME_FONT_OPTIONS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times" },
  { value: "Courier", label: "Courier" },
] as const;

export type DocumentThemeFont =
  (typeof DOCUMENT_THEME_FONT_OPTIONS)[number]["value"];

export const DOCUMENT_THEME_ACCENT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0f172a",
] as const;

export const DOCUMENT_THEME_MARGIN_MIN = 24;
export const DOCUMENT_THEME_MARGIN_MAX = 72;
export const DOCUMENT_THEME_MARGIN_STEP = 2;

export const DOCUMENT_THEME_IMAGE_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const;

export type DocumentThemeImageSize =
  (typeof DOCUMENT_THEME_IMAGE_SIZE_OPTIONS)[number]["value"];

export type DocumentTheme = {
  preset: DocumentThemePreset;
  fontFamily: DocumentThemeFont;
  accentColor: string;
  fontScale: number;
  margin: number;
  imageSize: DocumentThemeImageSize;
  text: {
    h1: {
      fontSize: number;
      lineHeight: number;
      spacingAfter: number;
    };
    p: {
      fontSize: number;
      lineHeight: number;
      spacingAfter: number;
    };
    li: {
      fontSize: number;
      lineHeight: number;
      spacingAfter: number;
    };
  };
};

type TextThemeStyle = {
  fontSize: number;
  lineHeight: number;
  spacingAfter: number;
};

export const DEFAULT_DOCUMENT_THEME: DocumentTheme = {
  preset: "classic",
  fontFamily: "Helvetica",
  accentColor: "#2563eb",
  fontScale: 1,
  margin: 42,
  imageSize: "medium",
  text: {
    h1: { fontSize: 22, lineHeight: 1.2, spacingAfter: 12 },
    p: { fontSize: 11, lineHeight: 1.55, spacingAfter: 8 },
    li: { fontSize: 11, lineHeight: 1.45, spacingAfter: 4 },
  },
};

export const DOCUMENT_THEME_PRESETS: Record<
  DocumentThemePreset,
  DocumentTheme
> = {
  classic: DEFAULT_DOCUMENT_THEME,
  modern: {
    preset: "modern",
    fontFamily: "Helvetica",
    accentColor: "#16a34a",
    fontScale: 1,
    margin: 42,
    imageSize: "medium",
    text: {
      h1: { fontSize: 24, lineHeight: 1.15, spacingAfter: 14 },
      p: { fontSize: 11.5, lineHeight: 1.6, spacingAfter: 9 },
      li: { fontSize: 11.5, lineHeight: 1.45, spacingAfter: 5 },
    },
  },
  compact: {
    preset: "compact",
    fontFamily: "Helvetica",
    accentColor: "#0f172a",
    fontScale: 0.9,
    margin: 28,
    imageSize: "small",
    text: {
      h1: { fontSize: 18, lineHeight: 1.15, spacingAfter: 8 },
      p: { fontSize: 10, lineHeight: 1.35, spacingAfter: 5 },
      li: { fontSize: 10, lineHeight: 1.3, spacingAfter: 3 },
    },
  },
  presentation: {
    preset: "presentation",
    fontFamily: "Helvetica",
    accentColor: "#9333ea",
    fontScale: 1.2,
    margin: 56,
    imageSize: "large",
    text: {
      h1: { fontSize: 30, lineHeight: 1.1, spacingAfter: 16 },
      p: { fontSize: 15, lineHeight: 1.35, spacingAfter: 10 },
      li: { fontSize: 15, lineHeight: 1.3, spacingAfter: 6 },
    },
  },
};

export const PAGE_PRESETS = [
  { value: "a4", label: "A4", width: 595.28, height: 841.89 },
  { value: "letter", label: "Letter", width: 612, height: 792 },
  {
    value: "powerpoint-16-9",
    label: "PowerPoint 16:9",
    width: 720,
    height: 405,
  },
  {
    value: "powerpoint-4-3",
    label: "PowerPoint 4:3",
    width: 720,
    height: 540,
  },
  { value: "custom", label: "Custom", width: 595.28, height: 841.89 },
] as const;

export type PagePreset = (typeof PAGE_PRESETS)[number]["value"];

export type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  formatted_content: string;
  content_blocks: DocumentContentBlock[];
  page_preset: PagePreset;
  custom_width: number | null;
  custom_height: number | null;
  theme: DocumentTheme;
  created_at: string;
  updated_at: string;
};

export type DocumentVersionRow = {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  formatted_content: string;
  content_blocks: DocumentContentBlock[];
  page_preset: PagePreset;
  custom_width: number | null;
  custom_height: number | null;
  theme: DocumentTheme;
  source: "generation" | "pre_restore";
  version_updated_at: string;
  created_at: string;
};

export type DocumentContentBlock =
  | {
      type: "document_title";
      text: string;
    }
  | {
      type: "contact";
      text: string;
    }
  | {
      type: "summary";
      text: string;
    }
  | {
      type: "section";
      title: string;
      children: DocumentContentBlock[];
    }
  | {
      type: "experience_item";
      role: string;
      company: string;
      location: string;
      dates: string;
      bullets: string[];
    }
  | {
      type: "education_item";
      institution: string;
      qualification: string;
      dates: string;
    }
  | {
      type: "skills";
      items: string[];
      display: "inline" | "bullets";
    }
  | {
      type: "h1";
      text: string;
    }
  | {
      type: "p";
      text: string;
    }
  | {
      type: "ul";
      items: string[];
    };

export type AssetRow = {
  id: string;
  user_id: string;
  bucket_id: "document-assets";
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentMessageRow = {
  id: string;
  document_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type LinkedAsset = AssetRow & {
  signed_url?: string;
};

export function getPagePreset(value: string) {
  return PAGE_PRESETS.find((preset) => preset.value === value) ?? PAGE_PRESETS[0];
}

export function getPageSize(document: Pick<DocumentRow, "page_preset" | "custom_width" | "custom_height">) {
  if (
    document.page_preset === "custom" &&
    document.custom_width &&
    document.custom_height
  ) {
    return {
      width: document.custom_width,
      height: document.custom_height,
      label: "Custom",
    };
  }

  const preset = getPagePreset(document.page_preset);
  return {
    width: preset.width,
    height: preset.height,
    label: preset.label,
  };
}

export function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isImageAsset(asset: Pick<AssetRow, "mime_type">) {
  return asset.mime_type.startsWith("image/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isThemePreset(value: unknown): value is DocumentThemePreset {
  return DOCUMENT_THEME_PRESET_OPTIONS.some((option) => option.value === value);
}

function isThemeFont(value: unknown): value is DocumentThemeFont {
  return DOCUMENT_THEME_FONT_OPTIONS.some((option) => option.value === value);
}

function isAccentColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    DOCUMENT_THEME_ACCENT_COLORS.includes(
      value as (typeof DOCUMENT_THEME_ACCENT_COLORS)[number],
    )
  );
}

function normalizeThemeMargin(value: unknown, fallback: number) {
  return normalizeNumber(
    value,
    fallback,
    DOCUMENT_THEME_MARGIN_MIN,
    DOCUMENT_THEME_MARGIN_MAX,
  );
}

function isThemeImageSize(value: unknown): value is DocumentThemeImageSize {
  return DOCUMENT_THEME_IMAGE_SIZE_OPTIONS.some(
    (option) => option.value === value,
  );
}

function normalizeTextThemeStyle(
  value: unknown,
  fallback: TextThemeStyle,
): TextThemeStyle {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    fontSize: normalizeNumber(value.fontSize, fallback.fontSize, 6, 72),
    lineHeight: normalizeNumber(value.lineHeight, fallback.lineHeight, 1, 2.4),
    spacingAfter: normalizeNumber(
      value.spacingAfter,
      fallback.spacingAfter,
      0,
      48,
    ),
  };
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Number(value.toFixed(2))));
}

function normalizeFontScale(value: unknown) {
  return normalizeNumber(value, DEFAULT_DOCUMENT_THEME.fontScale, 0.85, 1.25);
}

export function normalizeDocumentTheme(value: unknown): DocumentTheme {
  if (!isRecord(value)) {
    return DEFAULT_DOCUMENT_THEME;
  }

  const preset = isThemePreset(value.preset)
    ? value.preset
    : DEFAULT_DOCUMENT_THEME.preset;
  const presetTheme = DOCUMENT_THEME_PRESETS[preset];

  return {
    preset,
    fontFamily: isThemeFont(value.fontFamily)
      ? value.fontFamily
      : presetTheme.fontFamily,
    accentColor: isAccentColor(value.accentColor)
      ? value.accentColor
      : presetTheme.accentColor,
    fontScale: normalizeFontScale(value.fontScale),
    margin: normalizeThemeMargin(value.margin, presetTheme.margin),
    imageSize: isThemeImageSize(value.imageSize)
      ? value.imageSize
      : presetTheme.imageSize,
    text: {
      h1: normalizeTextThemeStyle(
        isRecord(value.text) ? value.text.h1 : undefined,
        presetTheme.text.h1,
      ),
      p: normalizeTextThemeStyle(
        isRecord(value.text) ? value.text.p : undefined,
        presetTheme.text.p,
      ),
      li: normalizeTextThemeStyle(
        isRecord(value.text) ? value.text.li : undefined,
        presetTheme.text.li,
      ),
    },
  };
}

export function areDocumentThemesEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeDocumentTheme(left)) ===
    JSON.stringify(normalizeDocumentTheme(right))
  );
}

export function normalizeDocumentContentBlocks(
  value: unknown,
): DocumentContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((block): DocumentContentBlock[] => {
    if (!isRecord(block)) {
      return [];
    }

    if (
      block.type === "document_title" ||
      block.type === "contact" ||
      block.type === "summary"
    ) {
      return typeof block.text === "string" && block.text.trim()
        ? [{ type: block.type, text: block.text.trim() }]
        : [];
    }

    if (block.type === "section") {
      const title = typeof block.title === "string" ? block.title.trim() : "";
      const children = normalizeDocumentContentBlocks(block.children);
      const normalizedChildren =
        getSectionKind(title) === "education"
          ? normalizeEducationSectionChildren(children)
          : children;

      return title
        ? [{ type: "section", title, children: normalizedChildren }]
        : [];
    }

    if (block.type === "experience_item") {
      const bullets = normalizeStringArray(block.bullets);

      return typeof block.role === "string" && block.role.trim()
        ? [
            {
              type: "experience_item",
              role: block.role.trim(),
              company:
                typeof block.company === "string" ? block.company.trim() : "",
              location:
                typeof block.location === "string"
                  ? block.location.trim()
                  : "",
              dates:
                typeof block.dates === "string" ? block.dates.trim() : "",
              bullets,
            },
          ]
        : [];
    }

    if (block.type === "education_item") {
      return typeof block.institution === "string" && block.institution.trim()
        ? [
            {
              type: "education_item",
              institution: block.institution.trim(),
              qualification:
                typeof block.qualification === "string"
                  ? block.qualification.trim()
                  : "",
              dates:
                typeof block.dates === "string" ? block.dates.trim() : "",
            },
          ]
        : [];
    }

    if (block.type === "skills") {
      const items = normalizeStringArray(block.items);

      return items.length
        ? [
            {
              type: "skills",
              items,
              display: block.display === "bullets" ? "bullets" : "inline",
            },
          ]
        : [];
    }

    if (block.type === "h1" || block.type === "p") {
      return typeof block.text === "string" && block.text.trim()
        ? [{ type: block.type, text: block.text.trim() }]
        : [];
    }

    if (block.type === "ul" && Array.isArray(block.items)) {
      const items = block.items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

      return items.length ? [{ type: "ul", items }] : [];
    }

    return [];
  });
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function contentBlocksToText(blocks: DocumentContentBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "document_title") {
        return `# ${block.text}`;
      }

      if (block.type === "contact" || block.type === "summary") {
        return block.text;
      }

      if (block.type === "section") {
        return [
          `## ${block.title}`,
          contentBlocksToText(block.children),
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      if (block.type === "experience_item") {
        const heading = block.company
          ? `${block.role} | ${block.company}`
          : block.role;

        return [
          `### ${heading}`,
          block.location,
          block.dates,
          block.bullets.map((item) => `- ${item}`).join("\n"),
        ]
          .filter(Boolean)
          .join("\n");
      }

      if (block.type === "education_item") {
        return [
          `### ${block.institution}`,
          block.qualification,
          block.dates,
        ]
          .filter(Boolean)
          .join("\n");
      }

      if (block.type === "skills") {
        return block.display === "bullets"
          ? block.items.map((item) => `- ${item}`).join("\n")
          : block.items.join(" • ");
      }

      if (block.type === "ul") {
        return block.items.map((item) => `- ${item}`).join("\n");
      }

      return block.text;
    })
    .filter(Boolean)
    .join("\n\n");
}

const RESUME_SECTION_HEADINGS = new Set([
  "professional experience",
  "work experience",
  "experience",
  "additional experience",
  "education",
  "core skills",
  "skills",
  "projects",
  "certifications",
]);

const DATE_RANGE_PATTERN =
  /^(?:[A-Z][a-z]+\.?\s+)?\d{4}\s*[-–—]\s*(?:(?:[A-Z][a-z]+\.?\s+)?\d{4}|present|current)$/i;
const BULLET_PATTERN = /^[-*•]\s+/;
const EDUCATION_QUALIFICATION_PATTERN =
  /\b(?:bachelor|master|doctor|phd|diploma|certificate|certification|degree|major|minor|honours|graduate|undergraduate|vce|hsc|ged|mba|bsc|msc)\b/i;

function isResumeSectionHeading(value: string) {
  return RESUME_SECTION_HEADINGS.has(value.trim().toLowerCase());
}

function getSectionKind(title: string) {
  const normalized = title.trim().toLowerCase();

  if (normalized.includes("education")) {
    return "education";
  }

  if (normalized.includes("skill")) {
    return "skills";
  }

  if (
    normalized.includes("experience") ||
    normalized.includes("project") ||
    normalized.includes("certification")
  ) {
    return "experience";
  }

  return "generic";
}

function stripBulletMarker(value: string) {
  return value.replace(BULLET_PATTERN, "").trim();
}

function stripHeadingMarker(value: string) {
  return value.replace(/^#{1,6}\s+/, "").trim();
}

function isDateRange(value: string) {
  return DATE_RANGE_PATTERN.test(stripHeadingMarker(value));
}

function isEducationQualificationLine(value: string) {
  return EDUCATION_QUALIFICATION_PATTERN.test(stripHeadingMarker(value));
}

function isEducationItem(
  block: DocumentContentBlock | undefined,
): block is Extract<DocumentContentBlock, { type: "education_item" }> {
  return block?.type === "education_item";
}

function normalizeEducationSectionChildren(
  children: DocumentContentBlock[],
): DocumentContentBlock[] {
  return children.reduce<DocumentContentBlock[]>((merged, child) => {
    const previous = merged.at(-1);

    if (
      isEducationItem(previous) &&
      isEducationItem(child) &&
      !previous.qualification &&
      isEducationQualificationLine(child.institution)
    ) {
      merged[merged.length - 1] = {
        ...previous,
        qualification: child.qualification || child.institution,
        dates: previous.dates || child.dates,
      };

      return merged;
    }

    merged.push(child);
    return merged;
  }, []);
}

function splitNameAndCompany(value: string) {
  const stripped = stripHeadingMarker(value);
  const separator = stripped.includes("|")
    ? "|"
    : stripped.includes(" — ")
      ? " — "
      : stripped.includes(" – ")
        ? " – "
        : stripped.includes(" - ")
          ? " - "
          : "";

  if (!separator) {
    return { role: stripped, company: "" };
  }

  const [role = "", ...companyParts] = stripped.split(separator);

  return {
    role: role.trim(),
    company: companyParts.join(separator).trim(),
  };
}

function splitSkills(value: string) {
  return value
    .split(/\s*[•,]\s*|\s{2,}/)
    .map((item) => stripBulletMarker(item).trim())
    .filter(Boolean);
}

function findNextSectionIndex(lines: string[], startIndex: number) {
  const nextIndex = lines.findIndex((line, index) => {
    if (index <= startIndex) {
      return false;
    }

    return line.startsWith("## ") || isResumeSectionHeading(line);
  });

  return nextIndex === -1 ? lines.length : nextIndex;
}

function isEntryHeadingLine(lines: string[], index: number) {
  const line = lines[index] ?? "";

  if (!line || line.startsWith("## ") || BULLET_PATTERN.test(line)) {
    return false;
  }

  if (line.startsWith("### ")) {
    return true;
  }

  if (isDateRange(line)) {
    return false;
  }

  const nextLines = lines.slice(index + 1, index + 4);

  return (
    line.includes("|") ||
    line.includes(" - ") ||
    line.includes(" — ") ||
    nextLines.some(isDateRange)
  );
}

function collectEntryLines(lines: string[], startIndex: number) {
  const entryLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    if (index > startIndex && isEntryHeadingLine(lines, index)) {
      break;
    }

    entryLines.push(lines[index] ?? "");
    index += 1;
  }

  return { entryLines, nextIndex: index };
}

function parseExperienceEntry(lines: string[]): DocumentContentBlock | null {
  const [heading = "", ...bodyLines] = lines.filter(Boolean);
  const { role, company } = splitNameAndCompany(heading);
  const bullets = bodyLines
    .filter((line) => BULLET_PATTERN.test(line))
    .map(stripBulletMarker);
  const details = bodyLines.filter((line) => !BULLET_PATTERN.test(line));
  const dates = details.find(isDateRange) ?? "";
  const location = details.find((line) => line !== dates) ?? "";

  return role
    ? {
        type: "experience_item",
        role,
        company,
        location,
        dates,
        bullets,
      }
    : null;
}

function parseEducationChildren(lines: string[]): DocumentContentBlock[] {
  const entries: DocumentContentBlock[] = [];
  const cleanedLines = lines
    .map((line) => stripBulletMarker(line))
    .filter(Boolean);
  let index = 0;

  while (index < cleanedLines.length) {
    const institution = stripHeadingMarker(cleanedLines[index] ?? "");

    if (!institution) {
      index += 1;
      continue;
    }

    if (isDateRange(institution)) {
      const previous = entries.at(-1);

      if (isEducationItem(previous) && !previous.dates) {
        entries[entries.length - 1] = {
          ...previous,
          dates: institution,
        };
      }

      index += 1;
      continue;
    }

    let qualification = "";
    let dates = "";
    const nextLine = stripHeadingMarker(cleanedLines[index + 1] ?? "");

    if (
      nextLine &&
      !isDateRange(nextLine) &&
      isEducationQualificationLine(nextLine)
    ) {
      qualification = nextLine;
      index += 1;
    }

    const dateLine = stripHeadingMarker(cleanedLines[index + 1] ?? "");

    if (dateLine && isDateRange(dateLine)) {
      dates = dateLine;
      index += 1;
    }

    entries.push({
      type: "education_item",
      institution,
      qualification,
      dates,
    });
    index += 1;
  }

  return entries;
}

function parseSectionChildren(
  title: string,
  lines: string[],
): DocumentContentBlock[] {
  const kind = getSectionKind(title);

  if (kind === "skills") {
    const bulletItems = lines
      .filter((line) => BULLET_PATTERN.test(line))
      .map(stripBulletMarker);
    const inlineItems = splitSkills(
      lines.filter((line) => !BULLET_PATTERN.test(line)).join(" "),
    );
    const items = bulletItems.length ? bulletItems : inlineItems;

    return items.length ? [{ type: "skills", items, display: "inline" }] : [];
  }

  if (kind === "education") {
    const children = parseEducationChildren(lines);

    return children.length
      ? children
      : lines.length
        ? [{ type: "summary", text: lines.join(" ") }]
        : [];
  }

  if (kind === "experience") {
    const children: DocumentContentBlock[] = [];
    let index = 0;

    while (index < lines.length) {
      if (!isEntryHeadingLine(lines, index)) {
        index += 1;
        continue;
      }

      const { entryLines, nextIndex } = collectEntryLines(lines, index);
      const entry = parseExperienceEntry(entryLines);

      if (entry) {
        children.push(entry);
      }

      index = nextIndex;
    }

    return children.length
      ? children
      : lines.length
        ? [{ type: "summary", text: lines.join(" ") }]
        : [];
  }

  const blocks: DocumentContentBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length) {
      blocks.push({ type: "summary", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  }

  for (const line of lines) {
    if (BULLET_PATTERN.test(line)) {
      flushParagraph();
      blocks.push({ type: "ul", items: [stripBulletMarker(line)] });
    } else {
      paragraphLines.push(line);
    }
  }

  flushParagraph();

  return blocks;
}

export function editableTextToContentBlocks(
  value: string,
): DocumentContentBlock[] {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: DocumentContentBlock[] = [];
  let index = 0;

  if (!lines.length) {
    return [];
  }

  if (lines[index]?.startsWith("# ")) {
    blocks.push({
      type: "document_title",
      text: stripHeadingMarker(lines[index] ?? ""),
    });
    index += 1;
  } else if (!isResumeSectionHeading(lines[index] ?? "")) {
    blocks.push({ type: "document_title", text: lines[index] ?? "" });
    index += 1;
  }

  const introLines: string[] = [];
  while (
    index < lines.length &&
    !lines[index]?.startsWith("## ") &&
    !isResumeSectionHeading(lines[index] ?? "")
  ) {
    introLines.push(lines[index] ?? "");
    index += 1;
  }

  if (introLines[0]) {
    blocks.push({ type: "contact", text: introLines[0] });
  }

  if (introLines.length > 1) {
    blocks.push({ type: "summary", text: introLines.slice(1).join(" ") });
  }

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const title = line.startsWith("## ") ? stripHeadingMarker(line) : line;
    const endIndex = findNextSectionIndex(lines, index);
    const children = parseSectionChildren(title, lines.slice(index + 1, endIndex));

    blocks.push({ type: "section", title, children });
    index = endIndex;
  }

  return normalizeDocumentContentBlocks(blocks);
}
