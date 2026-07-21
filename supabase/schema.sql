-- NFE PropertyScope — database foundation with Phase 1.2 private-evidence extension
-- This schema belongs only to the standalone Builder #2 application.

create extension if not exists pgcrypto;

create type provenance_type as enum ('USER_PROVIDED','PUBLIC_DATA','AI_INFERENCE','NFE_OS_ANALYSIS','PROFESSIONALLY_VERIFIED');
create type project_stage as enum ('CAPTURED','EVIDENCE_GATHERING','READY_FOR_ANALYSIS','ANALYZED','SCENARIO_REVIEW','SCENARIO_SELECTED','VISUAL_CONCEPT','PROJECT_PLANNING','ARCHIVED');

create table if not exists site_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  name text not null,
  address text not null default '',
  latitude numeric null,
  longitude numeric null,
  location_description text null,
  parcel_id text null,
  listing_url text null,
  primary_question text not null,
  intended_use text null,
  apparent_current_use text null,
  status text not null default 'New investigation',
  current_stage project_stage not null default 'CAPTURED',
  selected_scenario_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_analyzed_at timestamptz null
);

create table if not exists property_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references site_projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('PHOTO','DOCUMENT','GENERATED_VISUAL')),
  file_url text not null,
  thumbnail_url text null,
  original_filename text not null,
  mime_type text not null,
  caption text null,
  is_primary boolean not null default false,
  provenance provenance_type not null,
  created_at timestamptz not null default now()
);

create table if not exists project_notes (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  content text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  category text not null, title text not null, status text not null, value text not null, summary text null,
  source_name text null, source_url text null, retrieved_at timestamptz null, confidence text null,
  verification_required boolean not null default true, verification_status text not null default 'NEEDS_VERIFICATION',
  provenance provenance_type not null, notes text null, raw_data jsonb null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  analysis_type text not null default 'SITE_ANALYSIS', adapter_version text not null,
  status text not null check (status in ('PENDING','RUNNING','COMPLETED','FAILED')),
  input_snapshot jsonb not null default '{}'::jsonb, output_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), completed_at timestamptz null, error_message text null
);

create table if not exists analysis_findings (
  id uuid primary key default gen_random_uuid(), analysis_run_id uuid not null references analysis_runs(id) on delete cascade,
  project_id uuid not null references site_projects(id) on delete cascade,
  category text not null, statement text not null, importance text not null, confidence text not null,
  verification_status text not null default 'PRELIMINARY', sort_order integer not null default 0, created_at timestamptz not null default now()
);

create table if not exists analysis_finding_evidence (
  analysis_finding_id uuid not null references analysis_findings(id) on delete cascade,
  evidence_item_id uuid not null references evidence_items(id) on delete cascade,
  primary key (analysis_finding_id, evidence_item_id)
);

create table if not exists development_scenarios (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  analysis_run_id uuid null references analysis_runs(id) on delete set null, scenario_type text not null, name text not null,
  concept text not null, why_it_may_fit text not null, advantages jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb, supporting_evidence jsonb not null default '[]'::jsonb,
  conflicting_evidence jsonb not null default '[]'::jsonb, critical_unknowns jsonb not null default '[]'::jsonb,
  complexity text not null, confidence text not null, next_verification_step text not null,
  is_human_selected boolean not null default false, selected_at timestamptz null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table site_projects drop constraint if exists fk_selected_scenario;
alter table site_projects add constraint fk_selected_scenario foreign key (selected_scenario_id) references development_scenarios(id) on delete set null;

create table if not exists risk_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  scenario_id uuid null references development_scenarios(id) on delete set null, category text not null, title text not null,
  description text not null, severity text not null, likelihood text null, status text not null, confidence text not null,
  verification_required boolean not null default true, mitigation text null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists visual_concepts (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  scenario_id uuid not null references development_scenarios(id) on delete cascade, source_asset_id uuid null references property_assets(id) on delete set null,
  concept_description text not null, architectural_style text null, number_of_floors integer null, possible_use text null,
  site_layout_concept text null, parking_concept text null, landscaping_concept text null, notes text null,
  generation_status text not null default 'NOT_STARTED', provider text null, generated_asset_id uuid null references property_assets(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists project_plans (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  scenario_id uuid null references development_scenarios(id) on delete set null, overview text not null,
  requirements jsonb not null default '[]'::jsonb, dependencies jsonb not null default '[]'::jsonb, phases jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb, risks jsonb not null default '[]'::jsonb, mitigations jsonb not null default '[]'::jsonb,
  evidence_needed jsonb not null default '[]'::jsonb, professional_reviews jsonb not null default '[]'::jsonb,
  decision_gates jsonb not null default '[]'::jsonb, next_best_action text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists professional_verifications (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references site_projects(id) on delete cascade,
  evidence_item_id uuid null references evidence_items(id) on delete set null, verification_type text not null,
  professional_name text null, organization text null, verification_date date null, notes text not null,
  document_asset_id uuid null references property_assets(id) on delete set null, created_at timestamptz not null default now()
);

-- Builder #2 controlled NFE-OS integration history.
-- Real-estate cases remain owned by this application's database.
-- These records store returned outputs only; they do not mirror or modify NFE-OS Platform case lineage.
create table if not exists nfe_os_integration_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references site_projects(id) on delete cascade,
  real_estate_case_id text not null,
  status text not null check (status in ('COMPLETED','PARTIAL','FAILED')),
  adapter_version text not null,
  is_mock boolean not null default true,
  nfe_request_id text null,
  hdp_request_id text null,
  rrs_request_id text null,
  nfe_analysis jsonb null,
  hdp_analysis jsonb null,
  rrs_review jsonb null,
  overall_summary text null,
  provider text null,
  model text null,
  service_version text null,
  error_message text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_nfe_os_integration_runs_project_started
  on nfe_os_integration_runs(project_id, started_at desc);

-- ==========================================================
-- NFE PropertyScope Phase 1.2 private evidence extension
-- Apply the matching migration before enabling public uploads.
-- ==========================================================

alter table if exists property_assets
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

alter table if exists site_projects enable row level security;
alter table if exists property_assets enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-evidence', 'property-evidence', false, 20971520,
  array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
