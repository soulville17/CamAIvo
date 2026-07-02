-- Durcissement : handle_new_user est un trigger interne, il ne doit pas
-- être exposé via l'API REST (/rest/v1/rpc). Le trigger continue de
-- fonctionner car il s'exécute avec les droits du propriétaire.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
