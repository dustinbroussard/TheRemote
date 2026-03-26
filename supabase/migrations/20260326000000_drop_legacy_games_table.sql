-- The app stores game state in Firebase/Firestore, not Postgres.
-- Drop the legacy public.games table so PostgREST no longer exposes it without RLS.
drop table if exists public.games;
