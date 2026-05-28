import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ComponentProps, ReactNode } from "react";
import {
  contentBlocksToText,
  editableTextToContentBlocks,
  getPageSize,
  normalizeDocumentContentBlocks,
  normalizeDocumentTheme,
  type DocumentContentBlock,
  type DocumentRow,
  type DocumentTheme,
  type LinkedAsset,
} from "@/lib/documents";

type PdfDocumentProps = {
  document: Pick<
    DocumentRow,
    | "title"
    | "formatted_content"
    | "content_blocks"
    | "page_preset"
    | "custom_width"
    | "custom_height"
    | "theme"
  >;
  imageAssets?: LinkedAsset[];
};

const PRESET_RENDER_STYLES: Record<
  DocumentTheme["preset"],
  {
    backgroundColor: string;
    textColor: string;
    bulletGap: number;
  }
> = {
  classic: {
    backgroundColor: "#ffffff",
    textColor: "#111111",
    bulletGap: 6,
  },
  modern: {
    backgroundColor: "#fbfaf7",
    textColor: "#18181b",
    bulletGap: 7,
  },
  compact: {
    backgroundColor: "#ffffff",
    textColor: "#111827",
    bulletGap: 4,
  },
  presentation: {
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    bulletGap: 8,
  },
};

const IMAGE_MAX_HEIGHTS: Record<DocumentTheme["imageSize"], number> = {
  small: 180,
  medium: 280,
  large: 380,
};

const LINK_PATTERN =
  /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|[A-Z0-9-]+(?:\.[A-Z0-9-]+)+\/?[^\s]*)/gi;
const TRAILING_LINK_PUNCTUATION = /[),.;:!?]+$/;
type PdfLinkStyle = ComponentProps<typeof Link>["style"];

function getLinkTarget(value: string) {
  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
    return `mailto:${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function renderLinkedText(
  text: string,
  keyPrefix: string,
  linkStyle: PdfLinkStyle,
) {
  const chunks: ReactNode[] = [];
  LINK_PATTERN.lastIndex = 0;

  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_PATTERN.exec(text))) {
    const matchText = match[0];
    const markdownLabel = match[1];
    const markdownTarget = match[2];
    const rawLinkText = match[3];
    const start = match.index;

    if (start > cursor) {
      chunks.push(text.slice(cursor, start));
    }

    const isMarkdownLink = Boolean(markdownLabel && markdownTarget);
    const trailingPunctuation = isMarkdownLink
      ? ""
      : (matchText.match(TRAILING_LINK_PUNCTUATION)?.[0] ?? "");
    const linkText = isMarkdownLink
      ? markdownLabel
      : trailingPunctuation
        ? matchText.slice(0, -trailingPunctuation.length)
        : matchText;
    const linkTarget = isMarkdownLink ? markdownTarget : rawLinkText;

    chunks.push(
      <Link
        key={`${keyPrefix}-${start}`}
        src={getLinkTarget(linkTarget ?? linkText)}
        style={linkStyle}
      >
        {linkText}
      </Link>,
    );

    if (trailingPunctuation) {
      chunks.push(trailingPunctuation);
    }

    cursor = start + matchText.length;
  }

  if (cursor < text.length) {
    chunks.push(text.slice(cursor));
  }

  return chunks.length ? chunks : text;
}

function hasStructuredBlocks(blocks: DocumentContentBlock[]) {
  return blocks.some(
    (block) =>
      block.type === "document_title" ||
      block.type === "contact" ||
      block.type === "summary" ||
      block.type === "section" ||
      block.type === "experience_item" ||
      block.type === "education_item" ||
      block.type === "skills",
  );
}

export function PdfDocument({ document, imageAssets }: PdfDocumentProps) {
  const pageSize = getPageSize(document);
  const theme = normalizeDocumentTheme(document.theme);
  const presetStyles = PRESET_RENDER_STYLES[theme.preset];
  const generatedBlocks = normalizeDocumentContentBlocks(
    document.content_blocks,
  );
  const fallbackBlocks = editableTextToContentBlocks(document.formatted_content);
  const blocks = generatedBlocks.length ? generatedBlocks : fallbackBlocks;
  const isStructured = hasStructuredBlocks(blocks);
  const hasGeneratedContent = Boolean(contentBlocksToText(blocks).trim());
  const pagePadding = isStructured && theme.margin === 42 ? 34 : theme.margin;
  const styles = StyleSheet.create({
    page: {
      backgroundColor: isStructured
        ? "#ffffff"
        : presetStyles.backgroundColor,
      color: isStructured ? "#111827" : presetStyles.textColor,
      fontFamily: theme.fontFamily,
      padding: pagePadding,
    },
    body: {
      display: "flex",
      flexDirection: "column",
    },
    h1: {
      color: presetStyles.textColor,
      fontSize: theme.text.h1.fontSize * theme.fontScale,
      fontWeight: 700,
      lineHeight: theme.text.h1.lineHeight,
      marginBottom: theme.text.h1.spacingAfter,
    },
    title: {
      color: "#111827",
      fontSize: 24 * theme.fontScale,
      fontWeight: 700,
      lineHeight: 1.12,
      marginBottom: 7,
    },
    contact: {
      color: "#111827",
      fontSize: 10.5 * theme.fontScale,
      lineHeight: 1.28,
      marginBottom: 9,
    },
    section: {
      borderBottomColor: "#d9dee7",
      borderBottomWidth: 1,
      marginBottom: 10,
      marginTop: 16,
      paddingBottom: 6,
    },
    sectionHeading: {
      color: "#111827",
      fontSize: 11.5 * theme.fontScale,
      fontWeight: 700,
      letterSpacing: 1.1,
      lineHeight: 1.15,
    },
    paragraph: {
      color: presetStyles.textColor,
      fontSize: theme.text.p.fontSize * theme.fontScale,
      lineHeight: theme.text.p.lineHeight,
      marginBottom: theme.text.p.spacingAfter,
    },
    structuredParagraph: {
      color: "#1f2937",
      fontSize: 10.5 * theme.fontScale,
      lineHeight: 1.35,
      marginBottom: 8,
    },
    item: {
      marginBottom: 5,
      marginTop: 3,
    },
    itemRow: {
      alignItems: "flex-start",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    itemTitle: {
      color: "#111827",
      flex: 1,
      fontSize: 10.7 * theme.fontScale,
      fontWeight: 700,
      lineHeight: 1.2,
      paddingRight: 12,
    },
    itemDate: {
      color: "#374151",
      fontSize: 9.8 * theme.fontScale,
      lineHeight: 1.2,
      textAlign: "right",
      width: 150,
    },
    itemMeta: {
      color: "#374151",
      fontSize: 10 * theme.fontScale,
      lineHeight: 1.2,
      marginTop: 2,
    },
    experienceList: {
      marginTop: 5,
    },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: presetStyles.bulletGap,
      marginBottom: theme.text.p.spacingAfter,
    },
    structuredList: {
      display: "flex",
      flexDirection: "column",
      gap: 2.5,
      marginBottom: 12,
    },
    listItem: {
      display: "flex",
      flexDirection: "row",
      gap: 6,
    },
    bullet: {
      color: theme.accentColor,
      fontSize: theme.text.li.fontSize * theme.fontScale,
      lineHeight: theme.text.li.lineHeight,
      width: 10,
    },
    structuredBullet: {
      color: "#111827",
      fontSize: 8.5 * theme.fontScale,
      lineHeight: 1.34,
      width: 9,
    },
    listText: {
      color: presetStyles.textColor,
      flex: 1,
      fontSize: theme.text.li.fontSize * theme.fontScale,
      lineHeight: theme.text.li.lineHeight,
    },
    structuredListText: {
      color: "#111827",
      flex: 1,
      fontSize: 10.2 * theme.fontScale,
      lineHeight: 1.34,
    },
    link: {
      color: theme.accentColor,
      textDecoration: "underline",
    },
    structuredLink: {
      color: "#111827",
      textDecoration: "underline",
    },
    muted: {
      color: "#707070",
    },
    placeholder: {
      alignItems: "center",
      display: "flex",
      flexGrow: 1,
      justifyContent: "center",
    },
    image: {
      marginTop: theme.margin / 2,
      maxHeight: IMAGE_MAX_HEIGHTS[theme.imageSize],
      objectFit: "contain",
      width: "100%",
    },
  });
  const linkedText = (text: string, key: string, structured = isStructured) =>
    renderLinkedText(
      text,
      key,
      structured ? styles.structuredLink : styles.link,
    );
  const renderList = (
    items: string[],
    keyPrefix: string,
    structured = isStructured,
  ) => (
    <View style={structured ? styles.structuredList : styles.list}>
      {items.map((item, itemIndex) => (
        <View key={`${keyPrefix}-${itemIndex}`} style={styles.listItem}>
          <Text style={structured ? styles.structuredBullet : styles.bullet}>
            •
          </Text>
          <Text
            style={structured ? styles.structuredListText : styles.listText}
          >
            {linkedText(item, `${keyPrefix}-text-${itemIndex}`, structured)}
          </Text>
        </View>
      ))}
    </View>
  );
  const renderBlock = (block: DocumentContentBlock, key: string) => {
    if (block.type === "document_title") {
      return <Text style={styles.title}>{linkedText(block.text, key)}</Text>;
    }

    if (block.type === "contact") {
      return (
        <Text style={styles.contact}>{linkedText(block.text, key)}</Text>
      );
    }

    if (block.type === "summary") {
      return (
        <Text style={styles.structuredParagraph}>
          {linkedText(block.text, key)}
        </Text>
      );
    }

    if (block.type === "section") {
      return (
        <View>
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>
              {block.title.toUpperCase()}
            </Text>
          </View>
          {block.children.map((child, index) => (
            <View key={`${key}-child-${index}`}>
              {renderBlock(child, `${key}-child-${index}`)}
            </View>
          ))}
        </View>
      );
    }

    if (block.type === "experience_item") {
      const title = block.company
        ? `${block.role} | ${block.company}`
        : block.role;

      return (
        <View style={styles.item}>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>{linkedText(title, key)}</Text>
            {block.dates ? (
              <Text style={styles.itemDate}>
                {linkedText(block.dates, `${key}-date`)}
              </Text>
            ) : null}
          </View>
          {block.location ? (
            <Text style={styles.itemMeta}>
              {linkedText(block.location, `${key}-location`)}
            </Text>
          ) : null}
          {block.bullets.length
            ? (
                <View style={styles.experienceList}>
                  {renderList(block.bullets, `${key}-bullets`, true)}
                </View>
              )
            : null}
        </View>
      );
    }

    if (block.type === "education_item") {
      return (
        <View style={styles.item}>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>
              {linkedText(block.institution, key)}
            </Text>
            {block.dates ? (
              <Text style={styles.itemDate}>
                {linkedText(block.dates, `${key}-date`)}
              </Text>
            ) : null}
          </View>
          {block.qualification ? (
            <Text style={styles.itemMeta}>
              {linkedText(block.qualification, `${key}-qualification`)}
            </Text>
          ) : null}
        </View>
      );
    }

    if (block.type === "skills") {
      if (block.display === "bullets") {
        return renderList(block.items, `${key}-skills`, true);
      }

      return (
        <Text style={styles.structuredParagraph}>
          {linkedText(block.items.join(" • "), key)}
        </Text>
      );
    }

    if (block.type === "h1") {
      return (
        <Text style={styles.h1}>{linkedText(block.text, key, false)}</Text>
      );
    }

    if (block.type === "p") {
      return (
        <Text style={styles.paragraph}>
          {linkedText(block.text, key, false)}
        </Text>
      );
    }

    return renderList(block.items, `${key}-legacy-list`, false);
  };

  return (
    <Document title={document.title || "Untitled"}>
      <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
        {hasGeneratedContent ? (
          <>
            <View style={styles.body}>
              {blocks.map((block, index) => (
                <View key={`${block.type}-${index}`}>
                  {renderBlock(block, `block-${index}`)}
                </View>
              ))}
            </View>
            {imageAssets?.map((asset) =>
              asset.signed_url ? (
                <Image
                  key={asset.id}
                  src={asset.signed_url}
                  style={styles.image}
                />
              ) : null,
            )}
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={[styles.paragraph, styles.muted]}>
              Generate content to preview the PDF.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
