import { FileTextIcon, Loader2Icon, LogOutIcon, PlusIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatUpdatedAt,
  getPagePreset,
  getPageSize,
  type DocumentRow,
} from "@/lib/documents";
import { useDocumentsRouteContext } from "@/routes/document-route-context";

export function DocumentsIndexRoute() {
  const {
    documents,
    isCreating,
    isLoadingDocuments,
    createDocument,
    openDocumentRoute,
    signOut,
  } = useDocumentsRouteContext();

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-end px-4">
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOutIcon />
            Logout
          </Button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-6 py-12">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,220px))] gap-x-16 gap-y-12">
          <button
            type="button"
            onClick={createDocument}
            disabled={isCreating}
            className="group flex w-[220px] flex-col items-center gap-4 text-left outline-none"
          >
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-800 transition-colors group-hover:bg-zinc-700 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
              {isCreating ? (
                <Loader2Icon className="size-10 animate-spin text-zinc-300" />
              ) : (
                <PlusIcon className="size-16 text-zinc-200" strokeWidth={1.4} />
              )}
            </div>
            <span className="text-sm font-semibold">Create New</span>
          </button>

          {isLoadingDocuments ? (
            <div className="flex aspect-[4/3] w-[220px] items-center justify-center bg-zinc-900">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {documents.map((document) => (
            <DocumentTile
              key={document.id}
              document={document}
              onOpen={() => openDocumentRoute(document)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function DocumentTile({
  document,
  onOpen,
}: {
  document: DocumentRow;
  onOpen: () => void;
}) {
  const pageSize = getPageSize(document);
  const preset = getPagePreset(document.page_preset);
  const previewText = document.formatted_content;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-[220px] flex-col items-center gap-4 text-left outline-none"
    >
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 transition group-hover:ring-zinc-600 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
        <div
          className={cn(
            "flex max-h-[82%] max-w-[74%] flex-col gap-2 overflow-hidden bg-white p-3 text-left text-black shadow-lg",
            pageSize.width > pageSize.height
              ? "aspect-video w-[74%]"
              : "aspect-[3/4] w-[48%]",
          )}
        >
          <div className="h-2 w-2/3 rounded-sm bg-zinc-900" />
          <div className="space-y-1">
            {(previewText || "Empty document")
              .slice(0, 140)
              .split(/\s+/)
              .slice(0, 22)
              .join(" ")
              .split(" ")
              .map((word, index) => (
                <div
                  key={`${word}-${index}`}
                  className="h-1 rounded-sm bg-zinc-300"
                  style={{ width: `${40 + ((word.length + index) % 7) * 8}%` }}
                />
              ))}
          </div>
        </div>
        <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          {preset.label}
        </span>
        <FileTextIcon className="absolute bottom-2 left-2 size-4 text-zinc-500" />
      </div>
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold">{document.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatUpdatedAt(document.updated_at)}
        </p>
      </div>
    </button>
  );
}
