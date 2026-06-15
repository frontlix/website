// ─────────────────────────────────────────────────────────────────────
// Inbox (rebrand v2, desktop). Drie kolommen: threads (330px) · gesprek ·
// lead-context (330px).
//
// Pagina-root = server-component. Haalt met v2Session() echte, tenant-
// gescopete data op (RLS) via dezelfde queries als de (app)-inbox en map die
// naar de bestaande v2-component-props. Zonder sessie (dev-preview) valt de
// pagina terug op de demo-tak (InboxDemo). Interactie + knoppen lopen in de
// client-wrapper InboxClient, die de bestaande server-actions / API-routes
// aanroept (markInboxRead, bot-pauzeren, send-message) en realtime mount.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import {
  getActiveConversations,
  getMessagesForLead,
  getInboxLeadContext,
} from "@/lib/dashboard/inbox-queries";
import { getTagsForLead } from "@/lib/dashboard/tag-queries";
import { InboxClient } from "@/components/dashboard/v2/inbox/InboxClient";
import { InboxDemo } from "@/components/dashboard/v2/inbox/InboxDemo";
import {
  toThreads,
  toUnreadById,
  toChatMessages,
  toLeadContextProps,
  tagsToContextTags,
  suggestieVoorContext,
} from "@/components/dashboard/v2/inbox/inbox-mappers";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const s = await v2Session();

  // Dev-preview zonder login: demo-tak (verdwijnt bij definitieve omzet).
  if (!s) {
    return <InboxDemo />;
  }

  const sp = await searchParams;

  // Dezelfde queries/condities als de (app)-inbox; s.supabase is al
  // tenant-gescopet (RLS).
  //
  // Bij een ?lead= (élke thread-klik) staat de gekozen lead al vast, dus de
  // gesprekkenlijst en de detail-queries (berichten/context/tags) hoeven niet
  // op elkaar te wachten. Alles parallel scheelt een volledige DB-round-trip-
  // laag op de kritieke klik-route (de lijst werd anders eerst ge-await voor de
  // detail-queries begonnen).
  const wantedLeadId = sp.lead ?? null;
  const [conversations, wantedMsgs, wantedCtx, wantedTags] = await Promise.all([
    getActiveConversations(50),
    wantedLeadId ? getMessagesForLead(wantedLeadId) : Promise.resolve([]),
    wantedLeadId ? getInboxLeadContext(wantedLeadId) : Promise.resolve(null),
    wantedLeadId ? getTagsForLead(wantedLeadId) : Promise.resolve([]),
  ]);
  const threads = toThreads(conversations);
  const unreadById = toUnreadById(conversations);

  // Geen ?lead= in de URL? Open standaard het eerste (nieuwste) gesprek; pas
  // dan kennen we de lead en halen we zijn detail-data op (dat hing af van de
  // lijst, dus alleen in dit first-load-geval een tweede ronde).
  let selectedLeadId = wantedLeadId;
  let messages = wantedMsgs;
  let leadCtx = wantedCtx;
  let leadTags = wantedTags;
  if (!selectedLeadId) {
    selectedLeadId = conversations[0]?.leadId ?? null;
    if (selectedLeadId) {
      [messages, leadCtx, leadTags] = await Promise.all([
        getMessagesForLead(selectedLeadId),
        getInboxLeadContext(selectedLeadId),
        getTagsForLead(selectedLeadId),
      ]);
    }
  }

  // Actieve gesprek-data, alleen als de lead bestaat (anders lege staat).
  const active =
    selectedLeadId && leadCtx
      ? (() => {
          const ctxProps = toLeadContextProps(
            leadCtx,
            tagsToContextTags(leadTags),
          );
          return {
            leadId: leadCtx.lead_id,
            naam: leadCtx.naam,
            initials: ctxProps.initials,
            sub: ctxProps.sub,
            messages: toChatMessages(messages),
            suggestie: suggestieVoorContext(leadCtx),
            botGepauzeerd: leadCtx.botGepauzeerd,
            context: ctxProps.context,
          };
        })()
      : null;

  return (
    <InboxClient
      threads={threads}
      unreadById={unreadById}
      activeId={active ? active.leadId : null}
      active={active}
    />
  );
}
