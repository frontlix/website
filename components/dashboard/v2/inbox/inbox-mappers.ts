// ─────────────────────────────────────────────────────────────────────
// Inbox v2 mappers: echte Supabase-rijen → bestaande v2-component-props.
//
// De v2-componenten (ThreadList, ChatPane, LeadContext) blijven exact zoals
// ze zijn; deze mappers vertalen de query-uitkomsten uit
// lib/dashboard/inbox-queries.ts naar hun prop-vormen. Hergebruikt de
// bestaande helpers (botStatusForFase) zodat de Surface-zin identiek is aan
// de (app)-inbox.
// ─────────────────────────────────────────────────────────────────────

import type {
  ConversationPreview,
  InboxLeadContext,
} from "@/lib/dashboard/inbox-queries";
import type {
  Bericht,
  DashboardStatus,
  GesprekFase,
  Tag,
} from "@/lib/dashboard/database.types";
import { botStatusForFase } from "@/lib/dashboard/fase-labels";
import { formatEuro, gesprekFaseLabel } from "@/lib/dashboard/format";
import { isHandover } from "@/lib/dashboard/lead-status-meta";
import type { Thread, ChatMessage, StatusKind } from "../demo-data";
import type { InboxConversation, LeadContextTag } from "./inbox-data";

/** Initialen uit een naam ("Familie Bakker" → "FB", "Anna" → "AN"). */
export function initialsFromNaam(naam: string | null | undefined): string {
  const clean = (naam ?? "").trim();
  if (!clean) return "?";
  const woorden = clean.split(/\s+/).filter(Boolean);
  if (woorden.length === 1) {
    return woorden[0].slice(0, 2).toUpperCase();
  }
  return (woorden[0][0] + woorden[woorden.length - 1][0]).toUpperCase();
}

/** Korte tijd-weergave ("08:21", of "gist." voor eerder dan vandaag). */
export function shortTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const zelfdeDag =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (zelfdeDag) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const gisteren = new Date(now);
  gisteren.setDate(now.getDate() - 1);
  const isGisteren =
    d.getFullYear() === gisteren.getFullYear() &&
    d.getMonth() === gisteren.getMonth() &&
    d.getDate() === gisteren.getDate();
  if (isGisteren) return "gist.";
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mo}`;
}

/** Tijd alleen als HH:MM (voor bubbels in de chat). */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Preview-tekst voor de threadlijst; toont type-label bij media. */
function previewVoor(laatste: ConversationPreview["laatsteBericht"]): string {
  switch (laatste.type) {
    case "foto":
      return "Foto";
    case "audio":
      return "Spraakbericht";
    case "document":
      return "Document";
    default:
      return laatste.tekst ?? "";
  }
}

/**
 * Is dit gesprek ongelezen voor de owner? Zelfde heuristiek als de
 * (app)-inbox "Ongelezen"-filter: laatste bericht is inkomend EN nooit
 * geopend OF binnengekomen na de laatste opening (ISO lex == chrono).
 */
export function isOngelezen(c: ConversationPreview): boolean {
  if (c.laatsteBericht.richting !== "inkomend") return false;
  if (c.inboxGelezenOp === null) return true;
  return c.laatsteBericht.timestamp > c.inboxGelezenOp;
}

/** ConversationPreview[] → v2 Thread[] (threadlijst-rijen). */
export function toThreads(conversations: ConversationPreview[]): Thread[] {
  return conversations.map((c) => ({
    id: c.leadId,
    naam: c.naam,
    preview: previewVoor(c.laatsteBericht),
    tijd: shortTime(c.laatsteBericht.timestamp),
    unread: isOngelezen(c) ? 1 : 0,
    kanaal: c.laatsteBericht.type === "tekst" ? "WhatsApp" : "WhatsApp",
    initials: initialsFromNaam(c.naam),
    handover: isHandover({
      eigenaar_overgenomen: c.eigenaarOvergenomen,
      status: c.status,
    }),
  }));
}

/**
 * unreadById-record: per thread 1 (ongelezen) of 0 (gelezen). De v2
 * ThreadList telt deze waarden op voor de "X nieuw"-badge.
 */
export function toUnreadById(
  conversations: ConversationPreview[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of conversations) map[c.leadId] = isOngelezen(c) ? 1 : 0;
  return map;
}

/** Bericht[] (DB, ASC) → v2 ChatMessage[] (chat-bubbels). */
export function toChatMessages(berichten: Bericht[]): ChatMessage[] {
  return berichten.map((b) => {
    const mine = b.richting === "uitgaand";
    let text = b.bericht ?? "";
    if (!text) {
      if (b.type === "foto") text = "Foto";
      else if (b.type === "audio") text = "Spraakbericht";
      else if (b.type === "document") text = "Document";
    }
    return {
      from: mine ? "mij" : "klant",
      text,
      tijd: clockTime(b.timestamp),
    };
  });
}

/** Euro-weergave voor de lead-context-tegel ("€736" of "nieuw"). */
function waardeLabel(totaal: number | null | undefined): string {
  if (totaal === null || totaal === undefined) return "nieuw";
  return `€${Math.round(totaal)}`;
}

/** Diensten-zin uit hoofdcategorie + sub_diensten. */
function dienstLabel(ctx: InboxLeadContext): string {
  const subs = Array.isArray(ctx.sub_diensten)
    ? (ctx.sub_diensten as string[]).filter(Boolean)
    : [];
  if (subs.length > 0) return subs.join(" + ");
  return ctx.hoofdcategorie ?? "Onbekend";
}

/**
 * Status-label voor het lead-dossier. Zelfde afleiding als de (app)-inbox:
 * een eindstatus uit dashboard_status, of een menselijker label op basis van
 * de fase wanneer het gesprek nog "open" is. Hand-over heeft voorrang.
 */
function statusLabelVoor(
  status: DashboardStatus | null,
  fase: GesprekFase | null,
  handover: boolean,
): string {
  if (handover) return "Zelf overnemen";
  if (status === "afgehandeld") return "Afgerond";
  if (status === "geen_interesse") return "Afgewezen";
  if (status === "no_show") return "No-show";
  if (status === "archief") return "Gearchiveerd";
  if (status === "opgevolgd") return "Opgevolgd";
  if (fase === "afspraak_bevestigd") return "Goedgekeurd";
  if (fase === "onderhandelen") return "In review";
  if (fase === "offerte_besproken") return "Offerte verstuurd";
  return "In gesprek";
}

/**
 * Kleur-kind voor de status-pill (mapt op de rijke v2 StatusKind-tinten,
 * gelijk aan de status-labels uit statusLabelVoor):
 *   handover → hot (rood), afgerond → won, afgewezen → lost, no-show → lost,
 *   archief → sent, opgevolgd → talking, bezoek bevestigd → plan,
 *   onderhandelen → review, offerte verstuurd → sent, anders → talking.
 */
function statusKindVoor(
  status: DashboardStatus | null,
  fase: GesprekFase | null,
  handover: boolean,
): StatusKind {
  if (handover) return "hot";
  if (status === "afgehandeld") return "won";
  if (status === "geen_interesse") return "lost";
  if (status === "no_show") return "lost";
  if (status === "archief") return "sent";
  if (status === "opgevolgd") return "talking";
  if (fase === "afspraak_bevestigd") return "plan";
  if (fase === "onderhandelen") return "review";
  if (fase === "offerte_besproken") return "sent";
  return "talking";
}

/** Samengesteld adres uit straat/huisnummer/postcode/plaats, of null. */
function adresVoor(ctx: InboxLeadContext): string | null {
  const straatRegel = ctx.straat
    ? `${ctx.straat} ${ctx.huisnummer ?? ""}`.trim()
    : null;
  const plaatsRegel = `${ctx.postcode ?? ""} ${ctx.plaats ?? ""}`.trim();
  const samengesteld = [straatRegel, plaatsRegel || null]
    .filter(Boolean)
    .join(", ");
  return samengesteld || null;
}

/** Tag-rijen (uit getTagsForLead) → tag-chips voor het lead-dossier. */
export function tagsToContextTags(tags: Tag[]): LeadContextTag[] {
  return tags.map((t) => ({ id: t.id, naam: t.naam, kleur: t.kleur }));
}

/**
 * InboxLeadContext → de v2 LeadContext-prop "context" + de ChatPane-sub.
 * Tags worden apart aangeleverd (zie page, getTagsForLead).
 */
export function toLeadContextProps(
  ctx: InboxLeadContext,
  tags: LeadContextTag[] = [],
): {
  initials: string;
  sub: string;
  context: InboxConversation["context"];
} {
  const dienst = dienstLabel(ctx);
  const waarde = waardeLabel(ctx.totaal_prijs);
  const plaats = ctx.plaats ?? "Onbekend";
  const bedrag =
    ctx.totaal_prijs != null && ctx.totaal_prijs > 0
      ? formatEuro(ctx.totaal_prijs)
      : null;
  const handover = isHandover({
    eigenaar_overgenomen: ctx.eigenaar_overgenomen,
    status: ctx.status,
  });
  return {
    initials: initialsFromNaam(ctx.naam),
    sub: `WhatsApp · ${dienst} · ${waarde}`,
    context: {
      plaats,
      kanaal: "WhatsApp",
      dienst,
      waarde,
      statusLabel: statusLabelVoor(ctx.dashboard_status, ctx.gesprek_fase, handover),
      statusKind: statusKindVoor(ctx.dashboard_status, ctx.gesprek_fase, handover),
      faseLabel: ctx.gesprek_fase ? gesprekFaseLabel(ctx.gesprek_fase) : null,
      adres: adresVoor(ctx),
      m2: ctx.m2 ?? null,
      bedrag,
      tags,
    },
  };
}

/**
 * Surface-suggestie voor de ChatPane. Er is (nog) geen los suggestie-veld in
 * de DB; we tonen, net als de (app)-inbox, de fase-gebaseerde Surface-zin
 * als richting voor de owner. Null wanneer de bot gepauzeerd is (dan typt de
 * owner zelf, zonder suggestie-strip).
 */
export function suggestieVoorContext(ctx: InboxLeadContext): string | null {
  if (ctx.botGepauzeerd) return null;
  return botStatusForFase(ctx.gesprek_fase);
}
