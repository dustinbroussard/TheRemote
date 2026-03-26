# Supabase Security Notes

## Remove the legacy `public.games` table

PostgREST exposes tables in the `public` schema. This project does not use a PostgreSQL `games` table in application code, so if `public.games` still exists in the database it should be removed.

Apply the migration in [supabase/migrations/20260326000000_drop_legacy_games_table.sql](/home/dustin/Projects/TheRemote/supabase/migrations/20260326000000_drop_legacy_games_table.sql).

If you are running SQL manually in the Supabase SQL editor, execute:

```sql
drop table if exists public.games;
```

After applying the change, verify:

```sql
select to_regclass('public.games');
```

The result should be `null`.
