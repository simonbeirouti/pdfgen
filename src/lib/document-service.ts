import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  extractAssetText,
  getAssetMimeType,
  isAllowedAssetFile,
} from "@/lib/asset-utils";
import { sanitizeFileName, type SavePatch } from "@/lib/document-utils";
import {
  areDocumentThemesEqual,
  isImageAsset,
  normalizeDocumentContentBlocks,
  type AssetRow,
  type DocumentMessageRow,
  type DocumentRow,
  type DocumentVersionRow,
  type LinkedAsset,
  type OpenAIModel,
} from "@/lib/documents";
import { supabase } from "@/lib/supabase";

export type DocumentContext = {
  assets: AssetRow[];
  linkedAssets: LinkedAsset[];
  messages: DocumentMessageRow[];
};

export type UploadAssetsResult = {
  uploaded: AssetRow[];
  unsupportedFileNames: string[];
};

export async function listDocuments(userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as DocumentRow[];
}

export async function createDocument(userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      title: "Untitled",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as DocumentRow;
}

export async function deleteDocument(documentId: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw error;
  }
}

export async function listDocumentVersions(documentId: string) {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as DocumentVersionRow[];
}

export async function saveDocument({
  documentId,
  userId,
  patch,
}: {
  documentId: string;
  userId: string;
  patch: SavePatch;
}) {
  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as DocumentRow;
}

export async function restoreDocumentVersion(
  versionId: string,
  documentId: string,
  userId: string,
) {
  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .single();

  if (versionError) {
    throw versionError;
  }

  const selectedVersion = version as DocumentVersionRow;
  const { data: currentDocument, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (documentError) {
    throw documentError;
  }

  const current = currentDocument as DocumentRow;

  if (!areSnapshotFieldsEqual(current, selectedVersion)) {
    const { error: checkpointError } = await supabase
      .from("document_versions")
      .insert(createVersionSnapshot(current, "pre_restore"));

    if (checkpointError) {
      throw checkpointError;
    }
  }

  const { data: restoredDocument, error: restoreError } = await supabase
    .from("documents")
    .update({
      title: selectedVersion.title,
      formatted_content: selectedVersion.formatted_content,
      content_blocks: normalizeDocumentContentBlocks(
        selectedVersion.content_blocks,
      ),
      page_preset: selectedVersion.page_preset,
      custom_width: selectedVersion.custom_width,
      custom_height: selectedVersion.custom_height,
      theme: selectedVersion.theme,
    })
    .eq("id", documentId)
    .eq("user_id", userId)
    .select()
    .single();

  if (restoreError) {
    throw restoreError;
  }

  return restoredDocument as DocumentRow;
}

export async function generateDocument({
  documentId,
  model,
  message,
}: {
  documentId: string;
  model: OpenAIModel;
  message: string;
}) {
  const { data, error } = await supabase.functions.invoke("format-document", {
    body: {
      documentId,
      model,
      message,
    },
  });

  if (error) {
    throw await normalizeFunctionError(error);
  }

  const result = data as {
    document?: DocumentRow;
    messages?: DocumentMessageRow[];
  };

  if (!result.document) {
    throw new Error("The formatter returned an unexpected response.");
  }

  return {
    document: result.document,
    messages: result.messages,
  };
}

async function normalizeFunctionError(error: unknown) {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const payload = (await error.context.clone().json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        return new Error(payload.error);
      }
    } catch {
      const text = await error.context.clone().text();
      if (text.trim()) {
        return new Error(text);
      }
    }
  }

  return error instanceof Error ? error : new Error("Something went wrong.");
}

export async function loadDocumentContext(
  documentId: string,
): Promise<DocumentContext> {
  const [assetsResponse, linksResponse, messagesResponse] = await Promise.all([
    supabase.from("assets").select("*").order("created_at", { ascending: false }),
    supabase.from("document_assets").select("asset_id").eq("document_id", documentId),
    supabase
      .from("document_messages")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true }),
  ]);

  if (assetsResponse.error) {
    throw assetsResponse.error;
  }

  if (linksResponse.error) {
    throw linksResponse.error;
  }

  if (messagesResponse.error) {
    throw messagesResponse.error;
  }

  const assets = (assetsResponse.data ?? []) as AssetRow[];
  const linkedAssetIds = new Set(
    (linksResponse.data ?? []).map((link) => link.asset_id as string),
  );
  const linkedAssets = assets.filter((asset) => linkedAssetIds.has(asset.id));

  return {
    assets,
    linkedAssets: await createSignedImageUrls(linkedAssets),
    messages: (messagesResponse.data ?? []) as DocumentMessageRow[],
  };
}

export async function createSignedImageUrls(
  assets: AssetRow[],
): Promise<LinkedAsset[]> {
  return Promise.all(
    assets.map(async (asset) => {
      if (!isImageAsset(asset)) {
        return asset;
      }

      const { data, error } = await supabase.storage
        .from(asset.bucket_id)
        .createSignedUrl(asset.storage_path, 60 * 60);

      if (error) {
        throw error;
      }

      return {
        ...asset,
        signed_url: data.signedUrl,
      };
    }),
  );
}

export async function uploadAndLinkAssets({
  files,
  userId,
  documentId,
}: {
  files: File[];
  userId: string;
  documentId: string;
}): Promise<UploadAssetsResult> {
  const uploaded: AssetRow[] = [];
  const unsupportedFileNames: string[] = [];

  for (const file of files) {
    if (!isAllowedAssetFile(file)) {
      unsupportedFileNames.push(file.name);
      continue;
    }

    const mimeType = getAssetMimeType(file);
    const storagePath = `${userId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const extractedText = await extractAssetText(file);

    const { error: uploadError } = await supabase.storage
      .from("document-assets")
      .upload(storagePath, file, {
        contentType: mimeType,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        user_id: userId,
        bucket_id: "document-assets",
        storage_path: storagePath,
        filename: file.name,
        mime_type: mimeType,
        size_bytes: file.size,
        extracted_text: extractedText,
      })
      .select()
      .single();

    if (assetError) {
      throw assetError;
    }

    const createdAsset = asset as AssetRow;
    const { error: linkError } = await supabase.from("document_assets").insert({
      document_id: documentId,
      asset_id: createdAsset.id,
      user_id: userId,
    });

    if (linkError) {
      throw linkError;
    }

    uploaded.push(createdAsset);
  }

  return {
    uploaded,
    unsupportedFileNames,
  };
}

export async function setDocumentAssetLink({
  documentId,
  assetId,
  userId,
  isLinked,
}: {
  documentId: string;
  assetId: string;
  userId: string;
  isLinked: boolean;
}) {
  if (isLinked) {
    const { error } = await supabase
      .from("document_assets")
      .delete()
      .eq("document_id", documentId)
      .eq("asset_id", assetId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("document_assets").insert({
    document_id: documentId,
    asset_id: assetId,
    user_id: userId,
  });

  if (error) {
    throw error;
  }
}

function createVersionSnapshot(
  document: DocumentRow,
  source: DocumentVersionRow["source"],
) {
  return {
    document_id: document.id,
    user_id: document.user_id,
    title: document.title,
    formatted_content: document.formatted_content,
    content_blocks: normalizeDocumentContentBlocks(document.content_blocks),
    page_preset: document.page_preset,
    custom_width: document.custom_width,
    custom_height: document.custom_height,
    theme: document.theme,
    source,
    version_updated_at: document.updated_at,
  };
}

function areSnapshotFieldsEqual(
  document: DocumentRow,
  version: DocumentVersionRow,
) {
  return (
    document.title === version.title &&
    document.formatted_content === version.formatted_content &&
    JSON.stringify(normalizeDocumentContentBlocks(document.content_blocks)) ===
      JSON.stringify(normalizeDocumentContentBlocks(version.content_blocks)) &&
    document.page_preset === version.page_preset &&
    document.custom_width === version.custom_width &&
    document.custom_height === version.custom_height &&
    areDocumentThemesEqual(document.theme, version.theme)
  );
}
