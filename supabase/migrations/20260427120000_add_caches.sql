-- Add token cache columns for AI-generated content.
-- Briefs are cached per company; LinkedIn drafts are cached per news_update;
-- InMail messages are cached per company.
-- TTL is enforced in application code (7 days as of 2026-04-27).

alter table public.companies
  add column if not exists cached_brief text,
  add column if not exists cached_brief_at timestamptz,
  add column if not exists cached_inmail text,
  add column if not exists cached_inmail_at timestamptz;

alter table public.news_updates
  add column if not exists cached_linkedin_posts jsonb,
  add column if not exists cached_linkedin_at timestamptz;

-- Helpful indexes for the cron-health and digest endpoints.
create index if not exists news_updates_created_at_idx on public.news_updates (created_at desc);
create index if not exists news_updates_published_at_idx on public.news_updates (published_at desc);
create index if not exists companies_last_researched_at_idx on public.companies (last_researched_at desc);

-- 3PL relationship tracking (added 2026-04-28).
-- third_party_logistics: name of the 3PL provider this company outsources warehousing to (e.g. "Unipart").
-- is_3pl: true when this company IS itself a 3PL provider operating warehouses for other brands.
alter table public.companies add column if not exists third_party_logistics text;
alter table public.companies add column if not exists is_3pl boolean not null default false;
create index if not exists companies_is_3pl_idx on public.companies(is_3pl) where is_3pl;
create index if not exists companies_third_party_logistics_idx on public.companies(third_party_logistics) where third_party_logistics is not null;

-- Geocoding columns for the Map view (added 2026-04-28).
-- Populated by /api/geocode (Nominatim, daily cron). geocoded_at is stamped
-- on every attempt so failed geocodes don't get retried until 6 months pass.
alter table public.companies add column if not exists latitude double precision;
alter table public.companies add column if not exists longitude double precision;
alter table public.companies add column if not exists hq_city text;
alter table public.companies add column if not exists geocoded_at timestamptz;
create index if not exists companies_lat_lng_idx on public.companies(latitude, longitude) where latitude is not null and longitude is not null;

-- News freshness: published_at column (idempotent) + archived flag
alter table public.news_updates add column if not exists published_at timestamptz;
alter table public.news_updates add column if not exists archived boolean not null default false;
create index if not exists news_updates_published_at_idx on public.news_updates(published_at desc) where not archived;
create index if not exists news_updates_archived_idx on public.news_updates(archived) where archived;

-- Auto-discovery: track companies added by the sweep's discovery pass (added 2026-04-29).
-- The nightly sweep researches existing companies AND proactively discovers new ones via
-- Claude + web search. New rows are inserted with auto_discovered=true and pending status;
-- David verifies/dismisses them from the Dashboard "Recently discovered" strip.
alter table public.companies add column if not exists auto_discovered boolean not null default false;
alter table public.companies add column if not exists discovered_at timestamptz;
alter table public.companies add column if not exists discovery_status text default 'pending' check (discovery_status in ('pending', 'verified', 'dismissed'));

create index if not exists companies_auto_discovered_idx on public.companies(auto_discovered, discovery_status) where auto_discovered;
create index if not exists companies_discovered_at_idx on public.companies(discovered_at desc) where auto_discovered;
-- Watching list / starred companies (added 2026-04-29).
-- Recruiter-mental-model: the 5-10 companies someone is actively pitching this
-- week, surfaced first on the Dashboard as a "Watching" strip.
alter table public.companies add column if not exists starred boolean not null default false;
alter table public.companies add column if not exists starred_at timestamptz;
create index if not exists companies_starred_idx on public.companies(starred, starred_at desc) where starred;

-- Shared briefs (added 2026-04-30).
-- Recruiter generates a brief and shares a public, unguessable link with hiring managers.
-- The token IS the credential — no auth required to view. View counts tracked for visibility.
create table if not exists public.shared_briefs (
  id uuid primary key default gen_random_uuid(),
  share_token text unique not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  company_name text not null,
  brief_content text not null,
  created_by text default 'david',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz
);
create index if not exists shared_briefs_token_idx on public.shared_briefs(share_token);
create index if not exists shared_briefs_company_idx on public.shared_briefs(company_id);
