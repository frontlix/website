-- 065_lock_profile_self_approve.sql
-- DRAAIEN: al toegepast op de live DB (ntew) via Supabase op 2026-06-28.
-- Dit bestand legt de wijziging vast in de repo voor traceerbaarheid.
--
-- Beveiliging: voorkom dat een gebruiker zichzelf goedkeurt. De RLS-UPDATE-
-- policy ("user kan eigen profile updaten") liet een user z'n eigen profielrij
-- vrij muteren, inclusief tenant_status/is_owner/approved_op → een pending user
-- kon zichzelf op 'approved' zetten en zo alle leads/PII inzien.
--
-- Een kolom-REVOKE werkt NIET als het UPDATE-recht tabel-breed is gegeven
-- (Postgres-valkuil), dus we trekken het tabel-brede recht in en geven alleen
-- de enige legitieme zelf-bewerkbare kolom terug: onboarding_voltooid_op
-- (gezet door completeOnboardingAction via de user-sessie). Goedkeuren gebeurt
-- voortaan uitsluitend via de service-role (Frontlix-admin); avg-actions
-- (account afwijzen) draait ook via service-role. service_role is niet geraakt.
revoke update on public.dashboard_user_profiles from authenticated, anon;
grant update (onboarding_voltooid_op) on public.dashboard_user_profiles to authenticated;
