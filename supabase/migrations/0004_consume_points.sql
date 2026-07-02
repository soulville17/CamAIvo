-- ═══════════════════════════════════════════════════════════════
-- Phase 3 — Décompte de points côté serveur
-- ═══════════════════════════════════════════════════════════════

-- Le débit se fait par tranche de ~10 s (3,33 pts) : le solde doit
-- accepter les fractions. L'affichage arrondit.
alter table public.profiles
  alter column points_balance type numeric(10, 2);

-- Fonction ATOMIQUE appelée uniquement par l'Edge Function consume-points
-- (service role). Verrouille session + profil, facture le temps écoulé
-- depuis le dernier heartbeat, journalise, et coupe la session à 0.
create or replace function public.consume_session_points(
  p_session_id uuid,
  p_user_id uuid,
  p_stop boolean,
  p_points_per_minute numeric default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.swap_sessions%rowtype;
  v_balance numeric;
  v_now timestamptz := now();
  v_elapsed numeric;
  v_charge numeric;
  v_new_balance numeric;
  v_depleted boolean := false;
  v_ended boolean;
begin
  select * into v_session
  from public.swap_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'session_not_found');
  end if;

  if v_session.status <> 'active' then
    return jsonb_build_object(
      'error', 'session_already_ended',
      'points_used', v_session.points_used,
      'duration_seconds', v_session.duration_seconds
    );
  end if;

  select points_balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  -- Temps écoulé depuis le dernier tick, borné à 30 s : si les heartbeats
  -- se perdent (onglet endormi, coupure réseau), l'utilisateur n'est
  -- facturé qu'une tranche — le temps compté = le temps facturé.
  v_elapsed := extract(epoch from (v_now - v_session.last_heartbeat_at));
  v_elapsed := least(greatest(v_elapsed, 0), 30);
  v_charge := round(v_elapsed / 60.0 * p_points_per_minute, 2);

  if v_charge >= v_balance then
    v_charge := v_balance;
    v_depleted := true;
  end if;
  v_new_balance := round(v_balance - v_charge, 2);

  update public.profiles
  set points_balance = v_new_balance
  where id = p_user_id;

  if v_charge > 0 then
    insert into public.point_transactions (user_id, type, amount, balance_after, reference)
    values (p_user_id, 'consumption', -v_charge, v_new_balance, p_session_id::text);
  end if;

  v_ended := p_stop or v_depleted;

  update public.swap_sessions
  set duration_seconds = duration_seconds + round(v_elapsed)::int,
      points_used = round(points_used + v_charge, 2),
      last_heartbeat_at = v_now,
      status = case when v_ended then 'ended' else 'active' end,
      ended_at = case when v_ended then v_now else null end
  where id = p_session_id
  returning * into v_session;

  return jsonb_build_object(
    'balance', v_new_balance,
    'charge', v_charge,
    'points_used', v_session.points_used,
    'duration_seconds', v_session.duration_seconds,
    'depleted', v_depleted,
    'ended', v_ended
  );
end;
$$;

-- Réservée au service role : jamais exposée à l'API publique.
revoke execute on function public.consume_session_points(uuid, uuid, boolean, numeric)
  from anon, authenticated, public;
