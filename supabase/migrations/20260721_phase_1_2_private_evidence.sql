-- NFE PropertyScope Phase 1.2
-- Private controlled-beta evidence storage. Builder #2 application only.

alter table if exists public.property_assets
  add column if not exists sanitized_filename text,
  add column if not exists byte_size bigint,
  add column if not exists upload_timestamp timestamptz,
  add column if not exists uploader_id uuid,
  add column if not exists source_category text,
  add column if not exists source_description text,
  add column if not exists storage_object_reference text,
  add column if not exists upload_status text not null default 'SECURE_STORAGE_REQUIRED',
  add column if not exists verification_status text not null default 'Unreviewed',
  add column if not exists provenance_label text,
  add column if not exists truth_class text not null default 'USER-PROVIDED CLAIM';

alter table if exists public.site_projects enable row level security;
alter table if exists public.property_assets enable row level security;

-- PropertyScope's server-side service route is the only Phase 1.2 data path.
-- No anonymous/select/insert/update/delete policy is created here.
-- The service-role credential must stay server-side and ownership is checked by API routes.

drop policy if exists "propertyscope_no_direct_anon_site_projects" on public.site_projects;
drop policy if exists "propertyscope_no_direct_anon_property_assets" on public.property_assets;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-evidence',
  'property-evidence',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_property_assets_project_upload
  on public.property_assets(project_id, upload_timestamp desc);
create index if not exists idx_property_assets_uploader
  on public.property_assets(uploader_id);
