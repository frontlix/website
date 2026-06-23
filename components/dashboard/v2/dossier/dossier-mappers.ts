// ─────────────────────────────────────────────────────────────────────
// Lead-dossier (v2) — mappers van echte Supabase-data naar de bestaande
// v2-component-props. DB-rij (LeadDetail uit getLeadDetail) -> de DossierData-
// vorm die de v2-dossier-componenten al verwachten + de v2 Lead-vorm voor de
// kop-pill. We hergebruiken de query/aggregatie uit lib/dashboard en spiegelen
// de afleidingen van de mobiele dossier-mapper (dezelfde velden, dezelfde
// regels), zonder nieuwe DB-logica.
//
// Streep-vrij conform huisstijl (komma i.p.v. liggend streepje; geen
// klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

import type { LeadDetail } from "@/lib/dashboard/lead-queries";
import { aggregateActivityTimeline } from "@/lib/dashboard/lead-queries";
import { shortTimeAgo } from "@/lib/dashboard/relative-time";
import { leadStage } from "@/components/dashboard/mobile/leads/lead-mappers";
import { formatEuro } from "@/lib/dashboard/format";
import {
  DIENST_LABELS,
  type SubDienst,
  type ManualOfferteData,
} from "@/lib/dashboard/manual-offerte-types";
import { mapLeadToFormData } from "@/lib/dashboard/offerte-form-mapping";
import { FALLBACK_PRICING, type ManualOffertePricing } from "@/lib/dashboard/pricing-types";
import { resolveSeedPricing } from "@/lib/dashboard/offerte-snapshot";
import { buildSentOffertePdfModel } from "@/lib/dashboard/offerte/sent-offerte-pdf-model";
import type { Lead as V2Lead, StatusKind } from "@/components/dashboard/v2/demo-data";
import type {
  DossierData,
  InfoRow,
  DossierFoto,
  DossierOfferte,
  OfferteRegel,
  OfferteFormData,
  DossierNotitie,
  DossierBericht,
} from "./dossier-data";

type DetailLead = LeadDetail["lead"];

/** Initialen uit de naam: eerste letter per woord, max 2, uppercase. */
function initialsFromNaam(naam: string | null | undefined): string {
  const parts = (naam ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Adres uit straat/huisnummer + postcode/plaats (alleen aanwezige delen). */
function buildAdres(l: DetailLead): string {
  const line1 = [l.straat, l.huisnummer].filter(Boolean).join(" ");
  const line2 = [l.postcode, l.plaats].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ") || "Geen adres bekend";
}

/** Stage -> StatusKind voor de kop-pill. Gebruikt de rijke, betekenisvolle
 *  kinds: in gesprek = blauw (talking), wacht op jou = koraal (hot), offerte
 *  uit = grijs (sent), bezoek gepland = cyaan-teal (plan), afgerond = vol
 *  groen (won). Spiegelt de fase-logica van de mobile/leads-mapper. */
const STAGE_KIND: Record<ReturnType<typeof leadStage>, StatusKind> = {
  gesprek: "talking",
  review: "hot",
  uit: "sent",
  gepland: "plan",
  klaar: "won",
};

const STAGE_LABEL: Record<ReturnType<typeof leadStage>, string> = {
  gesprek: "In gesprek",
  review: "Wacht op jou",
  uit: "Offerte uit",
  gepland: "Bezoek gepland",
  klaar: "Afgerond",
};

/** v2 Lead-vorm voor de kop (naam, plaats, dienst, status-pill, initialen). */
export function mapLeadDetailToV2Lead(detail: LeadDetail): V2Lead {
  const l = detail.lead;
  const stage = leadStage(l);
  const prijs = l.totaal_prijs ?? detail.offertes[0]?.totaal_incl ?? null;
  return {
    id: l.lead_id,
    naam: l.naam ?? "Onbekend",
    plaats: l.plaats ?? "Onbekend",
    dienst: l.hoofdcategorie ?? "Dienst",
    waarde: prijs != null ? formatEuro(prijs) : "Geen bedrag",
    bron: l.bron ?? l.kanaal ?? "onbekend",
    status: STAGE_LABEL[stage],
    statusKind: STAGE_KIND[stage],
    tijd: l.aangemaakt ? shortTimeAgo(l.aangemaakt) : "Onbekend",
    initials: initialsFromNaam(l.naam),
  };
}

/** "voegzand_type" -> "Voegzand Type", lege/null -> "". Mirror van de oude
 *  dashboard-humanize (underscores weg, elk woord een hoofdletter). */
function humanize(key: string | null | undefined): string {
  if (!key) return "";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Hoofdcategorie -> leesbaar label (humanized; geen liggende streepjes). */
function humanizeHoofd(key: string | null | undefined): string {
  if (!key) return "";
  return humanize(key).replace(/\//g, " / ");
}

/** Bron -> nette nl-NL-tekst (mirror van de oude LeadInfoTab.humanizeBron). */
function humanizeBron(bron: string | null | undefined): string {
  if (!bron) return "Onbekend";
  const map: Record<string, string> = {
    website: "Website-formulier",
    whatsapp: "WhatsApp",
    handmatig: "Handmatig",
    dashboard_handmatig: "Handmatig",
  };
  return map[bron] ?? humanize(bron);
}

/** Sub-dienst-key -> leesbaar label (hergebruik DIENST_LABELS, fallback humanize). */
function dienstLabel(key: string): string {
  return DIENST_LABELS[key as SubDienst] ?? humanize(key);
}

/** Linker Info-kolom "Klant": naam, bedrijf, telefoon, e-mail, adres, bron.
 *  Alleen ingevulde velden, in de stijl van het oude dashboard. */
function buildKlant(l: DetailLead): InfoRow[] {
  const rows: InfoRow[] = [];
  rows.push({ label: "Naam", waarde: l.naam || "Onbekend" });
  if (l.bedrijfsnaam) {
    rows.push({ label: "Bedrijf", waarde: l.bedrijfsnaam });
  }
  if (l.telefoon) {
    rows.push({
      label: "Telefoon",
      waarde: l.telefoon,
      chip: l.kanaal === "web" ? null : "WhatsApp",
    });
  }
  if (l.email) {
    rows.push({ label: "E-mail", waarde: l.email });
  }
  const adres = buildAdres(l);
  const adresWaarde =
    l.afstand_km != null ? `${adres} · ${l.afstand_km} km` : adres;
  rows.push({
    label: "Adres",
    waarde: adresWaarde,
    sub: l.afstand_km != null && l.afstand_km <= 25 ? "Binnen gratis radius" : null,
  });
  rows.push({ label: "Bron", waarde: humanizeBron(l.bron) });
  return rows;
}

/** Rechter Info-kolom "Werk": hoofddienst, diensten, oppervlakte, voegzand,
 *  groene aanslag, korstmos, planten. Alleen ingevulde velden (geen lege rijen). */
function buildWerk(l: DetailLead): InfoRow[] {
  const rows: InfoRow[] = [];
  if (l.hoofdcategorie) {
    rows.push({ label: "Hoofddienst", waarde: humanizeHoofd(l.hoofdcategorie) });
  }
  const sub = (l.sub_diensten ?? []).filter(Boolean);
  if (sub.length > 0) {
    rows.push({ label: "Diensten", waarde: sub.map(dienstLabel).join(" + ") });
  }
  if (l.m2 != null) {
    rows.push({ label: "Oppervlakte", waarde: `${l.m2} m²` });
  }
  if (l.voegzand_type || l.zand_kleur) {
    rows.push({
      label: "Voegzand",
      waarde: [humanize(l.voegzand_type), humanize(l.zand_kleur)]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (l.groene_aanslag) {
    rows.push({ label: "Groene aanslag", waarde: humanize(l.groene_aanslag) });
  }
  if (l.korstmos) {
    rows.push({ label: "Korstmos", waarde: humanize(l.korstmos) });
  }
  if (l.planten) {
    rows.push({
      label: "Planten",
      waarde: l.planten_afschermen ? `${humanize(l.planten)}, afschermen` : humanize(l.planten),
    });
  }
  return rows;
}

/** Foto's voor de dossier-strip: echte Supabase public_url + mono-tag.
 *  Ontbreekt een URL, dan rendert de strip de gestreepte placeholder. */
function buildFotos(detail: LeadDetail): DossierFoto[] {
  return detail.fotos.map((f, i) => ({ url: f.public_url ?? null, tag: `Foto ${i + 1}` }));
}

/** Korte surface-statusregel + fase op basis van de lead-stand. */
function buildSurface(l: DetailLead): { fase: string; actie: string } {
  const stage = leadStage(l);
  let actie: string;
  if (!l.m2_bevestigd) {
    actie = "Vraagt om bevestiging van de m², offerte staat daarna klaar";
  } else if (!l.offerte_verstuurd) {
    actie = "Offerte wordt voorbereid";
  } else {
    actie = "Offerte verstuurd, wacht op reactie";
  }
  return { fase: STAGE_LABEL[stage], actie };
}

/** Korte nl-NL datum ('22 mei') voor de offerte-sublabels. */
function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(
    new Date(ms),
  );
}

/** Offertes-lijst voor de Offertes-tab (concept = blauwe rand + Open-knop). */
function buildOffertes(detail: LeadDetail, baseData: ManualOfferteData): DossierOfferte[] {
  const l = detail.lead;
  return detail.offertes.map((o) => {
    const concept = o.is_concept === true;
    let label: string;
    if (concept) {
      label = "Concept, nog niet verstuurd";
    } else if (o.status === "wacht_op_goedkeuring") {
      label = "Wacht op jouw goedkeuring";
    } else if (l.offerte_verstuurd) {
      label = "Verstuurd";
    } else {
      label = "Afgerond";
    }
    const datum = shortDate(o.aangemaakt_op);
    // Tag-kleur: concept = blauw, een afgesloten/oude offerte = grijs (archief),
    // een lopende verstuurde offerte = groen.
    const tone: "concept" | "verstuurd" | "archief" = concept
      ? "concept"
      : o.status === "geweigerd" || o.status === "verlopen"
        ? "archief"
        : "verstuurd";
    // Per verstuurde versie een PDF-model bouwen (inzien + download). Concepten
    // worden niet ingezien, die bewerk je in de editor. Een verstuurde offerte
    // zonder bruikbare snapshot levert null op en toont geen knoppen.
    const pdfModel = concept
      ? null
      : buildSentOffertePdfModel({
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
          geldigheidFallback: detail.lead.offerte_geldigheid_dagen ?? 14,
        });
    return {
      nr: `Offerte v${o.versie}`,
      label,
      totaal: formatEuro(o.totaal_incl),
      sub: datum ? `Versie ${o.versie} · ${datum}` : `Versie ${o.versie}`,
      concept,
      tone,
      pdfModel,
    };
  });
}

/** Concept-regels voor de regels-preview (uit prijsregels, volgorde asc). */
function buildOfferteRegels(detail: LeadDetail): OfferteRegel[] {
  return detail.prijsregels.map((r) => {
    const calcParts = [
      r.aantal != null ? `${r.aantal} ${r.eenheid ?? ""}`.trim() : null,
      r.stukprijs != null ? `× ${formatEuro(r.stukprijs)}` : null,
    ].filter(Boolean);
    return {
      naam: r.omschrijving ?? "Regel",
      calc: calcParts.join(" "),
      bedrag: formatEuro(r.totaal ?? 0),
    };
  });
}

/** Totaal incl. BTW van de relevante offerte (mirror buildOfferte van mobile). */
function buildOfferteTotaal(detail: LeadDetail): string {
  const latest = detail.offertes.find((o) => !o.is_concept) ?? detail.offertes[0];
  if (latest && typeof latest.totaal_incl === "number") {
    return formatEuro(latest.totaal_incl);
  }
  const subtotaal = detail.prijsregels.reduce((s, r) => s + (r.totaal ?? 0), 0);
  return formatEuro(subtotaal * 1.21);
}

/** Bewerkbaar concept voor de inline OfferteEditor: het echte form-model uit
 *  de lead (zelfde mapLeadToFormData als het oude dashboard) + de prijslijst,
 *  zodat de editor exact via saveOfferteForm opslaat. */
function buildOfferteForm(
  detail: LeadDetail,
  pricing: ManualOffertePricing,
): OfferteFormData {
  return {
    data: mapLeadToFormData(detail.lead),
    // Seed met de bevroren prijslijst van de laatste verstuurde offerte (uit
    // de regels_snapshot), anders de live prijslijst. Zo toont een ongewijzigd
    // concept exact de verzonden prijzen i.p.v. live te herberekenen.
    pricing: resolveSeedPricing(detail.offertes, pricing),
    geldigheidDagen: detail.lead.offerte_geldigheid_dagen ?? 14,
  };
}

/** Notities (nieuwste eerst, zoals getLeadDetail ze al sorteert). */
function buildNotities(detail: LeadDetail): DossierNotitie[] {
  return detail.notes.map((n) => ({
    wie: n.auteur ? "Teamlid" : "Surface",
    tijd: relTime(n.aangemaakt_op),
    tekst: n.tekst,
  }));
}

/** 'HH:MM' (Amsterdam) of 'nu' bij <2 min geleden, voor de chatregel-tijd. */
function chatTime(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  if (now - ms < 2 * 60_000) return "nu";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/** Relatieve, korte tijd voor notitie-meta ("zojuist" / "12m" / "3u" / "2d"). */
function relTime(iso: string | null | undefined): string {
  const s = shortTimeAgo(iso);
  return s === "nu" ? "zojuist" : s === "—" ? "" : `${s} geleden`;
}

/** WhatsApp-transcript: inkomend = klant (wit links), uitgaand = Surface
 *  (groen rechts). Berichten zijn al op timestamp asc gesorteerd door
 *  getLeadDetail. */
function buildChat(detail: LeadDetail, now: number): DossierBericht[] {
  return detail.berichten.map((b) => ({
    van: b.richting === "inkomend" ? "klant" : "bot",
    tekst: b.bericht ?? (b.type && b.type !== "tekst" ? `[${b.type}]` : ""),
    tijd: chatTime(b.timestamp, now),
  }));
}

/** Laatste-bericht-indicator voor de metaregel ("8 min geleden"). */
function buildBinnen(detail: LeadDetail): string {
  const last = detail.berichten[detail.berichten.length - 1];
  const iso = last?.timestamp ?? detail.lead.aangemaakt;
  return relTime(iso) || "onbekend";
}

/**
 * Volledige DossierData-vorm uit de echte LeadDetail. Spiegelt de mobiele
 * dossier-mapper (dezelfde queries/aggregatie, dezelfde afleidingen) maar
 * levert exact de v2-dossier-vorm op zodat de bestaande v2-componenten
 * ongewijzigd blijven.
 */
export function mapLeadDetailToDossierData(
  detail: LeadDetail,
  pricing: ManualOffertePricing = FALLBACK_PRICING,
  now: number = Date.now(),
): DossierData {
  const l = detail.lead;
  // aggregateActivityTimeline aanroepen houdt de read-pad consistent met de
  // (app)-pagina (en valideert de detail-vorm); de v2-UI toont (nog) geen
  // aparte activity-timeline, dus we gebruiken alleen het transcript hierboven.
  void aggregateActivityTimeline(detail);

  // Basis-form-model uit de lead, eenmalig: dient zowel als bron voor de PDF-
  // modellen per verstuurde offerte als voor de inline editor (via buildOfferteForm).
  const baseData = mapLeadToFormData(detail.lead);

  return {
    tel: l.telefoon ?? "Geen nummer",
    afstand: l.afstand_km != null ? `${l.afstand_km} km` : "onbekend",
    binnen: buildBinnen(detail),
    klant: buildKlant(l),
    werk: buildWerk(l),
    fotos: buildFotos(detail),
    surface: buildSurface(l),
    offertes: buildOffertes(detail, baseData),
    offerteRegels: buildOfferteRegels(detail),
    offerteTotaal: buildOfferteTotaal(detail),
    offerteForm: buildOfferteForm(detail, pricing),
    notities: buildNotities(detail),
    chat: buildChat(detail, now),
  };
}
