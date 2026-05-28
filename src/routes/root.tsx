import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type DocumentProps } from "@react-pdf/renderer";
import type { Session } from "@supabase/supabase-js";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { LoginForm } from "@/components/login-form";
import { PdfDocument } from "@/components/pdf-document";
import {
  createSavePatch,
  getEditableContentText,
  hasSavePatchChanged,
  sortDocuments,
  type SavePatch,
} from "@/lib/document-utils";
import {
  createDocument as createDocumentRecord,
  deleteDocument as deleteDocumentRecord,
  generateDocument as generateDocumentContent,
  listDocuments,
  listDocumentVersions,
  loadDocumentContext,
  restoreDocumentVersion as restoreDocumentVersionRecord,
  saveDocument as saveDocumentRecord,
  setDocumentAssetLink,
  uploadAndLinkAssets,
  type DocumentContext,
} from "@/lib/document-service";
import {
  DEFAULT_MODEL,
  isImageAsset,
  normalizeDocumentContentBlocks,
  normalizeDocumentTheme,
  type AssetRow,
  type DocumentMessageRow,
  type DocumentRow,
  type LinkedAsset,
  type OpenAIModel,
} from "@/lib/documents";
import { clearPersistedQueryCache } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import {
  DocumentsRouteContext,
  EMPTY_DOCUMENTS,
  EMPTY_DOCUMENT_VERSIONS,
  documentQueryKeys,
  type DocumentDraft,
  type PdfPreviewDocument,
} from "@/routes/document-route-context";

type LoadedDocumentContext = {
  documentId: string | null;
  assets: AssetRow[];
  linkedAssets: LinkedAsset[];
  messages: DocumentMessageRow[];
};

const EMPTY_DOCUMENT_CONTEXT: LoadedDocumentContext = {
  documentId: null,
  assets: [],
  linkedAssets: [],
  messages: [],
};

export function RootRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { documentId?: string };
  const selectedDocumentId = params.documentId ?? null;
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [model, setModel] = useState<OpenAIModel>(DEFAULT_MODEL);
  const [chatMessage, setChatMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = session?.user.id;

  const documentsQuery = useQuery({
    queryKey: documentQueryKeys.list(userId ?? "anonymous"),
    queryFn: () => listDocuments(userId!),
    enabled: Boolean(userId),
  });

  const documents = documentsQuery.data ?? EMPTY_DOCUMENTS;
  const isLoadingDocuments = Boolean(userId) && documentsQuery.isPending;

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) {
      return null;
    }

    return (
      documents.find((document) => document.id === selectedDocumentId) ?? null
    );
  }, [documents, selectedDocumentId]);

  const selectedDocumentLoadedId = selectedDocument?.id;
  const documentContextQuery = useQuery({
    queryKey: documentQueryKeys.context(selectedDocumentLoadedId ?? "none"),
    queryFn: () => loadDocumentContext(selectedDocumentLoadedId!),
    enabled: Boolean(selectedDocumentLoadedId),
    staleTime: 10_000,
  });
  const documentVersionsQuery = useQuery({
    queryKey: documentQueryKeys.versions(selectedDocumentLoadedId ?? "none"),
    queryFn: () => listDocumentVersions(selectedDocumentLoadedId!),
    enabled: Boolean(selectedDocumentLoadedId),
    staleTime: 10_000,
  });
  const selectedDocumentDraft =
    draft?.documentId === selectedDocument?.id ? draft : null;
  const title = selectedDocumentDraft
    ? selectedDocumentDraft.title
    : (selectedDocument?.title ?? "Untitled");
  const contentText = selectedDocumentDraft
    ? selectedDocumentDraft.contentText
    : selectedDocument
      ? getEditableContentText(selectedDocument)
      : "";
  const pagePreset = selectedDocumentDraft
    ? selectedDocumentDraft.pagePreset
    : (selectedDocument?.page_preset ?? "a4");
  const customWidth = selectedDocumentDraft
    ? selectedDocumentDraft.customWidth
    : (selectedDocument?.custom_width ?? 595);
  const customHeight = selectedDocumentDraft
    ? selectedDocumentDraft.customHeight
    : (selectedDocument?.custom_height ?? 842);
  const selectedDocumentTheme = useMemo(
    () => normalizeDocumentTheme(selectedDocument?.theme),
    [selectedDocument?.theme],
  );
  const theme = selectedDocumentDraft
    ? selectedDocumentDraft.theme
    : selectedDocumentTheme;
  const activeDocumentContext =
    selectedDocumentLoadedId === selectedDocumentId && documentContextQuery.data
      ? {
          documentId: selectedDocumentLoadedId,
          assets: documentContextQuery.data.assets,
          linkedAssets: documentContextQuery.data.linkedAssets,
          messages: documentContextQuery.data.messages,
        }
      : EMPTY_DOCUMENT_CONTEXT;
  const allAssets = activeDocumentContext.assets;
  const linkedAssets = activeDocumentContext.linkedAssets;
  const messages = activeDocumentContext.messages;
  const versions =
    selectedDocumentLoadedId === selectedDocumentId && documentVersionsQuery.data
      ? documentVersionsQuery.data
      : EMPTY_DOCUMENT_VERSIONS;

  const pdfImageAssets = useMemo(
    () => linkedAssets.filter(isImageAsset),
    [linkedAssets],
  );

  const draftPatch = useMemo(
    () =>
      createSavePatch({
        title,
        contentText,
        pagePreset,
        customWidth,
        customHeight,
        theme,
      }),
    [contentText, customHeight, customWidth, pagePreset, theme, title],
  );

  const selectedDocumentFormattedContent = selectedDocument?.formatted_content;
  const selectedDocumentContentBlocks = selectedDocument?.content_blocks;
  const draftContentBlocks = useMemo(
    () =>
      selectedDocumentDraft
        ? normalizeDocumentContentBlocks(draftPatch.content_blocks)
        : null,
    [draftPatch.content_blocks, selectedDocumentDraft],
  );

  const pdfPreviewDocument = useMemo<PdfPreviewDocument | null>(() => {
    if (!selectedDocumentId) {
      return null;
    }

    return {
      title: "PDF Preview",
      formatted_content: selectedDocumentDraft
        ? draftPatch.formatted_content
        : (selectedDocumentFormattedContent ?? ""),
      content_blocks:
        draftContentBlocks ??
        normalizeDocumentContentBlocks(selectedDocumentContentBlocks),
      page_preset: pagePreset,
      custom_width: pagePreset === "custom" ? customWidth : null,
      custom_height: pagePreset === "custom" ? customHeight : null,
      theme,
    };
  }, [
    customHeight,
    customWidth,
    draftContentBlocks,
    draftPatch.formatted_content,
    pagePreset,
    selectedDocumentDraft,
    selectedDocumentContentBlocks,
    selectedDocumentFormattedContent,
    selectedDocumentId,
    theme,
  ]);

  const pdfDocument = useMemo<ReactElement<DocumentProps> | null>(() => {
    if (!pdfPreviewDocument) {
      return null;
    }

    return (
      <PdfDocument document={pdfPreviewDocument} imageAssets={pdfImageAssets} />
    ) as ReactElement<DocumentProps>;
  }, [pdfImageAssets, pdfPreviewDocument]);

  const savedDocumentTitle = selectedDocument?.title;
  const savedDocumentPagePreset = selectedDocument?.page_preset;
  const savedDocumentCustomWidth = selectedDocument?.custom_width;
  const savedDocumentCustomHeight = selectedDocument?.custom_height;
  const savedDocumentTheme = selectedDocument?.theme;

  const savedPatch = useMemo(() => {
    if (
      !selectedDocumentId ||
      savedDocumentTitle == null ||
      savedDocumentPagePreset == null
    ) {
      return null;
    }

    return createSavePatch({
      title: savedDocumentTitle,
      contentText: selectedDocument
        ? getEditableContentText(selectedDocument)
        : "",
      pagePreset: savedDocumentPagePreset,
      customWidth: savedDocumentCustomWidth ?? 595,
      customHeight: savedDocumentCustomHeight ?? 842,
      theme: normalizeDocumentTheme(savedDocumentTheme),
    });
  }, [
    savedDocumentCustomHeight,
    savedDocumentCustomWidth,
    savedDocumentPagePreset,
    savedDocumentTheme,
    savedDocumentTitle,
    selectedDocumentId,
    selectedDocument,
  ]);

  const setCachedDocuments = useCallback(
    (updater: (currentDocuments: DocumentRow[]) => DocumentRow[]) => {
      if (!userId) {
        return;
      }

      queryClient.setQueryData<DocumentRow[]>(
        documentQueryKeys.list(userId),
        (currentDocuments) => updater(currentDocuments ?? EMPTY_DOCUMENTS),
      );
    },
    [queryClient, userId],
  );

  const updateLocalDocument = useCallback(
    (updatedDocument: DocumentRow) => {
      setCachedDocuments((currentDocuments) =>
        sortDocuments(
          currentDocuments.map((document) =>
            document.id === updatedDocument.id ? updatedDocument : document,
          ),
        ),
      );
    },
    [setCachedDocuments],
  );

  const goToDocuments = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  const openDocumentRoute = useCallback(
    (document: DocumentRow) => {
      void navigate({
        to: "/edit/$documentId",
        params: { documentId: document.id },
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (documentsQuery.error) {
      toast.error(getErrorMessage(documentsQuery.error));
    }
  }, [documentsQuery.error]);

  useEffect(() => {
    if (documentContextQuery.error) {
      toast.error(getErrorMessage(documentContextQuery.error));
    }
  }, [documentContextQuery.error]);

  useEffect(() => {
    if (documentVersionsQuery.error) {
      toast.error(getErrorMessage(documentVersionsQuery.error));
    }
  }, [documentVersionsQuery.error]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setDraft(null);
        void clearPersistedQueryCache(queryClient);
        void navigate({ to: "/" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!selectedDocumentId || !savedPatch || !userId) {
      return;
    }

    if (!hasSavePatchChanged(savedPatch, draftPatch)) {
      return;
    }

    let isActive = true;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      void saveDocumentRecord({
        documentId: selectedDocumentId,
        userId,
        patch: draftPatch,
      }).then(
        (updatedDocument) => {
          if (!isActive) {
            return;
          }

          setIsSaving(false);
          updateLocalDocument(updatedDocument);
        },
        (error: unknown) => {
          if (!isActive) {
            return;
          }

          setIsSaving(false);
          toast.error(getErrorMessage(error));
        },
      );
    }, 700);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [draftPatch, savedPatch, selectedDocumentId, updateLocalDocument, userId]);

  async function createDocument() {
    if (!session) {
      return;
    }

    setIsCreating(true);
    try {
      const createdDocument = await createDocumentRecord(session.user.id);
      setCachedDocuments((currentDocuments) => [
        createdDocument,
        ...currentDocuments,
      ]);
      openDocumentRoute(createdDocument);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteDocument(documentId: string) {
    try {
      await deleteDocumentRecord(documentId);
    } catch (error) {
      toast.error(getErrorMessage(error));
      return;
    }

    setCachedDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== documentId),
    );
    queryClient.removeQueries({
      queryKey: documentQueryKeys.context(documentId),
    });
    queryClient.removeQueries({
      queryKey: documentQueryKeys.versions(documentId),
    });
    if (selectedDocumentId === documentId) {
      setDraft(null);
      goToDocuments();
    }
    toast.success("Document deleted.");
  }

  async function saveDocument(
    documentId: string,
    patch: SavePatch,
    options: { quiet?: boolean } = {},
  ) {
    if (!session) {
      return null;
    }

    setIsSaving(true);
    try {
      const updatedDocument = await saveDocumentRecord({
        documentId,
        userId: session.user.id,
        patch,
      });
      updateLocalDocument(updatedDocument);
      if (!options.quiet) {
        toast.success("Saved.");
      }
      return updatedDocument;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function generateDocument() {
    if (!selectedDocument) {
      return;
    }

    setIsGenerating(true);
    const savedDocument = await saveDocument(selectedDocument.id, draftPatch, {
      quiet: true,
    });

    if (!savedDocument) {
      setIsGenerating(false);
      return;
    }

    try {
      const result = await generateDocumentContent({
        documentId: savedDocument.id,
        model,
        message:
          chatMessage.trim() ||
          "Create the PDF from the current chat instructions and linked assets.",
      });

      updateLocalDocument(result.document);
      setChatMessage("");
      if (result.messages) {
        queryClient.setQueryData<DocumentContext>(
          documentQueryKeys.context(result.document.id),
          (currentContext) => ({
            assets: currentContext?.assets ?? [],
            linkedAssets: currentContext?.linkedAssets ?? [],
            messages: result.messages ?? [],
          }),
        );
      } else {
        await queryClient.invalidateQueries({
          queryKey: documentQueryKeys.context(result.document.id),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.versions(result.document.id),
      });
      toast.success("Formatted content generated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function restoreDocumentVersion(versionId: string) {
    if (!session || !selectedDocumentId) {
      return;
    }

    setIsRestoringVersion(true);
    try {
      const savedDocument = await saveDocument(selectedDocumentId, draftPatch, {
        quiet: true,
      });

      if (!savedDocument) {
        return;
      }

      const restoredDocument = await restoreDocumentVersionRecord(
        versionId,
        selectedDocumentId,
        session.user.id,
      );

      setDraft(null);
      updateLocalDocument(restoredDocument);
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.versions(selectedDocumentId),
      });
      toast.success("Version restored.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRestoringVersion(false);
    }
  }

  async function saveContentText(nextContentText: string) {
    if (!selectedDocument) {
      return false;
    }

    const patch = createSavePatch({
      title,
      contentText: nextContentText,
      pagePreset,
      customWidth,
      customHeight,
      theme,
    });

    const updatedDocument = await saveDocument(selectedDocument.id, patch, {
      quiet: true,
    });

    if (!updatedDocument) {
      return false;
    }

    setDraft(null);
    return true;
  }

  function updateDraft(patch: Partial<Omit<DocumentDraft, "documentId">>) {
    if (!selectedDocument) {
      return;
    }

    setDraft((currentDraft) => {
      const base =
        currentDraft?.documentId === selectedDocument.id
          ? currentDraft
          : {
              documentId: selectedDocument.id,
              title: selectedDocument.title,
              contentText: getEditableContentText(selectedDocument),
              pagePreset: selectedDocument.page_preset,
              customWidth: selectedDocument.custom_width ?? 595,
              customHeight: selectedDocument.custom_height ?? 842,
              theme: normalizeDocumentTheme(selectedDocument.theme),
            };

      return {
        ...base,
        ...patch,
      };
    });
  }

  async function handleAssetFiles(files: FileList | File[]) {
    if (!session || !selectedDocumentId) {
      return;
    }

    const fileList = Array.from(files);
    if (!fileList.length) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadAndLinkAssets({
        files: fileList,
        userId: session.user.id,
        documentId: selectedDocumentId,
      });

      for (const fileName of result.unsupportedFileNames) {
        toast.error(`${fileName} is not a supported file type.`);
      }

      if (result.uploaded.length) {
        toast.success(
          `${result.uploaded.length} file${result.uploaded.length === 1 ? "" : "s"} uploaded.`,
        );
      }
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.context(selectedDocumentId),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function toggleAssetLink(asset: AssetRow, isLinked: boolean) {
    if (!session || !selectedDocumentId) {
      return;
    }

    try {
      await setDocumentAssetLink({
        documentId: selectedDocumentId,
        assetId: asset.id,
        userId: session.user.id,
        isLinked,
      });
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.context(selectedDocumentId),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    }
  }

  if (isSessionLoading) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-background text-foreground">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <main className="h-dvh overflow-y-auto bg-background text-foreground">
        <LoginForm />
      </main>
    );
  }

  return (
    <DocumentsRouteContext.Provider
      value={{
        session,
        selectedDocumentId,
        selectedDocument,
        documents,
        isLoadingDocuments,
        isCreating,
        isSaving,
        isGenerating,
        isUploading,
        isLoadingVersions: documentVersionsQuery.isPending,
        isRestoringVersion,
        title,
        contentText,
        pagePreset,
        customWidth,
        customHeight,
        theme,
        model,
        setModel,
        chatMessage,
        setChatMessage,
        allAssets,
        linkedAssets,
        messages,
        versions,
        pdfPreviewDocument,
        pdfDocument,
        fileInputRef,
        isAssetDialogOpen,
        setIsAssetDialogOpen,
        createDocument,
        deleteDocument,
        generateDocument,
        restoreDocumentVersion,
        saveContentText,
        updateDraft,
        openDocumentRoute,
        goToDocuments,
        handleAssetFiles,
        toggleAssetLink,
        signOut,
      }}
    >
      <Outlet />
    </DocumentsRouteContext.Provider>
  );
}
