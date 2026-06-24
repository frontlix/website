// Mapt een echte LeadDetail (getLeadDetail) naar de vorm die het mobiele
// lead-dossier verwacht (mirror van de DOSS/DOSS_LEAD-mock). Vervangt de mock
// op de lees-kant; write-acties (offerte versturen) blijven via de bestaande UI.

import {
  aggregateActivityTimeline,
  type LeadDetail,
  type ActivityEvent,
} from '@/lib/dashboard/lead-queries'
import { shortTimeAgo } from '@/lib/dashboard/relative-time'
import { leadStage, type MobileLeadStage } from '@/components/dashboard/mobile/leads/lead-mappers'
import type {
  DossierLead,
  DossBijzonder,
  DossVraag,
  DossRegel,
  DossActity,
} from './dossier-mock'
import type { DossNote } from './DossNotities'
// Editor-types hergebruiken (niet dupliceren) zodat de seed-functie van de
// offerte-editor direct op deze velden matcht.
import type { EditorKlant, SeedRegel } from './offerte/offerte-edit-seed'
import { mapLeadToFormData } from '@/lib/dashboard/offerte-form-mapping'
import { buildSentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { buildOpdrachtbonModel, type OpdrachtbonModel } from '@/lib/dashboard/offerte/opdrachtbon-model'

const TONE = {
  blue: '#1A56FF',
  green: '#16A34A',
  amber: '#F59E0B',
  red: '#DC2626',
  wa: '#25D366',
  neutral: '#9CA3AF',
}

const STAGE_LABEL: Record<MobileLeadStage, string> = {
  gesprek: 'In gesprek',
  review: 'Owner-review',
  uit: 'Offerte uit',
  gepland: 'Ingepland',
  klaar: 'Afgerond',
}

/** Eén foto in de foto-tab: echte URL (indien beschikbaar) + label. */
export type DossPhotoItem = { url: string | null; tag: string }

/** De volledige data-blob die MobileLeadDossier aan z'n children doorgeeft. */
export type MobileDossierData = {
  lead: DossierLead
  // lead_id van de echte lead: nodig voor de offerte-editor om edits via
  // saveDraft(leadId, ...) naar de DB te persisteren (mirror van desktop).
  leadId: string
  telefoonRaw: string // ruwe cijfers voor tel:
  waTel: string // 31-prefixed voor wa.me
  contact: { telefoon: string; email: string; adres: string; afstand: number | null; lat: number | null; lng: number | null }
  dienst: { hoofd: string; sub: string[] }
  bijzonderheden: DossBijzonder[]
  vragen: DossVraag[]
  surface: { fase: string; message: string }
  offerte: {
    status: string
    regels: DossRegel[]
    subtotaal: number
    btw: number
    totaal: number
    // ── editor-velden (voeden de mobiele offerte-editor via seedOfferteState) ──
    klant: EditorKlant
    m2: number
    voornaam: string
    korstmos: boolean
    kortingPct: number
    kortingNote: string
    seedRegels: SeedRegel[]
    versies: { versie: number; totaalIncl: number; datum: string; verstuurd: boolean }[]
    // ── extra velden voor de PDF-preview (§4.7 props-contract) ──
    email?: string       // voor klant-blok in PDF
    telefoon?: string    // voor klant-blok in PDF
    dienst: string       // korte dienst-omschrijving (bv. hoofdcategorie)
  }
  fotos: DossPhotoItem[]
  activity: DossActity[]
  /** Team-notities (nieuwste eerst), bewerk/verwijderbaar via de Notities-tab. */
  notes: DossNote[]
  /** Voorgebouwd model voor de printbare opdrachtbon (offerte zonder prijzen). */
  opdrachtbon: OpdrachtbonModel
}

/** Adres uit straat/huisnummer + postcode/plaats (alleen aanwezige delen). */
function buildAdres(l: LeadDetail['lead']): string {
  const line1 = [l.straat, l.huisnummer].filter(Boolean).join(' ')
  const line2 = [l.postcode, l.plaats].filter(Boolean).join(' ')
  return [line1, line2].filter(Boolean).join(', ') || '—'
}

/** Bijzonderheden uit losse lead-velden (alleen ingevulde tonen). */
function buildBijzonderheden(l: LeadDetail['lead']): DossBijzonder[] {
  const rows: DossBijzonder[] = []
  if (l.planten) {
    rows.push({
      l: 'Planten langs de rand',
      v: l.planten_afschermen ? `${l.planten}, afschermen` : l.planten,
      tone: TONE.amber,
    })
  }
  if (l.groene_aanslag) {
    rows.push({ l: 'Groene aanslag', v: l.groene_aanslag, tone: TONE.amber })
  }
  if (l.korstmos) {
    const nee = l.korstmos.trim().toLowerCase().startsWith('nee')
    rows.push({ l: 'Korstmos', v: l.korstmos, tone: nee ? TONE.neutral : TONE.amber })
  }
  if (l.voegzand_type) {
    rows.push({
      l: 'Voegzand',
      v: [l.voegzand_type, l.zand_kleur].filter(Boolean).join(' · '),
      tone: TONE.blue,
    })
  }
  return rows
}

/** Surface-uitvraag, done-status afgeleid uit lead-velden. */
function buildVragen(l: LeadDetail['lead'], fotoCount: number): DossVraag[] {
  return [
    { q: "Foto's ontvangen", done: fotoCount > 0 },
    { q: 'Voegkleur gekozen', done: Boolean(l.zand_kleur || l.voegzand_type) },
    { q: 'Planten afgestemd', done: !l.planten || Boolean(l.planten_afschermen) },
    { q: 'Oppervlakte bevestigd', done: l.m2_bevestigd === true },
  ]
}

/** Korte surface-statusregel op basis van de lead-stand. */
function buildSurfaceMessage(l: LeadDetail['lead']): string {
  if (!l.m2_bevestigd) return 'Vraagt om bevestiging van de m²'
  if (!l.offerte_verstuurd) return 'Offerte wordt voorbereid'
  return 'Offerte verstuurd, wacht op reactie'
}

/** 'HH:MM' (Amsterdam) of 'nu' bij <2 min geleden. */
function activityTime(iso: string, now: number): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return '' // ongeldige timestamp → Intl.format zou gooien
  if (now - ms < 2 * 60_000) return 'nu'
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

const ACT_ICON: Record<ActivityEvent['type'], { icon: DossActity['icon']; tone: string }> = {
  lead_aangemaakt: { icon: 'doc', tone: TONE.neutral },
  bericht_in: { icon: 'wa', tone: TONE.wa },
  bericht_uit: { icon: 'spark', tone: TONE.blue },
  foto_geupload: { icon: 'cam', tone: TONE.wa },
  offerte_verstuurd: { icon: 'doc', tone: TONE.blue },
  akkoord: { icon: 'doc', tone: TONE.green },
  afspraak_geboekt: { icon: 'doc', tone: TONE.blue },
  notitie_toegevoegd: { icon: 'doc', tone: TONE.neutral },
  status_gewijzigd: { icon: 'doc', tone: TONE.neutral },
}

function buildActivity(detail: LeadDetail, now: number): DossActity[] {
  return aggregateActivityTimeline(detail)
    .filter((e) => e.timestamp)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((e) => {
      const m = ACT_ICON[e.type] ?? { icon: 'doc' as const, tone: TONE.neutral }
      // Voor berichten tonen we de tekst zelf; anders het label.
      const isMsg = e.type === 'bericht_in' || e.type === 'bericht_uit'
      return {
        icon: m.icon,
        tone: m.tone,
        t: isMsg && e.details ? e.details : e.label,
        time: activityTime(e.timestamp, now),
      }
    })
}

/**
 * Korte nl-NL datum ('22 mei') voor de versie-historie. Lege/ongeldige
 * timestamps geven '' terug (Intl.format zou anders gooien op Invalid Date).
 */
function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(new Date(ms))
}

/** Offerte-blok: regels uit prijsregels, totalen uit de laatste offerte. */
function buildOfferte(detail: LeadDetail): MobileDossierData['offerte'] {
  const l = detail.lead
  const regels: DossRegel[] = detail.prijsregels.map((r) => ({
    l: r.omschrijving ?? 'Regel',
    detail: [r.aantal != null ? `${r.aantal} ${r.eenheid ?? ''}`.trim() : null, r.stukprijs != null ? `× € ${r.stukprijs.toLocaleString('nl-NL')}` : null]
      .filter(Boolean)
      .join(' '),
    bedrag: r.totaal ?? 0,
  }))

  // Nieuwste ECHTE versie (verstuurd of in review bij de eigenaar), niet het
  // dashboard-draftconcept: dat kan een lege €0-rij zijn die de werkelijke
  // offerte zou maskeren. Lijst is gesorteerd op versie desc.
  const latest = detail.offertes.find((o) => !o.is_concept) ?? detail.offertes[0]
  let totaal: number
  let subtotaal: number
  if (latest && typeof latest.totaal_incl === 'number') {
    totaal = latest.totaal_incl
    subtotaal = totaal / 1.21
  } else {
    subtotaal = regels.reduce((s, r) => s + r.bedrag, 0)
    totaal = subtotaal * 1.21
  }
  const btw = totaal - subtotaal

  let status: string
  if (l.offerte_verstuurd) {
    const op = l.offerte_verstuurd_op
      ? new Date(l.offerte_verstuurd_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
      : null
    status = op ? `Verstuurd op ${op}` : 'Verstuurd'
  } else if (latest?.status === 'wacht_op_goedkeuring') {
    // Bot heeft de offerte klaargezet ter review; de rij is al gearchiveerd
    // (migratie 044) maar de eigenaar moet 'm nog goedkeuren.
    status = 'Wacht op jouw goedkeuring'
  } else if (regels.length > 0) {
    status = 'Concept, nog niet verstuurd'
  } else {
    status = 'Nog geen offerte'
  }

  // ── editor-velden: voorvulling voor de bewerkbare offerte-editor ──

  // Factuuradres uit de losse lead-velden (alleen aanwezige delen samenvoegen).
  const klant: EditorKlant = {
    naam: l.naam ?? '',
    bedrijf: l.bedrijfsnaam ?? '',
    straat: [l.straat, l.huisnummer].filter(Boolean).join(' '),
    pcplaats: [l.postcode, l.plaats].filter(Boolean).join(' '),
  }

  // Voornaam = eerste woord van de naam; valt terug op 'klant'.
  const voornaam = (l.naam || 'klant').trim().split(/\s+/)[0] || 'klant'

  // Bestaande prijsregels als seed voor de editor-regels (ruwe waarden;
  // de seed-functie mapt deze later op de catalogus).
  const seedRegels: SeedRegel[] = detail.prijsregels.map((r) => ({
    omschrijving: r.omschrijving ?? '',
    aantal: r.aantal ?? null,
    eenheid: r.eenheid ?? null,
    stukprijs: r.stukprijs ?? 0,
  }))

  // Versie-historie uit de echte offertes (read-only in de editor).
  // Een bot-pending-rij ('wacht_op_goedkeuring') is geen concept maar ook
  // nog niet verstuurd — markeer 'm niet als verstuurd.
  const versies = detail.offertes.map((o) => ({
    versie: o.versie,
    totaalIncl: o.totaal_incl,
    datum: shortDate(o.aangemaakt_op),
    verstuurd: !o.is_concept && o.status !== 'wacht_op_goedkeuring',
  }))

  return {
    status,
    regels,
    subtotaal,
    btw,
    totaal,
    klant,
    m2: l.m2 ?? 0,
    voornaam,
    // Tolerante match (spiegel van buildBijzonderheden): kolom is string|null
    // met varianten als 'Ja' / 'ja, lichte aanslag' → normaliseer en check 'ja'-prefix.
    korstmos: (l.korstmos ?? '').trim().toLowerCase().startsWith('ja'),
    kortingPct: l.korting_percentage ?? 0,
    kortingNote: l.korting_omschrijving ?? '',
    seedRegels,
    versies,
    // Extra velden voor de PDF-preview (§4.7 props-contract).
    email: l.email ?? undefined,
    telefoon: l.telefoon ?? undefined,
    dienst: l.hoofdcategorie ?? 'Reiniging & onderhoud',
  }
}

export function mapLeadDetailToDossier(detail: LeadDetail, now: number = Date.now()): MobileDossierData {
  const l = detail.lead
  const fotoCount = detail.fotos.length
  const stage = leadStage(l)
  const prijs = l.totaal_prijs ?? (detail.offertes[0]?.totaal_incl ?? null)
  const telefoonRaw = (l.telefoon ?? '').replace(/\D/g, '')

  const lead: DossierLead = {
    id: l.lead_id,
    naam: l.naam ?? 'Onbekend',
    plaats: l.plaats ?? '—',
    m2: l.m2 ?? 0,
    fotos: fotoCount,
    prijs,
    stage: STAGE_LABEL[stage],
    binnen: l.aangemaakt ? shortTimeAgo(l.aangemaakt) : '—',
  }

  // Opdrachtbon-model (gedeeld met desktop): de laatst verstuurde offerte
  // levert de werkzaamheden + het bonnummer, anders vallen we terug op de
  // lead-werkvelden. Spiegelt v2 exact (eerste niet-concept offerte MET een
  // bruikbare snapshot, leadId = l.id) zodat het bonnummer desktop/mobiel
  // identiek is.
  const baseData = mapLeadToFormData(l)
  let sentModel = null
  for (const o of detail.offertes) {
    if (o.is_concept) continue
    const m = buildSentOffertePdfModel({
      offerte: {
        regels_snapshot: o.regels_snapshot,
        totaal_incl: o.totaal_incl,
        korting_pct: o.korting_pct,
        versie: o.versie,
        aangemaakt_op: o.aangemaakt_op,
        offertenummer: (o as { offertenummer?: string | null }).offertenummer ?? null,
      },
      baseData,
      leadId: l.id,
      geldigheidFallback: l.offerte_geldigheid_dagen ?? 14,
    })
    if (m) {
      sentModel = m
      break
    }
  }
  const opdrachtbon = buildOpdrachtbonModel({
    leadId: l.lead_id,
    klantNaam: l.naam,
    bedrijf: l.bedrijfsnaam,
    straat: l.straat,
    huisnummer: l.huisnummer,
    postcode: l.postcode,
    plaats: l.plaats,
    telefoon: l.telefoon,
    afspraakDatum: l.afspraak_datum,
    afspraakStarttijd: l.afspraak_starttijd,
    sentOfferteNummer: sentModel?.offerteNummer ?? null,
    sentRules: sentModel
      ? sentModel.rules.map((r) => ({ desc: r.desc, aantal: r.aantal, eenheid: r.eenheid }))
      : null,
    hoofdcategorie: l.hoofdcategorie,
    subDiensten: l.sub_diensten,
    m2: l.m2,
    voegzandType: l.voegzand_type,
    zandKleur: l.zand_kleur,
    groeneAanslag: l.groene_aanslag,
    // Team-notities van de lead op de bon (nieuwste eerst, zoals desktop).
    notities: detail.notes.map((n) => n.tekst),
  })

  return {
    lead,
    leadId: l.lead_id,
    telefoonRaw,
    waTel: telefoonRaw.startsWith('0') ? `31${telefoonRaw.slice(1)}` : telefoonRaw,
    contact: {
      telefoon: l.telefoon ?? '—',
      email: l.email ?? '—',
      adres: buildAdres(l),
      afstand: l.afstand_km ?? null,
      lat: l.lat ?? null,
      lng: l.lng ?? null,
    },
    dienst: { hoofd: l.hoofdcategorie ?? 'Dienst', sub: l.sub_diensten ?? [] },
    bijzonderheden: buildBijzonderheden(l),
    vragen: buildVragen(l, fotoCount),
    surface: { fase: STAGE_LABEL[stage], message: buildSurfaceMessage(l) },
    offerte: buildOfferte(detail),
    fotos: detail.fotos.map((f, i) => ({ url: f.public_url ?? null, tag: `Foto ${i + 1}` })),
    activity: buildActivity(detail, now),
    // Team-notities (getLeadDetail sorteert al nieuwste-eerst), zelfde vorm als desktop.
    notes: detail.notes.map((n) => ({
      id: n.id,
      wie: n.auteur ? 'Teamlid' : 'Surface',
      tijd: noteRelTime(n.aangemaakt_op),
      tekst: n.tekst,
    })),
    opdrachtbon,
  }
}

/** Relatieve, korte tijd voor notitie-meta ("zojuist" / "12m geleden"). */
function noteRelTime(iso: string | null | undefined): string {
  const s = shortTimeAgo(iso)
  return s === 'nu' ? 'zojuist' : s === '—' ? '' : `${s} geleden`
}
