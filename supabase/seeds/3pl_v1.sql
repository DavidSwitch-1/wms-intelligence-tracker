-- Seed: known 3PL <-> client relationships and known 3PL providers.
-- Idempotent. Safe to re-run. Only updates rows that already exist;
-- does not create new companies.
--
-- Apply via Supabase SQL editor (or psql) AFTER running migration
-- 20260427120000_add_caches.sql (which now also adds the 3PL columns).

-- Known 3PL <-> client relationships
update public.companies set third_party_logistics = 'Unipart'
  where lower(name) = lower('JCB');

update public.companies set third_party_logistics = 'Gist'
  where lower(name) in (lower('M&S'), lower('Marks & Spencer'), lower('Marks and Spencer'));

update public.companies set third_party_logistics = 'Clipper'
  where lower(name) = lower('Boohoo');

-- Known 3PL providers themselves
update public.companies set is_3pl = true
  where lower(name) in (
    lower('Unipart'),
    lower('Gist'),
    lower('Clipper'),
    lower('GXO'),
    lower('Wincanton'),
    lower('DHL Supply Chain'),
    lower('Kuehne+Nagel'),
    lower('Yusen'),
    lower('XPO'),
    lower('Bleckmann'),
    lower('Geodis')
  );
