-- Q&A cache for the Learn tab "Ask Anything" feature.
-- The route normalizes a question (lowercase, trim, collapse whitespace),
-- looks it up by question_normalized, and either returns the cached answer
-- or generates one and persists it. Hot questions accumulate view_count.

create table if not exists public.learn_qa_cache (
  id uuid primary key default gen_random_uuid(),
  question_normalized text unique not null,
  question_original text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  view_count integer not null default 1,
  last_viewed_at timestamptz not null default now()
);

create index if not exists learn_qa_cache_question_idx on public.learn_qa_cache(question_normalized);
