'use server'

// Server-action die de ECHTE offerte-PDF (Puppeteer, identiek aan de mail-PDF,
// inclusief alle keurmerken) rendert voor een bestaande VERSTUURDE offerte.
// Zo loopt inzien/download in het dashboard niet meer achter op de echte
// offerte-opmaak (de oude client-side @react-pdf-kopie miste keurmerken).
//
// Tenant-gescoped + geauthenticeerd via getLeadDetail (sessie-client + RLS) en
// requireApprovedUser. Bedrag/regels komen uit dezelfde vertaler als de
// inzien-knop (buildSentOffertePdfModel): bevroren snapshot, of heropgemaakt
// uit de huidige leadgegevens + prijslijst bij een oude offerte.

import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { getManualOffertePricing } from '@/lib/dashboard/pricing-queries'
import { mapLeadToFormData } from '@/lib/dashboard/offerte-form-mapping'
import { buildSentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { buildOffertePDFData, type TenantBedrijf } from '@/lib/dashboard/offerte/pdf-template'
import {
  renderOffertePDFBuffer,
  loadLogoBase64,
  loadBadgeBase64,
  loadKeurmerkBase64,
  loadBesteVakmanBase64,
} from '@/lib/dashboard/offerte/pdf-renderer'

export type SentOffertePdfResult = { base64: string } | { error: string }

export async function renderSentOffertePdf(
  leadId: string,
  versie: number,
): Promise<SentOffertePdfResult> {
  await requireApprovedUser()

  const detail = await getLeadDetail(leadId)
  if (!detail) return { error: 'Lead niet gevonden.' }

  const offerte = detail.offertes.find((o) => o.versie === versie && !o.is_concept)
  if (!offerte) return { error: 'Verstuurde offerte niet gevonden.' }

  const pricing = await getManualOffertePricing()
  const baseData = mapLeadToFormData(detail.lead)

  // Tenant-instellingen (zelfde bron als de verzendflow) voor branding + btw + betaaltermijn.
  const admin = getDashboardAdmin()
  const { data: tenantRows } = await admin
    .from('tenant_settings')
    .select(
      'bedrijfsnaam, adres, postcode, plaats, offerte_geldigheid_dagen, offerte_btw_tarief, offerte_betaaltermijn_dagen',
    )
    .limit(1)
    .maybeSingle()

  const btwTarief = Number(tenantRows?.offerte_btw_tarief) || 21

  const model = buildSentOffertePdfModel({
    offerte: {
      regels_snapshot: offerte.regels_snapshot,
      totaal_incl: offerte.totaal_incl,
      korting_pct: offerte.korting_pct,
      versie: offerte.versie,
      aangemaakt_op: offerte.aangemaakt_op,
      offertenummer: (offerte as { offertenummer?: string | null }).offertenummer ?? null,
    },
    baseData,
    leadId,
    pricing,
    btwTarief,
    geldigheidFallback: detail.lead.offerte_geldigheid_dagen ?? 14,
  })
  if (!model) return { error: 'Geen offerte-inhoud beschikbaar voor deze versie.' }

  const bedrijf: TenantBedrijf = {
    bedrijfsnaam: tenantRows?.bedrijfsnaam ?? 'Schoon Straatje',
    adres: tenantRows?.adres ?? null,
    postcode: tenantRows?.postcode ?? null,
    plaats: tenantRows?.plaats ?? null,
    offerte_geldigheid_dagen: model.geldigheidDagen,
    offerte_btw_tarief: btwTarief,
    offerte_betaaltermijn_dagen: Number(tenantRows?.offerte_betaaltermijn_dagen) || 14,
  }

  const pdfData = buildOffertePDFData({
    data: model.data,
    rules: model.rules,
    totals: model.totals,
    offertenummer: model.offerteNummer,
    bedrijf,
    logoBase64: loadLogoBase64(),
    badgeBase64: loadBadgeBase64(),
    keurmerkBase64: loadKeurmerkBase64(),
    besteVakmanBase64: loadBesteVakmanBase64(),
  })

  const buffer = await renderOffertePDFBuffer(pdfData)
  return { base64: buffer.toString('base64') }
}
