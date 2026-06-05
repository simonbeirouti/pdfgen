import { createClient } from "npm:@supabase/supabase-js";

type FormatRequest = {
  documentId?: string;
  model?: string;
  message?: string;
};

type AssetRow = {
  id: string;
  filename: string;
  mime_type: string;
  extracted_text: string | null;
};

type DocumentMessageRow = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  formatted_content: string;
  content_blocks: DocumentContentBlock[];
  page_preset: string;
  custom_width: number | null;
  custom_height: number | null;
  theme: DocumentTheme;
  updated_at: string;
};

type DocumentTheme = {
  preset: "classic" | "modern" | "compact" | "presentation";
  fontFamily: "Helvetica" | "Times-Roman" | "Courier";
  accentColor: string;
  fontScale: number;
  margin: number;
  imageSize: "small" | "medium" | "large";
  text: {
    h1: TextThemeStyle;
    p: TextThemeStyle;
    li: TextThemeStyle;
  };
};

type TextThemeStyle = {
  fontSize: number;
  lineHeight: number;
  spacingAfter: number;
};

type DocumentContentBlock =
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
    }
  | {
      type: "slide_break";
    };

const DEFAULT_MODELS = ["gpt-5.4-mini", "gpt-5.4", "gpt-5.5"];
const DEFAULT_DOCUMENT_THEME: DocumentTheme = {
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
const DOCUMENT_THEME_PRESETS = {
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
} satisfies Record<DocumentTheme["preset"], DocumentTheme>;
const DOCUMENT_THEME_ACCENT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0f172a",
];
const semanticBlockSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: [
        "document_title",
        "contact",
        "summary",
        "experience_item",
        "education_item",
        "skills",
      ],
    },
    text: {
      type: "string",
    },
    role: {
      type: "string",
    },
    company: {
      type: "string",
    },
    location: {
      type: "string",
    },
    dates: {
      type: "string",
    },
    bullets: {
      type: "array",
      items: {
        type: "string",
      },
    },
    institution: {
      type: "string",
    },
    qualification: {
      type: "string",
    },
    items: {
      type: "array",
      items: {
        type: "string",
      },
    },
    display: {
      type: "string",
      enum: ["inline", "bullets"],
    },
  },
  required: [
    "type",
    "text",
    "role",
    "company",
    "location",
    "dates",
    "bullets",
    "institution",
    "qualification",
    "items",
    "display",
  ],
} as const;
const textThemeStyleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fontSize: { type: "number" },
    lineHeight: { type: "number" },
    spacingAfter: { type: "number" },
  },
  required: ["fontSize", "lineHeight", "spacingAfter"],
} as const;
const documentThemeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    preset: {
      type: "string",
      enum: ["classic", "modern", "compact", "presentation"],
    },
    fontFamily: {
      type: "string",
      enum: ["Helvetica", "Times-Roman", "Courier"],
    },
    accentColor: {
      type: "string",
      enum: DOCUMENT_THEME_ACCENT_COLORS,
    },
    fontScale: { type: "number" },
    margin: { type: "number" },
    imageSize: {
      type: "string",
      enum: ["small", "medium", "large"],
    },
    text: {
      type: "object",
      additionalProperties: false,
      properties: {
        h1: textThemeStyleSchema,
        p: textThemeStyleSchema,
        li: textThemeStyleSchema,
      },
      required: ["h1", "p", "li"],
    },
  },
  required: [
    "preset",
    "fontFamily",
    "accentColor",
    "fontScale",
    "margin",
    "imageSize",
    "text",
  ],
} as const;
const documentBlocksSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistant_message: {
      type: "string",
    },
    title: {
      type: "string",
    },
    contact: {
      type: "string",
    },
    summary: {
      type: "string",
    },
    theme: documentThemeSchema,
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
          },
          kind: {
            type: "string",
            enum: ["experience", "education", "skills", "generic"],
          },
          children: {
            type: "array",
            items: semanticBlockSchema,
          },
        },
        required: ["title", "kind", "children"],
      },
    },
  },
  required: [
    "assistant_message",
    "title",
    "contact",
    "summary",
    "theme",
    "blocks",
  ],
} as const;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOCUMENT_STRUCTURE_PROMPT = [
  "You create polished PDF-ready document content from chat instructions and linked asset context.",
  "Return JSON only.",
  "Use assistant_message for a short conversational status update about what changed, never the full document body.",
  "Structure the document semantically so styling can be applied by block type.",
  "The user will provide the current document JSON, including theme and content_blocks. Treat that JSON as the source of truth for existing document content and styling.",
  "Return a complete replacement document JSON using title, contact, summary, theme, and blocks. Preserve existing theme values unless the user asks for styling changes or the requested document format clearly requires a preset change.",
  "When changing styling, only use valid theme values from the provided schema and keep text sizes, margins, and scale within professional PDF ranges.",
  "For resumes, set title to the person's name, contact to one compact contact line, summary to one professional summary paragraph, and blocks to sections such as Professional Experience, Additional Experience, Education, and Core Skills.",
  "In each section, use children with semantic types.",
  "Experience items use type experience_item with role, company, location, dates, and bullets.",
  "Education items use type education_item with institution, qualification, and dates.",
  "Skills use type skills with items and display inline.",
  "Use empty strings or empty arrays for fields that do not apply.",
  "Preserve markdown links inside text fields as [label](url).",
  "Preserve facts and integrate relevant asset context naturally.",
].join(" ");

const HUMANIZED_WRITING_PROMPT = [
  "Humanized writing rules for generated PDF content fields:",
  "Write like a careful human editor, not a chatbot or press release.",
  "Prefer specific facts, concrete actions, and simple constructions such as is, are, has, and can.",
  "Keep the user's intended voice, but avoid sterile neutrality when a warmer or more direct voice fits the document.",
  "Use varied sentence rhythm. Do not force every idea into the same length, a three-part list, or a tidy formula.",
  "Do not inflate significance with phrases such as stands as, serves as, testament, pivotal, crucial, key role, underscores, broader landscape, indelible mark, or enduring legacy.",
  "Avoid promotional language such as boasts, vibrant, rich cultural heritage, profound, groundbreaking, renowned, breathtaking, must-visit, or stunning unless it is a quoted claim from the source.",
  "Avoid vague attribution such as experts argue, industry reports, observers have cited, several sources, or based on available information. Use a specific source from the provided context or omit the claim.",
  "Avoid superficial -ing clauses that add fake depth, such as highlighting, underscoring, reflecting, showcasing, cultivating, fostering, or contributing to.",
  "Avoid negative parallelisms such as not only...but also and it is not just...it is.",
  "Avoid false ranges such as from X to Y when the items are not on a real scale.",
  "Do not add generic challenges, future outlook, legacy, or upbeat conclusion sections unless the user explicitly asks for them.",
  "Do not use em dashes, emojis, markdown boldface, curly quotation marks, chatbot filler, knowledge-cutoff disclaimers, or sycophantic praise.",
  "Use sentence case for generic headings, while preserving names, official titles, acronyms, and conventional resume labels.",
  "If a detail is missing, do not pad around it. Leave it out or write the most honest concise version.",
  "These rules apply to the document text, headings, bullets, and structured content fields. The assistant_message may stay as a short, natural status update.",
].join(" ");

const SYSTEM_PROMPT = `${DOCUMENT_STRUCTURE_PROMPT}\n\n${HUMANIZED_WRITING_PROMPT}`;

const GENERATED_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^(?:Of course|Certainly|Sure|Great question)[!,.]\s*/i, ""],
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
  [/—/g, ", "],
  [/–/g, "-"],
  [/\*\*([^*]+)\*\*/g, "$1"],
  [/__([^_]+)__/g, "$1"],
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bin the event that\b/gi, "if"],
  [/\bhas the ability to\b/gi, "can"],
  [/\bit is important to note that\s*/gi, ""],
  [/\b(?:serves as|stands as|is) a testament to\b/gi, "shows"],
  [/\bserves as\b/gi, "is"],
  [/\bstands as\b/gi, "is"],
  [/\bboasts\b/gi, "has"],
  [/\bAdditionally,\s*/gi, ""],
  [/\bMoreover,\s*/gi, ""],
  [/\bI hope this helps!?$/gi, ""],
  [/\bLet me know if[^.?!]*[.?!]?$/gi, ""],
];

Deno.serve(async (req) => {
  try {
    return await handleFormatRequest(req);
  } catch (error) {
    console.error("Unhandled format-document error", error);
    return json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      500,
    );
  }
});

async function handleFormatRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization header." }, 401);
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return json({ error: "OPENAI_API_KEY is not configured." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: "Supabase environment is not configured." }, 500);
  }

  let body: FormatRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const documentId = body.documentId?.trim();
  const message = body.message?.trim() ?? "";
  const model = body.model?.trim() || DEFAULT_MODELS[0];
  const allowedModels = getAllowedModels();

  if (!documentId) {
    return json({ error: "documentId is required." }, 400);
  }

  if (!allowedModels.includes(model)) {
    return json({ error: "Requested model is not allowed." }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: "You must be signed in to format a document." }, 401);
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (documentError || !document) {
    return json({ error: documentError?.message ?? "Document not found." }, 404);
  }

  if (message) {
    const { error: messageError } = await supabase
      .from("document_messages")
      .insert({
        document_id: documentId,
        user_id: user.id,
        role: "user",
        content: message,
      });

    if (messageError) {
      return json({ error: messageError.message }, 400);
    }
  }

  const [assetsResult, messagesResult] = await Promise.all([
    loadLinkedAssets(supabase, documentId),
    supabase
      .from("document_messages")
      .select("role, content, created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true }),
  ]);

  if (!assetsResult.ok) {
    return json({ error: assetsResult.error }, 400);
  }

  if (messagesResult.error) {
    return json({ error: messagesResult.error.message }, 400);
  }

  if (!message && !assetsResult.value.length) {
    return json(
      { error: "Add a chat message or linked asset first." },
      400,
    );
  }

  const formattedContent = await formatWithOpenAI({
    apiKey: openaiApiKey,
    model,
    document: document as DocumentRow,
    assets: assetsResult.value,
    messages: (messagesResult.data ?? []) as DocumentMessageRow[],
  });

  if (!formattedContent.ok) {
    return json({ error: formattedContent.error }, 502);
  }

  const { data: updatedDocument, error: updateError } = await supabase
    .from("documents")
    .update({
      title: formattedContent.value.title,
      formatted_content: formattedContent.value.text,
      content_blocks: formattedContent.value.blocks,
      theme: formattedContent.value.theme,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (updateError) {
    return json({ error: updateError.message }, 400);
  }

  const { error: versionError } = await supabase
    .from("document_versions")
    .insert(createVersionSnapshot(updatedDocument as DocumentRow));

  if (versionError) {
    return json({ error: versionError.message }, 400);
  }

  const { error: assistantMessageError } = await supabase
    .from("document_messages")
    .insert({
      document_id: documentId,
      user_id: user.id,
      role: "assistant",
      content: formattedContent.value.assistantMessage,
    });

  if (assistantMessageError) {
    return json({ error: assistantMessageError.message }, 400);
  }

  const { data: updatedMessages, error: updatedMessagesError } = await supabase
    .from("document_messages")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (updatedMessagesError) {
    return json({ error: updatedMessagesError.message }, 400);
  }

  return json({ document: updatedDocument, messages: updatedMessages ?? [] });
}

function createVersionSnapshot(document: DocumentRow) {
  return {
    document_id: document.id,
    user_id: document.user_id,
    title: document.title,
    formatted_content: document.formatted_content,
    content_blocks: document.content_blocks,
    page_preset: document.page_preset,
    custom_width: document.custom_width,
    custom_height: document.custom_height,
    theme: document.theme,
    source: "generation",
    version_updated_at: document.updated_at,
  };
}

async function loadLinkedAssets(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
): Promise<{ ok: true; value: AssetRow[] } | { ok: false; error: string }> {
  const { data: links, error: linksError } = await supabase
    .from("document_assets")
    .select("asset_id")
    .eq("document_id", documentId);

  if (linksError) {
    return { ok: false, error: linksError.message };
  }

  const assetIds = (links ?? []).map((link) => link.asset_id as string);
  if (!assetIds.length) {
    return { ok: true, value: [] };
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, filename, mime_type, extracted_text")
    .in("id", assetIds);

  if (assetsError) {
    return { ok: false, error: assetsError.message };
  }

  return { ok: true, value: (assets ?? []) as AssetRow[] };
}

function getAllowedModels() {
  const fromEnv = Deno.env.get("OPENAI_MODEL_ALLOWLIST");
  if (!fromEnv) {
    return DEFAULT_MODELS;
  }

  return fromEnv
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function getSupabasePublishableKey() {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeys) {
    try {
      const parsed = JSON.parse(publishableKeys) as Record<string, string>;
      if (parsed.default) {
        return parsed.default;
      }
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_ANON_KEY");
}

function normalizeDocumentContentBlocks(value: unknown): DocumentContentBlock[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const payload = value as {
    title?: unknown;
    contact?: unknown;
    summary?: unknown;
    blocks?: unknown;
  };
  const blocks: DocumentContentBlock[] = [];
  const title = typeof payload.title === "string"
    ? humanizeGeneratedText(payload.title)
    : "";
  const contact =
    typeof payload.contact === "string"
      ? humanizeGeneratedText(payload.contact)
      : "";
  const summary =
    typeof payload.summary === "string"
      ? humanizeGeneratedText(payload.summary)
      : "";

  if (title) {
    blocks.push({ type: "document_title", text: title });
  }

  if (contact) {
    blocks.push({ type: "contact", text: contact });
  }

  if (summary) {
    blocks.push({ type: "summary", text: summary });
  }

  if (Array.isArray(payload.blocks)) {
    blocks.push(...normalizeSections(payload.blocks));
  }

  return blocks;
}

function normalizeSections(value: unknown[]): DocumentContentBlock[] {
  return value.flatMap((section): DocumentContentBlock[] => {
    if (!section || typeof section !== "object") {
      return [];
    }

    const record = section as {
      title?: unknown;
      children?: unknown;
    };
    const title = typeof record.title === "string"
      ? humanizeGeneratedText(record.title)
      : "";
    const children = Array.isArray(record.children)
      ? normalizeSemanticBlocks(record.children)
      : [];

    return title ? [{ type: "section", title, children }] : [];
  });
}

function normalizeSemanticBlocks(value: unknown[]): DocumentContentBlock[] {
  return value.flatMap((block): DocumentContentBlock[] => {
    if (!block || typeof block !== "object" || !("type" in block)) {
      return [];
    }

    const record = block as Record<string, unknown>;

    if (
      record.type === "document_title" ||
      record.type === "contact" ||
      record.type === "summary"
    ) {
      const text = typeof record.text === "string"
        ? humanizeGeneratedText(record.text)
        : "";

      return text ? [{ type: record.type, text }] : [];
    }

    if (record.type === "experience_item") {
      const role = typeof record.role === "string"
        ? humanizeGeneratedText(record.role)
        : "";

      return role
        ? [
            {
              type: "experience_item",
              role,
              company:
                typeof record.company === "string"
                  ? humanizeGeneratedText(record.company)
                  : "",
              location:
                typeof record.location === "string"
                  ? humanizeGeneratedText(record.location)
                  : "",
              dates:
                typeof record.dates === "string"
                  ? humanizeGeneratedText(record.dates)
                  : "",
              bullets: normalizeStringArray(record.bullets),
            },
          ]
        : [];
    }

    if (record.type === "education_item") {
      const institution =
        typeof record.institution === "string"
          ? humanizeGeneratedText(record.institution)
          : "";

      return institution
        ? [
            {
              type: "education_item",
              institution,
              qualification:
                typeof record.qualification === "string"
                  ? humanizeGeneratedText(record.qualification)
                  : "",
              dates:
                typeof record.dates === "string"
                  ? humanizeGeneratedText(record.dates)
                  : "",
            },
          ]
        : [];
    }

    if (record.type === "skills") {
      const items = normalizeStringArray(record.items);

      return items.length
        ? [
            {
              type: "skills",
              items,
              display: record.display === "bullets" ? "bullets" : "inline",
            },
          ]
        : [];
    }

    return [];
  });
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => humanizeGeneratedText(item))
        .filter(Boolean)
    : [];
}

function humanizeGeneratedText(text: string) {
  let value = text.trim();

  for (const [pattern, replacement] of GENERATED_TEXT_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  return value
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .trim();
}

function normalizeStoredContentBlocks(value: unknown): DocumentContentBlock[] {
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
      block.type === "summary" ||
      block.type === "h1" ||
      block.type === "p"
    ) {
      return typeof block.text === "string" && block.text.trim()
        ? [{ type: block.type, text: block.text.trim() } as DocumentContentBlock]
        : [];
    }

    if (block.type === "section") {
      const title = typeof block.title === "string" ? block.title.trim() : "";
      return title
        ? [
            {
              type: "section",
              title,
              children: normalizeStoredContentBlocks(block.children),
            },
          ]
        : [];
    }

    if (block.type === "experience_item") {
      const role = typeof block.role === "string" ? block.role.trim() : "";

      return role
        ? [
            {
              type: "experience_item",
              role,
              company: typeof block.company === "string" ? block.company.trim() : "",
              location:
                typeof block.location === "string" ? block.location.trim() : "",
              dates: typeof block.dates === "string" ? block.dates.trim() : "",
              bullets: normalizePlainStringArray(block.bullets),
            },
          ]
        : [];
    }

    if (block.type === "education_item") {
      const institution =
        typeof block.institution === "string" ? block.institution.trim() : "";

      return institution
        ? [
            {
              type: "education_item",
              institution,
              qualification:
                typeof block.qualification === "string"
                  ? block.qualification.trim()
                  : "",
              dates: typeof block.dates === "string" ? block.dates.trim() : "",
            },
          ]
        : [];
    }

    if (block.type === "skills") {
      const items = normalizePlainStringArray(block.items);

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

    if (block.type === "ul") {
      const items = normalizePlainStringArray(block.items);
      return items.length ? [{ type: "ul", items }] : [];
    }

    if (block.type === "slide_break") {
      return [{ type: "slide_break" }];
    }

    return [];
  });
}

function normalizePlainStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeDocumentTheme(value: unknown): DocumentTheme {
  if (!isRecord(value)) {
    return DEFAULT_DOCUMENT_THEME;
  }

  const preset = isThemePreset(value.preset)
    ? value.preset
    : DEFAULT_DOCUMENT_THEME.preset;
  const presetTheme = DOCUMENT_THEME_PRESETS[preset];
  const text = isRecord(value.text) ? value.text : {};

  return {
    preset,
    fontFamily: isThemeFont(value.fontFamily)
      ? value.fontFamily
      : presetTheme.fontFamily,
    accentColor: isAccentColor(value.accentColor)
      ? value.accentColor
      : presetTheme.accentColor,
    fontScale: normalizeNumber(value.fontScale, presetTheme.fontScale, 0.85, 1.25),
    margin: normalizeNumber(value.margin, presetTheme.margin, 24, 72),
    imageSize: isThemeImageSize(value.imageSize)
      ? value.imageSize
      : presetTheme.imageSize,
    text: {
      h1: normalizeTextThemeStyle(text.h1, presetTheme.text.h1),
      p: normalizeTextThemeStyle(text.p, presetTheme.text.p),
      li: normalizeTextThemeStyle(text.li, presetTheme.text.li),
    },
  };
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
    spacingAfter: normalizeNumber(value.spacingAfter, fallback.spacingAfter, 0, 48),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isThemePreset(value: unknown): value is DocumentTheme["preset"] {
  return (
    value === "classic" ||
    value === "modern" ||
    value === "compact" ||
    value === "presentation"
  );
}

function isThemeFont(value: unknown): value is DocumentTheme["fontFamily"] {
  return value === "Helvetica" || value === "Times-Roman" || value === "Courier";
}

function isAccentColor(value: unknown): value is string {
  return typeof value === "string" && DOCUMENT_THEME_ACCENT_COLORS.includes(value);
}

function isThemeImageSize(value: unknown): value is DocumentTheme["imageSize"] {
  return value === "small" || value === "medium" || value === "large";
}

function blockText(block: DocumentContentBlock): string {
  if (block.type === "section") {
    return [`## ${block.title}`, contentBlocksToText(block.children)]
      .filter(Boolean)
      .join("\n\n");
  }

  if (block.type === "document_title") {
    return `# ${block.text}`;
  }

  if (block.type === "contact" || block.type === "summary") {
    return block.text;
  }

  if (block.type === "experience_item") {
    return [
      `### ${block.company ? `${block.role} | ${block.company}` : block.role}`,
      block.location,
      block.dates,
      block.bullets.map((item) => `- ${item}`).join("\n"),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (block.type === "education_item") {
    return [`### ${block.institution}`, block.qualification, block.dates]
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

  if (block.type === "slide_break") {
    return "---";
  }

  if (block.type === "h1") {
    return `# ${block.text}`;
  }

  if (block.type === "p") {
    return block.text;
  }

  return block.text;
}

function contentBlocksToText(blocks: DocumentContentBlock[]) {
  return blocks
    .map(blockText)
    .filter(Boolean)
    .join("\n\n");
}

async function formatWithOpenAI({
  apiKey,
  model,
  document,
  assets,
  messages,
}: {
  apiKey: string;
  model: string;
  document: DocumentRow;
  assets: AssetRow[];
  messages: DocumentMessageRow[];
}): Promise<
  | {
      ok: true;
      value: {
        assistantMessage: string;
        title: string;
        blocks: DocumentContentBlock[];
        theme: DocumentTheme;
        text: string;
      };
    }
  | { ok: false; error: string }
> {
  const assetContext = assets.length
    ? assets
        .map((asset) => {
          const content = asset.extracted_text
            ? `\nExtracted text:\n${asset.extracted_text}`
            : "";
          return `- ${asset.filename} (${asset.mime_type})${content}`;
        })
        .join("\n\n")
    : "No linked assets.";

  const conversation = messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");
  const currentDocumentJson = JSON.stringify(
    {
      title: document.title,
      page_preset: document.page_preset,
      custom_width: document.custom_width,
      custom_height: document.custom_height,
      theme: normalizeDocumentTheme(document.theme),
      content_blocks: normalizeStoredContentBlocks(document.content_blocks),
    },
    null,
    2,
  );

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Current document JSON:\n${currentDocumentJson}\n\nLinked assets:\n${assetContext}\n\nConversation:\n${conversation || "(none)"}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "pdf_document_blocks",
            strict: true,
            schema: documentBlocksSchema,
          },
        },
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error
        ? `OpenAI request failed: ${error.message}`
        : "OpenAI request failed.",
    };
  }

  const rawPayload = await response.text();
  let payload: unknown;
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : null;
  } catch {
    if (!response.ok) {
      return {
        ok: false,
        error: `OpenAI request failed with status ${response.status}.`,
      };
    }

    return { ok: false, error: "OpenAI returned invalid JSON." };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        getOpenAIErrorMessage(payload) ??
        `OpenAI request failed with status ${response.status}.`,
    };
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    return { ok: false, error: "OpenAI returned no document JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return { ok: false, error: "OpenAI returned invalid document JSON." };
  }

  const blocks = normalizeDocumentContentBlocks(parsed);
  if (!blocks.length) {
    return { ok: false, error: "OpenAI returned no document blocks." };
  }
  const theme = getDocumentTheme(parsed, document.theme);
  const title = getDocumentTitle(parsed, document.title);

  return {
    ok: true,
    value: {
      assistantMessage: getAssistantMessage(parsed),
      title,
      blocks,
      theme,
      text: contentBlocksToText(blocks),
    },
  };
}

function getDocumentTitle(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "title" in payload &&
    typeof payload.title === "string" &&
    payload.title.trim()
  ) {
    return humanizeGeneratedText(payload.title);
  }

  return fallback.trim() || "Untitled";
}

function getDocumentTheme(payload: unknown, fallback: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "theme" in payload
  ) {
    return normalizeDocumentTheme(payload.theme);
  }

  return normalizeDocumentTheme(fallback);
}

function getAssistantMessage(payload: unknown) {
  const fallback = "Updated the PDF with the generated content.";

  if (
    !payload ||
    typeof payload !== "object" ||
    !("assistant_message" in payload) ||
    typeof payload.assistant_message !== "string"
  ) {
    return fallback;
  }

  const message = payload.assistant_message.replace(/\s+/g, " ").trim();

  return message || fallback;
}

function getOpenAIErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return null;
}

function extractOutputText(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text.trim();
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("output" in payload) ||
    !Array.isArray(payload.output)
  ) {
    return "";
  }

  return payload.output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = item.content;
      if (!Array.isArray(content)) {
        return [];
      }

      return content.flatMap((part) => {
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return [part.text];
        }

        return [];
      });
    })
    .join("\n")
    .trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
