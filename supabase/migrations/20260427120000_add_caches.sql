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
