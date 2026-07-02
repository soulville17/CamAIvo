-- Avatars publics proposés par la plateforme (§8.2).
-- Les images sont servies par le frontend (/public/avatars/*.svg) ;
-- les uploads utilisateurs (Phase 4) iront dans Supabase Storage.
insert into public.avatars (user_id, name, image_url, is_public, status)
values
  (null, 'Patrick', '/avatars/patrick.svg', true, 'ready'),
  (null, 'Anna', '/avatars/anna.svg', true, 'ready'),
  (null, 'Koffi', '/avatars/koffi.svg', true, 'ready'),
  (null, 'Awa', '/avatars/awa.svg', true, 'ready');
