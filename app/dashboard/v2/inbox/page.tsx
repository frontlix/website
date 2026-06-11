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
import { InboxClient } from "@/components/dashboard/v2/inbox/InboxClient";
import { InboxDemo } from "@/components/dashboard/v2/inbox/InboxDemo";
import {
  toThreads,
  toUnreadById,
  toChatMessages,
  toLeadContextProps,
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
  // tenant-gescopet (RLS). Eerst de gesprekken (nieuwste eerst) zodat we
  // kunnen defaulten naar het eerste gesprek.
  const conversations = await getActiveConversations(50);
  const threads = toThreads(conversations);
  const unreadById = toUnreadById(conversations);

  // Geen ?lead= in de URL? Open standaard het eerste (nieuwste) gesprek,
  // zodat de inbox niet leeg start.
  const selectedLeadId = sp.lead ?? conversations[0]?.leadId ?? null;

  const [messages, leadCtx] = await Promise.all([
    selectedLeadId ? getMessagesForLead(selectedLeadId) : Promise.resolve([]),
    selectedLeadId
      ? getInboxLeadContext(selectedLeadId)
      : Promise.resolve(null),
  ]);

  // Actieve gesprek-data, alleen als de lead bestaat (anders lege staat).
  const active =
    selectedLeadId && leadCtx
      ? (() => {
          const ctxProps = toLeadContextProps(leadCtx);
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
