-- All writes go through the authenticated, owner-checked Edge Function.
create table public.cocktail_entries (
 id text primary key,
 year integer not null check (year between 2020 and 2100),
 day integer not null check (day between 1 and 24),
 recipe_json jsonb not null,
 source_url text not null unique,
 source_text text not null,
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(year,day)
);
create index cocktail_entries_owner_idx on public.cocktail_entries(owner_id);
create table public.cocktail_photos (
 id uuid primary key,
 year integer not null check (year between 2020 and 2100),
 day integer not null check (day between 1 and 24),
 recipe_slug text not null,
 variant_id text,
 object_key text not null unique,
 mime text not null check (mime in ('image/jpeg','image/png','image/webp')),
 caption text not null default '' check (length(caption)<=1000),
 digest text not null,
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 replaces_photo_id text,
 replacement_scope text,
 check ((replaces_photo_id is null) = (replacement_scope is null)),
 unique(year,day,digest)
);
create index cocktail_photos_owner_idx on public.cocktail_photos(owner_id);
create unique index cocktail_photos_replace_once on public.cocktail_photos(replaces_photo_id,replacement_scope) where replaces_photo_id is not null;
alter table public.cocktail_entries enable row level security;
alter table public.cocktail_photos enable row level security;
revoke all on public.cocktail_entries, public.cocktail_photos from anon, authenticated;
grant all on public.cocktail_entries, public.cocktail_photos to service_role;
-- Explicit deny policies document that even authenticated visitors have no direct access.
create policy "Server manages entries" on public.cocktail_entries for all to service_role using (true) with check (true);
create policy "Server manages photos" on public.cocktail_photos for all to service_role using (true) with check (true);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('cocktail-photos','cocktail-photos',true,12582912,array['image/jpeg','image/png','image/webp']);
