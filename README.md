# PDF Workspace

PDF Workspace is a browser-based tool for creating AI-assisted PDFs from chat instructions and uploaded source files. Users sign in with a one-time email code, create documents, attach reusable assets, ask the formatter what to write or change, preview the PDF live, and download the final result.

The app is built with Vite, React, TypeScript, TanStack Router, TanStack Query, Supabase, and `@react-pdf/renderer`.

## What it does

- Authenticates users with Supabase email OTP.
- Stores each user's documents in Supabase with row-level security.
- Provides a document dashboard with create, open, and delete flows.
- Opens an editor with autosaved title and page-size settings.
- Supports A4, Letter, PowerPoint 16:9, PowerPoint 4:3, and custom PDF sizes.
- Uploads markdown, text, docx, and common image files to Supabase Storage.
- Lets users link uploaded assets to any of their PDFs.
- Sends chat instructions and linked text assets to the `format-document` Edge Function.
- Uses the OpenAI Responses API inside the Edge Function to generate PDF-ready prose.
- Renders linked images into the PDF preview and downloaded PDF.
- Persists React Query cache in IndexedDB for a faster returning experience.

## Project structure

```text
src/
  components/            Shared UI components and PDF rendering
  lib/                   Supabase client, document APIs, asset helpers, query client
  routes/                TanStack Router route components and document context
supabase/
  functions/             Supabase Edge Functions
  migrations/            Database, storage, and RLS schema
  templates/             Email OTP templates
```

Key files:

- `src/routes/root.tsx` owns authentication, document state, autosave, uploads, generation, and route context.
- `src/routes/index.tsx` renders the document dashboard.
- `src/routes/edit.tsx` renders the document editor, chat, asset assignment, preview, download, and delete controls.
- `src/components/pdf-document.tsx` defines the PDF layout used by both preview and download.
- `src/lib/document-service.ts` wraps Supabase table, storage, and function calls.
- `supabase/functions/format-document/index.ts` validates the user, loads linked assets and chat history, calls OpenAI, saves generated content, and returns the updated document.

## Data model

The Supabase schema centers on four user-owned tables:

- `documents`: PDF metadata, generated content, page preset, and custom page dimensions.
- `assets`: uploaded file metadata and extracted text for supported text assets.
- `document_assets`: many-to-many links between documents and assets.
- `document_messages`: user and assistant messages for each document.

Uploaded objects live in the private `document-assets` storage bucket. Database tables and storage objects are protected by RLS policies that scope access to the authenticated user.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL_ALLOWLIST=gpt-5.4-mini,gpt-5.4,gpt-5.5
```

For local Supabase, `supabase start` prints the API URL and publishable/anon key to use for the two `VITE_` variables. `OPENAI_API_KEY` is used by the `format-document` Edge Function, not by the browser client.

## Local development

Install dependencies:

```bash
pnpm install
```

Start Supabase:

```bash
supabase start
```

Run migrations or reset the local database when needed:

```bash
supabase db reset
```

Start the Vite dev server:

```bash
pnpm dev
```

Open the app at the URL printed by Vite, usually `http://localhost:5173`.

During local auth testing, Supabase writes OTP emails to Inbucket. With the default config, Inbucket is available at `http://127.0.0.1:54324`.

## Edge Function

The `format-document` function is configured in `supabase/config.toml` with JWT verification enabled. It expects:

- a signed-in Supabase user,
- `OPENAI_API_KEY`,
- `SUPABASE_URL`,
- a publishable key from `SUPABASE_PUBLISHABLE_KEYS` or `SUPABASE_ANON_KEY`,
- an optional `OPENAI_MODEL_ALLOWLIST`.

The browser invokes it through:

```ts
supabase.functions.invoke("format-document", {
  body: { documentId, model, message },
});
```

The function records the user message, gathers linked asset text and previous messages, asks OpenAI for formatted document body text, updates `documents.formatted_content`, stores the assistant response, and returns the updated document plus message history.

## Scripts

```bash
pnpm dev       # Start the Vite development server
pnpm build     # Type-check and build for production
pnpm lint      # Run ESLint
pnpm preview   # Preview the production build locally
pnpm supabase:start  # Start local Supabase
pnpm supabase:reset  # Reset the local Supabase database
```

## Notes

- Text extraction currently reads plain text and markdown assets in the browser. Docx files are accepted and stored, but their text is not extracted yet.
- Image assets are rendered separately in the generated PDF after the formatted text.
- The frontend only uses the Supabase publishable key. Keep service role keys and OpenAI keys out of browser-exposed variables.
