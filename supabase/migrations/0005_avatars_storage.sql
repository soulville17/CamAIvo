-- ═══════════════════════════════════════════════════════════════
-- Phase 4 — Storage des avatars + contrainte "un défaut par user"
-- ═══════════════════════════════════════════════════════════════

-- Bucket public en lecture (les images d'avatar sont affichées partout),
-- limité à 5 Mo et aux formats image courants.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Écriture réservée au dossier de l'utilisateur : avatars/{user_id}/...
create policy "avatars_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Un seul avatar par défaut par utilisateur.
create unique index avatars_one_default_per_user
  on public.avatars (user_id)
  where is_default;
