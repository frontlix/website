-- 061_lead_notes_update_policy.sql
-- Notities bewerken + verwijderen door het hele team.
--
-- Migratie 024 gaf lead_notes alleen SELECT/INSERT/DELETE, en DELETE was
-- beperkt tot de auteur (auteur = auth.uid()). Er was GEEN update-policy, dus
-- bewerken werd door RLS geweigerd. Schoon Straatje is single-tenant (Chris +
-- Thierry delen één installatie als één team), dus we verruimen:
--   * UPDATE: nieuw, elk goedgekeurd teamlid mag de tekst bijwerken.
--   * DELETE: van auteur-only naar elk goedgekeurd teamlid (spiegelt lead_tags).
-- INSERT blijft auteur = auth.uid() zodat de schrijver vastgelegd blijft.
--
-- Idempotent (DROP IF EXISTS). Hergebruikt is_approved_dashboard_user() uit 024.

-- DELETE verruimen: niet langer alleen de auteur.
DROP POLICY IF EXISTS "approved users kunnen eigen lead_notes verwijderen" ON public.lead_notes;
DROP POLICY IF EXISTS "approved users kunnen lead_notes verwijderen" ON public.lead_notes;
CREATE POLICY "approved users kunnen lead_notes verwijderen"
  ON public.lead_notes FOR DELETE
  USING (is_approved_dashboard_user());

-- UPDATE: nieuw. Elk goedgekeurd teamlid mag een notitie bewerken.
DROP POLICY IF EXISTS "approved users kunnen lead_notes bewerken" ON public.lead_notes;
CREATE POLICY "approved users kunnen lead_notes bewerken"
  ON public.lead_notes FOR UPDATE
  USING (is_approved_dashboard_user())
  WITH CHECK (is_approved_dashboard_user());
