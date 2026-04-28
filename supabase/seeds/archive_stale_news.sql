-- Run after the migration to archive existing news older than 18 months.
-- Idempotent: re-run anytime to catch newly stale rows.
update public.news_updates
set archived = true
where archived = false
and (
  (published_at is not null and published_at < now() - interval '18 months')
  or (published_at is null and created_at < now() - interval '18 months')
);
