create schema if not exists private;

create or replace function private.set_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  formatted_content text not null default '',
  content_blocks jsonb not null default '[]'::jsonb,
  page_preset text not null default 'a4',
  custom_width numeric,
  custom_height numeric,
  theme jsonb not null default '{
    "preset": "classic",
    "fontFamily": "Helvetica",
    "accentColor": "#2563eb",
    "fontScale": 1,
    "margin": 42,
    "imageSize": "medium",
    "text": {
      "h1": { "fontSize": 22, "lineHeight": 1.2, "spacingAfter": 12 },
      "p": { "fontSize": 11, "lineHeight": 1.55, "spacingAfter": 8 },
      "li": { "fontSize": 11, "lineHeight": 1.45, "spacingAfter": 4 }
    }
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_page_preset_check check (
    page_preset in (
      'a4',
      'letter',
      'powerpoint-16-9',
      'powerpoint-4-3',
      'custom'
    )
  ),
  constraint documents_custom_size_check check (
    page_preset <> 'custom'
    or (
      custom_width is not null
      and custom_height is not null
      and custom_width > 0
      and custom_height > 0
    )
  ),
  constraint documents_content_blocks_is_array_check check (
    jsonb_typeof(content_blocks) = 'array'
  ),
  constraint documents_theme_is_object_check check (jsonb_typeof(theme) = 'object')
);

create index documents_user_id_idx on public.documents using btree (user_id);
create index documents_updated_at_idx on public.documents using btree (updated_at desc);

create trigger set_documents_updated_at
before update on public.documents
for each row
execute function private.set_documents_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'document-assets',
  'document-assets',
  false,
  52428800,
  array[
    'text/plain',
    'text/markdown',
    'application/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'document-assets',
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_bucket_id_check check (bucket_id = 'document-assets'),
  constraint assets_storage_path_owner_check check (
    split_part(storage_path, '/', 1) = user_id::text
  ),
  constraint assets_size_bytes_check check (size_bytes >= 0),
  unique (bucket_id, storage_path)
);

create table public.document_assets (
  document_id uuid not null references public.documents(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, asset_id)
);

create table public.document_messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint document_messages_role_check check (role in ('user', 'assistant'))
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  formatted_content text not null,
  content_blocks jsonb not null default '[]'::jsonb,
  page_preset text not null,
  custom_width numeric,
  custom_height numeric,
  theme jsonb not null,
  source text not null default 'generation',
  version_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint document_versions_page_preset_check check (
    page_preset in (
      'a4',
      'letter',
      'powerpoint-16-9',
      'powerpoint-4-3',
      'custom'
    )
  ),
  constraint document_versions_custom_size_check check (
    page_preset <> 'custom'
    or (
      custom_width is not null
      and custom_height is not null
      and custom_width > 0
      and custom_height > 0
    )
  ),
  constraint document_versions_content_blocks_is_array_check check (
    jsonb_typeof(content_blocks) = 'array'
  ),
  constraint document_versions_theme_is_object_check check (
    jsonb_typeof(theme) = 'object'
  ),
  constraint document_versions_source_check check (
    source in ('generation', 'pre_restore')
  )
);

create index assets_user_id_idx on public.assets using btree (user_id);
create index document_assets_user_id_idx on public.document_assets using btree (user_id);
create index document_assets_asset_id_idx on public.document_assets using btree (asset_id);
create index document_messages_document_id_idx on public.document_messages using btree (document_id, created_at);
create index document_messages_user_id_idx on public.document_messages using btree (user_id);
create index document_versions_document_id_version_updated_at_idx
on public.document_versions using btree (document_id, version_updated_at desc);
create index document_versions_user_id_idx on public.document_versions using btree (user_id);

create trigger set_assets_updated_at
before update on public.assets
for each row
execute function private.set_documents_updated_at();

alter table public.documents enable row level security;
alter table public.assets enable row level security;
alter table public.document_assets enable row level security;
alter table public.document_messages enable row level security;
alter table public.document_versions enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.assets to authenticated;
grant select, insert, update, delete on table public.document_assets to authenticated;
grant select, insert, update, delete on table public.document_messages to authenticated;
grant select, insert, delete on table public.document_versions to authenticated;
grant all on table public.documents to service_role;
grant all on table public.assets to service_role;
grant all on table public.document_assets to service_role;
grant all on table public.document_messages to service_role;
grant all on table public.document_versions to service_role;

create policy "Users can view their own documents."
on public.documents
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own documents."
on public.documents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own documents."
on public.documents
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own documents."
on public.documents
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own assets."
on public.assets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own assets."
on public.assets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own assets."
on public.assets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own assets."
on public.assets
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own document asset links."
on public.document_assets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can link their own assets to their own documents."
on public.document_assets
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.documents
    where documents.id = document_assets.document_id
      and documents.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.assets
    where assets.id = document_assets.asset_id
      and assets.user_id = (select auth.uid())
  )
);

create policy "Users can unlink their own document assets."
on public.document_assets
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own document messages."
on public.document_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create messages on their own documents."
on public.document_messages
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.documents
    where documents.id = document_messages.document_id
      and documents.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own document messages."
on public.document_messages
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own document versions."
on public.document_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create versions for their own documents."
on public.document_versions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.documents
    where documents.id = document_versions.document_id
      and documents.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own document versions."
on public.document_versions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own document asset objects."
on storage.objects
for select
to authenticated
using (
  bucket_id = 'document-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can upload their own document asset objects."
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'document-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own document asset objects."
on storage.objects
for update
to authenticated
using (
  bucket_id = 'document-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'document-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own document asset objects."
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'document-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
