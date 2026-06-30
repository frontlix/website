-- 078_storage_isolatie_klant_fotos.sql
-- NOG NIET TOEGEPAST op live. Eerst testen op een kopie.
-- Multitenant-fundament (Project 1, fase D).
--
-- De bucket 'klant-fotos' is nu PUBLIEK en paden zijn '${lead_id}/${filename}' zonder tenant-prefix.
-- Tabel-RLS op fotos beschermt de DB-rij, NIET de object-bytes: iedereen met de URL ziet klant-
-- adressen/opritten/gevels = directe AVG-lek. Deze migratie sluit dat:
--   * bucket op PRIVATE;
--   * storage-RLS op storage.objects die per tenant-prefix split_part(name,'/',1) matcht
--     (nieuw pad-schema '${tenant_id}/${lead_id}/${filename}');
--   * superadmin krijgt alleen een LEES-OR (geen write-OR), service-role (bot) omzeilt RLS en stempelt
--     zelf het tenant-prefix.
-- De daadwerkelijke object-MOVE + getPublicUrl->signed URL is geen pure SQL; zie het stappenplan onderaan.
--
-- VOLGORDE-EIS: zet de bucket pas privaat NADAT (of in hetzelfde onderhoudsraam waarin) de app- en
-- bot-code op signed URLs + tenant-prefix-paden draait, anders breken bestaande publieke <img>-links.
--
-- Rollback (alleen zinvol binnen het single-tenant-venster):
--   update storage.buckets set public = true where id = 'klant-fotos';
--   drop policy if exists "klantfotos_tenant_select" on storage.objects;
--   drop policy if exists "klantfotos_tenant_insert" on storage.objects;
--   drop policy if exists "klantfotos_tenant_update" on storage.objects;
--   drop policy if exists "klantfotos_tenant_delete" on storage.objects;

-- ── 1) Bucket privaat ────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'klant-fotos';

-- ── 2) Tenant-prefix storage-policies (authenticated dashboard-client) ────
-- RLS op storage.objects staat in Supabase standaard aan. Vervang onze policies idempotent.
drop policy if exists "klantfotos_tenant_select" on storage.objects;
create policy "klantfotos_tenant_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'klant-fotos'
    and (
      (select public.is_superadmin())
      or split_part(name, '/', 1) = (select public.auth_tenant_id())::text
    )
  );

-- Schrijven: GEEN superadmin-OR (cross-tenant schrijven loopt alleen via de geaudite view-as/service-role-laag).
drop policy if exists "klantfotos_tenant_insert" on storage.objects;
create policy "klantfotos_tenant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'klant-fotos'
    and split_part(name, '/', 1) = (select public.auth_tenant_id())::text
  );

drop policy if exists "klantfotos_tenant_update" on storage.objects;
create policy "klantfotos_tenant_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'klant-fotos'
    and split_part(name, '/', 1) = (select public.auth_tenant_id())::text
  )
  with check (
    bucket_id = 'klant-fotos'
    and split_part(name, '/', 1) = (select public.auth_tenant_id())::text
  );

drop policy if exists "klantfotos_tenant_delete" on storage.objects;
create policy "klantfotos_tenant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'klant-fotos'
    and split_part(name, '/', 1) = (select public.auth_tenant_id())::text
  );

-- ── Stappenplan privaat-zetten + object-move (buiten pure SQL) ──────────
-- Voer dit uit in EEN onderhoudsraam, in deze volgorde, zodat er geen kapotte links ontstaan:
--
--  A. Deploy app + bot die uploaden naar het nieuwe pad '${tenant_id}/${lead_id}/${filename}' en die
--     getPublicUrl vervangen door createSignedUrl (bot src/services/photos.ts:72/163, src/routes/form.ts:113;
--     app foto-weergave). Tot dan blijven nieuwe uploads op het oude pad.
--  B. Draai deze migratie (bucket privaat + policies).
--  C. Move-script (storage-API, service-role) dat elk bestaand object van '${lead_id}/${filename}' naar
--     '${tenant_id}/${lead_id}/${filename}' kopieert (storage.move / copy+remove) met de tenant_id uit de
--     parent-lead, en daarna de DB-verwijzing bijwerkt, bijv.:
--       update public.fotos f
--          set storage_path = l.tenant_id::text || '/' || storage_path
--         from public.leads l
--        where f.lead_id = l.lead_id
--          and split_part(storage_path, '/', 1) <> l.tenant_id::text;
--     (Vervang storage_path door de echte object-pad-kolom in fotos; verifieer de kolomnaam vóór uitvoer.)
--  D. Verifieer dat geen enkel klant-fotos-object meer op een prefix zonder geldige tenant_id staat en dat
--     het dashboard/bot uitsluitend signed URLs serveert.

