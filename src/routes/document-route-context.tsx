import { createContext, useContext, type Dispatch, type ReactElement, type RefObject, type SetStateAction } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { Session } from "@supabase/supabase-js";
import type { SavePatch } from "@/lib/document-utils";
import type {
  AssetRow,
  DocumentContentBlock,
  DocumentTheme,
  DocumentMessageRow,
  DocumentRow,
  DocumentVersionRow,
  LinkedAsset,
  OpenAIModel,
  PagePreset,
} from "@/lib/documents";

export type DocumentDraft = {
  documentId: string;
  title: string;
  contentText: string;
  pagePreset: PagePreset;
  customWidth: number;
  customHeight: number;
  theme: DocumentTheme;
};

export type PdfPreviewDocument = {
  title: string;
  formatted_content: string;
  content_blocks: DocumentContentBlock[];
  page_preset: PagePreset;
  custom_width: number | null;
  custom_height: number | null;
  theme: DocumentTheme;
};

type DocumentsRouteContextValue = {
  session: Session;
  selectedDocumentId: string | null;
  selectedDocument: DocumentRow | null;
  documents: DocumentRow[];
  isLoadingDocuments: boolean;
  isCreating: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isUploading: boolean;
  isLoadingVersions: boolean;
  isRestoringVersion: boolean;
  title: string;
  contentText: string;
  pagePreset: PagePreset;
  customWidth: number;
  customHeight: number;
  theme: DocumentTheme;
  model: OpenAIModel;
  setModel: Dispatch<SetStateAction<OpenAIModel>>;
  chatMessage: string;
  setChatMessage: Dispatch<SetStateAction<string>>;
  allAssets: AssetRow[];
  linkedAssets: LinkedAsset[];
  messages: DocumentMessageRow[];
  versions: DocumentVersionRow[];
  pdfPreviewDocument: PdfPreviewDocument | null;
  pdfDocument: ReactElement<DocumentProps> | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isAssetDialogOpen: boolean;
  setIsAssetDialogOpen: Dispatch<SetStateAction<boolean>>;
  createDocument: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  generateDocument: () => Promise<void>;
  restoreDocumentVersion: (versionId: string) => Promise<void>;
  saveContentText: (contentText: string) => Promise<boolean>;
  updateDraft: (patch: Partial<Omit<DocumentDraft, "documentId">>) => void;
  openDocumentRoute: (document: DocumentRow) => void;
  goToDocuments: () => void;
  handleAssetFiles: (files: FileList | File[]) => Promise<void>;
  toggleAssetLink: (
    asset: AssetRow,
    isLinked: boolean,
  ) => void | Promise<void>;
  signOut: () => Promise<void>;
};

export const EMPTY_DOCUMENTS: DocumentRow[] = [];
export const EMPTY_DOCUMENT_VERSIONS: DocumentVersionRow[] = [];

export const documentQueryKeys = {
  list: (userId: string) => ["documents", userId] as const,
  context: (documentId: string) => ["document-context", documentId] as const,
  versions: (documentId: string) => ["document-versions", documentId] as const,
};

export const DocumentsRouteContext =
  createContext<DocumentsRouteContextValue | null>(null);

export function useDocumentsRouteContext() {
  const value = useContext(DocumentsRouteContext);

  if (!value) {
    throw new Error(
      "useDocumentsRouteContext must be used within DocumentsRouteContext.",
    );
  }

  return value;
}

export type { SavePatch };
