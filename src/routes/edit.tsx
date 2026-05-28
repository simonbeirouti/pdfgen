import { memo, useMemo, useState, type ReactElement } from "react";
import {
  PDFDownloadLink,
  PDFViewer,
  type DocumentProps,
} from "@react-pdf/renderer";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  Loader2Icon,
  LogOutIcon,
  MessageSquareIcon,
  PaletteIcon,
  PaperclipIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize, slugify } from "@/lib/document-utils";
import {
  DEFAULT_DOCUMENT_THEME,
  DOCUMENT_THEME_ACCENT_COLORS,
  DOCUMENT_THEME_FONT_OPTIONS,
  DOCUMENT_THEME_IMAGE_SIZE_OPTIONS,
  DOCUMENT_THEME_MARGIN_MAX,
  DOCUMENT_THEME_MARGIN_MIN,
  DOCUMENT_THEME_MARGIN_STEP,
  DOCUMENT_THEME_PRESETS,
  DOCUMENT_THEME_PRESET_OPTIONS,
  OPENAI_MODEL_OPTIONS,
  PAGE_PRESETS,
  formatUpdatedAt,
  getPageSize,
  isImageAsset,
  normalizeDocumentTheme,
  type AssetRow,
  type DocumentTheme,
  type DocumentThemeFont,
  type DocumentThemeImageSize,
  type DocumentThemePreset,
  type DocumentVersionRow,
  type LinkedAsset,
  type OpenAIModel,
  type PagePreset,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import { useDocumentsRouteContext } from "@/routes/document-route-context";

export function EditDocumentRoute() {
  const {
    selectedDocument,
    selectedDocumentId,
    isLoadingDocuments,
    title,
    isGenerating,
    isSaving,
    isLoadingVersions,
    isRestoringVersion,
    pdfDocument,
    pdfPreviewDocument,
    contentText,
    model,
    setModel,
    pagePreset,
    customWidth,
    customHeight,
    theme,
    allAssets,
    linkedAssets,
    messages,
    versions,
    chatMessage,
    setChatMessage,
    fileInputRef,
    isUploading,
    isAssetDialogOpen,
    setIsAssetDialogOpen,
    goToDocuments,
    signOut,
    updateDraft,
    saveContentText,
    handleAssetFiles,
    toggleAssetLink,
    generateDocument,
    restoreDocumentVersion,
    deleteDocument,
  } = useDocumentsRouteContext();
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [isVersionSheetOpen, setIsVersionSheetOpen] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentEditorValue, setContentEditorValue] = useState(contentText);

  function startEditingContent() {
    setContentEditorValue(contentText);
    setIsEditingContent(true);
  }

  async function saveAndPreviewContent() {
    const didSave = await saveContentText(contentEditorValue);

    if (didSave) {
      setIsEditingContent(false);
    }
  }

  if (selectedDocumentId && !selectedDocument) {
    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <EditorHeader
          title="PDF Editor"
          onBack={goToDocuments}
          onSignOut={signOut}
        />
        <section className="flex min-h-0 flex-1 items-center justify-center p-6">
          {isLoadingDocuments ? (
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-center">
              <FileTextIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
              <h1 className="text-base font-semibold">PDF not found</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This PDF may have been deleted or is not available to your
                account.
              </p>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!selectedDocument || !pdfDocument) {
    return null;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            aria-label="Back to documents"
            variant="ghost"
            size="icon"
            onClick={goToDocuments}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {title.trim() || "Untitled"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isGenerating ? "Generating" : isSaving ? "Saving" : "Saved"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsVersionSheetOpen(true)}
          >
            <HistoryIcon />
            Versions
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsThemeSheetOpen(true)}
          >
            <PaletteIcon />
            Theme
          </Button>
          <PDFDownloadLink
            document={pdfDocument}
            fileName={`${slugify(title || "document")}.pdf`}
          >
            {({ loading }) => (
              <Button size="sm" variant="outline" disabled={loading}>
                <DownloadIcon />
                Download
              </Button>
            )}
          </PDFDownloadLink>
          <Button
            aria-label="Delete document"
            variant="destructive"
            size="icon"
            onClick={() => deleteDocument(selectedDocument.id)}
          >
            <Trash2Icon />
          </Button>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(360px,40%)_1fr] lg:grid-rows-1">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-b border-border p-4 lg:border-r lg:border-b-0">
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) =>
                    updateDraft({ title: event.target.value })
                  }
                  placeholder="Untitled"
                />
              </div>

              <div className="grid gap-2">
                <Label>AI model</Label>
                <Select
                  value={model}
                  onValueChange={(value) => setModel(value as OpenAIModel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Files</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssetDialogOpen(true)}
                >
                  <PaperclipIcon />
                  Assign
                </Button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleAssetFiles(event.dataTransfer.files);
                }}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground transition hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {isUploading ? (
                  <Loader2Icon className="size-5 animate-spin" />
                ) : (
                  <UploadCloudIcon className="size-5" />
                )}
                <span>Drop markdown, text, docx, or image files here</span>
                <span className="text-xs">
                  Uploaded files are linked to this PDF automatically.
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".md,.txt,.docx,image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  if (event.target.files) {
                    void handleAssetFiles(event.target.files);
                  }
                  event.currentTarget.value = "";
                }}
              />
              {linkedAssets.length ? (
                <div className="grid max-h-32 gap-2 overflow-y-auto pr-1">
                  {linkedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isImageAsset(asset) ? (
                          <ImageIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <FileTextIcon className="size-4 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate">{asset.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(asset.size_bytes)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Unlink ${asset.filename}`}
                        onClick={() => void toggleAssetLink(asset, true)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-2">
              <Label htmlFor="chat-message">Chat</Label>
              <div className="min-h-0 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {messages.length ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "ml-8 bg-primary text-primary-foreground"
                          : "mr-8 bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Ask how the PDF should be written.
                  </p>
                )}
              </div>
              <Textarea
                id="chat-message"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Tell AI what to create or change."
                className="min-h-20 resize-none"
              />
              <Button
                size="lg"
                onClick={generateDocument}
                disabled={
                  isGenerating || (!chatMessage.trim() && !linkedAssets.length)
                }
              >
                {isGenerating ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <MessageSquareIcon />
                )}
                Send to AI
              </Button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden bg-muted/40 p-4">
          <div className="mb-3 flex shrink-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-sm font-medium">
                {isEditingContent ? "Edit Content" : "PDF Preview"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditingContent
                  ? "Save to return to the PDF preview."
                  : pdfPreviewDocument
                    ? getPageSize(pdfPreviewDocument).label
                    : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {!isEditingContent ? (
                <>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Page size
                    </Label>
                    <Select
                      value={pagePreset}
                      onValueChange={(value) =>
                        updateDraft({ pagePreset: value as PagePreset })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {pagePreset === "custom" ? (
                    <>
                      <div className="grid gap-1">
                        <Label
                          htmlFor="custom-width"
                          className="text-xs text-muted-foreground"
                        >
                          Width
                        </Label>
                        <Input
                          id="custom-width"
                          type="number"
                          min={120}
                          value={customWidth}
                          onChange={(event) =>
                            updateDraft({
                              customWidth: Number(event.target.value) || 120,
                            })
                          }
                          className="w-24"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label
                          htmlFor="custom-height"
                          className="text-xs text-muted-foreground"
                        >
                          Height
                        </Label>
                        <Input
                          id="custom-height"
                          type="number"
                          min={120}
                          value={customHeight}
                          onChange={(event) =>
                            updateDraft({
                              customHeight: Number(event.target.value) || 120,
                            })
                          }
                          className="w-24"
                        />
                      </div>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startEditingContent}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveAndPreviewContent()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <CheckIcon />
                  )}
                  Save & Preview
                </Button>
              )}
            </div>
          </div>
          {isEditingContent ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
              <Textarea
                id="document-content"
                value={contentEditorValue}
                onChange={(event) => setContentEditorValue(event.target.value)}
                placeholder="Generated PDF content"
                className="h-full min-h-0 resize-none rounded-none border-0 bg-background p-4 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
              />
            </div>
          ) : (
            <PdfViewerPane pdfDocument={pdfDocument} />
          )}
        </section>
      </section>
      <ThemeSheet
        open={isThemeSheetOpen}
        theme={theme}
        onOpenChange={setIsThemeSheetOpen}
        onThemeChange={(nextTheme) => updateDraft({ theme: nextTheme })}
      />
      <VersionHistorySheet
        open={isVersionSheetOpen}
        versions={versions}
        isLoading={isLoadingVersions}
        isRestoring={isRestoringVersion}
        onOpenChange={setIsVersionSheetOpen}
        onRestore={(versionId) => {
          void restoreDocumentVersion(versionId);
        }}
      />
      <AssetDialog
        assets={allAssets}
        linkedAssets={linkedAssets}
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        onToggleAsset={toggleAssetLink}
      />
    </main>
  );
}

function VersionHistorySheet({
  open,
  versions,
  isLoading,
  isRestoring,
  onOpenChange,
  onRestore,
}: {
  open: boolean;
  versions: DocumentVersionRow[];
  isLoading: boolean;
  isRestoring: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (versionId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(100vw,420px)] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>Checkpoints from generated PDF updates.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 p-4">
          {isLoading ? (
            <div className="flex min-h-28 items-center justify-center">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length ? (
            versions.map((version) => (
              <div
                key={version.id}
                className="grid gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {version.title || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUpdatedAt(version.version_updated_at)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {version.source === "pre_restore"
                      ? "Before restore"
                      : "Generated"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {version.formatted_content.trim() || "Empty document"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRestoring}
                  onClick={() => onRestore(version.id)}
                >
                  {isRestoring ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <RotateCcwIcon />
                  )}
                  Restore
                </Button>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No checkpoints yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ThemeSheet({
  open,
  theme,
  onOpenChange,
  onThemeChange,
}: {
  open: boolean;
  theme: DocumentTheme;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (theme: DocumentTheme) => void;
}) {
  const normalizedTheme = normalizeDocumentTheme(theme);

  function updateTheme(patch: Partial<DocumentTheme>) {
    onThemeChange(normalizeDocumentTheme({ ...normalizedTheme, ...patch }));
  }

  function applyPreset(preset: DocumentThemePreset) {
    onThemeChange(DOCUMENT_THEME_PRESETS[preset]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(100vw,420px)] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>PDF Theme</SheetTitle>
          <SheetDescription>Adjust styling for this document.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 p-4">
          <div className="grid gap-3">
            <Label>Preset</Label>
            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_THEME_PRESET_OPTIONS.map((option) => {
                const presetTheme = DOCUMENT_THEME_PRESETS[option.value];
                const isSelected = normalizedTheme.preset === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyPreset(option.value)}
                    className={cn(
                      "grid gap-2 rounded-lg border border-border bg-background p-2 text-left text-sm transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      isSelected && "border-ring bg-muted",
                    )}
                  >
                    <ThemeMiniPreview theme={presetTheme} />
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_THEME_ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use ${color} accent`}
                  onClick={() => updateTheme({ accentColor: color })}
                  className={cn(
                    "size-8 rounded-full border border-border transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    normalizedTheme.accentColor === color &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Font</Label>
            <Select
              value={normalizedTheme.fontFamily}
              onValueChange={(value) =>
                updateTheme({ fontFamily: value as DocumentThemeFont })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_THEME_FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Font scale</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round(normalizedTheme.fontScale * 100)}%
              </span>
            </div>
            <Slider
              min={0.85}
              max={1.25}
              step={0.05}
              value={[normalizedTheme.fontScale]}
              onValueChange={(value) =>
                updateTheme({ fontScale: value[0] ?? DEFAULT_DOCUMENT_THEME.fontScale })
              }
            />
          </div>

          <div className="grid gap-4">
            <Label>Text styles</Label>
            <TextSizeSlider
              label="Heading"
              value={normalizedTheme.text.h1.fontSize}
              min={14}
              max={36}
              onChange={(fontSize) =>
                updateTheme({
                  text: {
                    ...normalizedTheme.text,
                    h1: { ...normalizedTheme.text.h1, fontSize },
                  },
                })
              }
            />
            <TextSizeSlider
              label="Paragraph"
              value={normalizedTheme.text.p.fontSize}
              min={8}
              max={20}
              onChange={(fontSize) =>
                updateTheme({
                  text: {
                    ...normalizedTheme.text,
                    p: { ...normalizedTheme.text.p, fontSize },
                  },
                })
              }
            />
            <TextSizeSlider
              label="List item"
              value={normalizedTheme.text.li.fontSize}
              min={8}
              max={20}
              onChange={(fontSize) =>
                updateTheme({
                  text: {
                    ...normalizedTheme.text,
                    li: { ...normalizedTheme.text.li, fontSize },
                  },
                })
              }
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Margins</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {normalizedTheme.margin} pt
              </span>
            </div>
            <Slider
              min={DOCUMENT_THEME_MARGIN_MIN}
              max={DOCUMENT_THEME_MARGIN_MAX}
              step={DOCUMENT_THEME_MARGIN_STEP}
              value={[normalizedTheme.margin]}
              onValueChange={(value) =>
                updateTheme({
                  margin: value[0] ?? DEFAULT_DOCUMENT_THEME.margin,
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Images</Label>
            <Select
              value={normalizedTheme.imageSize}
              onValueChange={(value) =>
                updateTheme({ imageSize: value as DocumentThemeImageSize })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_THEME_IMAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onThemeChange(DEFAULT_DOCUMENT_THEME)}
          >
            <RotateCcwIcon />
            Reset theme
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TextSizeSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value.toFixed(value % 1 ? 1 : 0)} pt
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={0.5}
        value={[value]}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? value)}
      />
    </div>
  );
}

function ThemeMiniPreview({ theme }: { theme: DocumentTheme }) {
  const previewTheme = normalizeDocumentTheme(theme);
  const isCompact = previewTheme.preset === "compact";
  const isPresentation = previewTheme.preset === "presentation";

  return (
    <div
      className={cn(
        "flex aspect-[4/3] flex-col rounded border border-border bg-white p-2",
        isPresentation && "bg-slate-50",
      )}
      style={{ fontFamily: previewTheme.fontFamily }}
    >
      <div
        className={cn("mb-2 h-1", isPresentation ? "w-1/3" : "w-full")}
        style={{ backgroundColor: previewTheme.accentColor }}
      />
      <div className={cn("grid gap-1", isCompact && "gap-0.5")}>
        <div className="h-1.5 w-2/3 rounded-sm bg-zinc-900" />
        <div className="h-1 w-full rounded-sm bg-zinc-300" />
        <div className="h-1 w-5/6 rounded-sm bg-zinc-300" />
        <div className="h-1 w-3/5 rounded-sm bg-zinc-300" />
      </div>
      {previewTheme.imageSize !== "small" ? (
        <div className="mt-auto h-5 rounded-sm bg-zinc-200" />
      ) : null}
    </div>
  );
}

function EditorHeader({
  title,
  onBack,
  onSignOut,
}: {
  title: string;
  onBack: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          aria-label="Back to documents"
          variant="ghost"
          size="icon"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </Button>
        <p className="truncate text-sm font-medium">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Button variant="outline" size="sm" onClick={onSignOut}>
          <LogOutIcon />
          Logout
        </Button>
      </div>
    </header>
  );
}

const PdfViewerPane = memo(function PdfViewerPane({
  pdfDocument,
}: {
  pdfDocument: ReactElement<DocumentProps>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted">
      <PDFViewer
        showToolbar={false}
        className="h-full w-full"
        style={{ border: "none" }}
      >
        {pdfDocument}
      </PDFViewer>
    </div>
  );
});

function AssetDialog({
  assets,
  linkedAssets,
  open,
  onOpenChange,
  onToggleAsset,
}: {
  assets: AssetRow[];
  linkedAssets: LinkedAsset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleAsset: (asset: AssetRow, isLinked: boolean) => void | Promise<void>;
}) {
  const linkedAssetIds = useMemo(
    () => new Set(linkedAssets.map((asset) => asset.id)),
    [linkedAssets],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Assets</DialogTitle>
          <DialogDescription>
            Link uploaded files to this PDF or reuse files from other PDFs.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {assets.length ? (
            assets.map((asset) => {
              const isLinked = linkedAssetIds.has(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => void onToggleAsset(asset, isLinked)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isImageAsset(asset) ? (
                      <ImageIcon className="size-4 text-muted-foreground" />
                    ) : (
                      <FileTextIcon className="size-4 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate">{asset.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.size_bytes)}
                      </p>
                    </div>
                  </div>
                  {isLinked ? (
                    <Badge variant="secondary">
                      <CheckIcon />
                      Linked
                    </Badge>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                </button>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              Upload a file from the editor to start your asset library.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
