-- ═══════════════════════════════════════════════════════════════
-- Phase 5 — Crédit de points après paiement confirmé
-- ═══════════════════════════════════════════════════════════════

-- Appelée uniquement par les Edge Functions de paiement (service role)
-- quand le webhook du prestataire confirme l'encaissement.
-- IDEMPOTENTE : un webhook rejoué ne crédite pas deux fois.
create or replace function public.credit_points(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_balance numeric;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object('error', 'payment_not_found');
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('error', 'already_paid');
  end if;

  update public.payments
  set status = 'paid'
  where id = p_payment_id;

  update public.profiles
  set points_balance = round(points_balance + v_payment.points_granted, 2)
  where id = v_payment.user_id
  returning points_balance into v_balance;

  insert into public.point_transactions (user_id, type, amount, balance_after, reference)
  values (v_payment.user_id, 'purchase', v_payment.points_granted, v_balance, p_payment_id::text);

  return jsonb_build_object(
    'balance', v_balance,
    'points_granted', v_payment.points_granted
  );
end;
$$;

revoke execute on function public.credit_points(uuid)
  from anon, authenticated, public;

-- Marque un paiement comme échoué/expiré (webhook), sans crédit.
create or replace function public.fail_payment(p_payment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.payments
  set status = 'failed'
  where id = p_payment_id and status = 'pending';
$$;

revoke execute on function public.fail_payment(uuid)
  from anon, authenticated, public;
