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
import type { Bericht } from "@/lib/dashboard/database.types";
import { botStatusForFase } from "@/lib/dashboard/fase-labels";
import type { Thread, ChatMessage } from "../demo-data";
import type { InboxConversation } from "./inbox-data";

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
 * InboxLeadContext → de v2 LeadContext-prop "context" + de ChatPane-sub.
 * Houdt exact dezelfde velden aan die de v2-componenten al verwachten.
 */
export function toLeadContextProps(ctx: InboxLeadContext): {
  initials: string;
  sub: string;
  context: InboxConversation["context"];
} {
  const dienst = dienstLabel(ctx);
  const waarde = waardeLabel(ctx.totaal_prijs);
  const plaats = ctx.plaats ?? "Onbekend";
  return {
    initials: initialsFromNaam(ctx.naam),
    sub: `WhatsApp · ${dienst} · ${waarde}`,
    context: {
      plaats,
      kanaal: "WhatsApp",
      dienst,
      waarde,
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
