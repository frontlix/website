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
import type { Lead as V2Lead, StatusKind } from "@/components/dashboard/v2/demo-data";
import type {
  DossierData,
  ContactRow,
  ChecklistItem,
  BijzonderTegel,
  DossierOfferte,
  OfferteRegel,
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

/** Stage -> StatusKind voor de kop-pill (zelfde fase-logica als de mobile/leads-mapper). */
const STAGE_KIND: Record<ReturnType<typeof leadStage>, StatusKind> = {
  gesprek: "new",
  review: "hot",
  uit: "sent",
  gepland: "plan",
  klaar: "new",
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

/** Contact-rijen (telefoon / e-mail / adres) uit de losse lead-velden. */
function buildContact(l: DetailLead): ContactRow[] {
  const rows: ContactRow[] = [];
  if (l.telefoon) {
    rows.push({
      kind: "telefoon",
      label: "Telefoon",
      waarde: l.telefoon,
      chip: l.kanaal === "web" ? null : "WhatsApp",
    });
  }
  if (l.email) {
    rows.push({ kind: "email", label: "E-mail", waarde: l.email, chip: null });
  }
  const afstand =
    l.afstand_km != null ? `Adres · ${l.afstand_km} km` : "Adres";
  rows.push({ kind: "adres", label: afstand, waarde: buildAdres(l), chip: null });
  return rows;
}

/** Surface-uitvraag, done-status afgeleid uit lead-velden (mirror mobile). */
function buildChecklist(l: DetailLead, fotoCount: number): ChecklistItem[] {
  return [
    { vraag: "Foto's ontvangen", done: fotoCount > 0 },
    { vraag: "Voegkleur gekozen", done: Boolean(l.zand_kleur || l.voegzand_type) },
    { vraag: "Planten afgestemd", done: !l.planten || Boolean(l.planten_afschermen) },
    { vraag: "Oppervlakte bevestigd", done: l.m2_bevestigd === true },
  ];
}

/** Bijzonderheden uit losse lead-velden (alleen ingevulde tonen). */
function buildBijzonder(l: DetailLead): BijzonderTegel[] {
  const rows: BijzonderTegel[] = [];
  if (l.planten) {
    rows.push({
      label: "Planten langs de rand",
      waarde: l.planten_afschermen ? `${l.planten}, afschermen` : l.planten,
    });
  }
  if (l.groene_aanslag) {
    rows.push({ label: "Groene aanslag", waarde: l.groene_aanslag });
  }
  if (l.korstmos) {
    rows.push({ label: "Korstmos", waarde: l.korstmos });
  }
  if (l.voegzand_type) {
    rows.push({
      label: "Voegzand",
      waarde: [l.voegzand_type, l.zand_kleur].filter(Boolean).join(" · "),
    });
  }
  return rows;
}

/** Werk-chips naast de dienst (sub_diensten). */
function buildSub(l: DetailLead): string[] {
  return (l.sub_diensten ?? []).filter(Boolean);
}

/** Foto-labels voor de placeholder-strip ("Foto N"). */
function buildFotos(detail: LeadDetail): string[] {
  return detail.fotos.map((_, i) => `Foto ${i + 1}`);
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
function buildOffertes(detail: LeadDetail): DossierOfferte[] {
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
    return {
      nr: `Offerte v${o.versie}`,
      label,
      totaal: formatEuro(o.totaal_incl),
      sub: datum ? `Versie ${o.versie} · ${datum}` : `Versie ${o.versie}`,
      concept,
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
  now: number = Date.now(),
): DossierData {
  const l = detail.lead;
  const fotoCount = detail.fotos.length;
  // aggregateActivityTimeline aanroepen houdt de read-pad consistent met de
  // (app)-pagina (en valideert de detail-vorm); de v2-UI toont (nog) geen
  // aparte activity-timeline, dus we gebruiken alleen het transcript hierboven.
  void aggregateActivityTimeline(detail);

  return {
    tel: l.telefoon ?? "Geen nummer",
    afstand: l.afstand_km != null ? `${l.afstand_km} km` : "onbekend",
    binnen: buildBinnen(detail),
    m2: l.m2 ?? 0,
    sub: buildSub(l),
    contact: buildContact(l),
    checklist: buildChecklist(l, fotoCount),
    bijzonder: buildBijzonder(l),
    fotos: buildFotos(detail),
    surface: buildSurface(l),
    offertes: buildOffertes(detail),
    offerteRegels: buildOfferteRegels(detail),
    offerteTotaal: buildOfferteTotaal(detail),
    notities: buildNotities(detail),
    chat: buildChat(detail, now),
  };
}
