"use client";

// ─────────────────────────────────────────────────────────────────────
// Inbox v2, client-wrapper voor de ECHTE-data-tak.
//
// De pagina-root (server-component) haalt tenant-gescopete data op en geeft
// die als props mee. Dit component houdt alleen de interactieve client-state
// (concept-tekst, versturen, Surface-toggle) en wired die aan de BESTAANDE
// server-actions / API-routes. Visueel identiek aan de demo-tak: dezelfde
// ThreadList · ChatPane · LeadContext in dezelfde grid.
//
// Thread-selectie loopt via de URL (?lead=...) zodat de server-component de
// berichten + lead-context voor het actieve gesprek kan renderen, net als de
// (app)-inbox. Versturen en Surface aan/uit roepen dezelfde routes aan als
// WhatsAppComposer / InboxBotToggle.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThreadList } from "./ThreadList";
import { ChatPane } from "./ChatPane";
import { LeadContext } from "./LeadContext";
import { useBotAction } from "@/components/dashboard/bot-actions/use-bot-action";
import { InboxRealtime } from "@/components/dashboard/inbox/InboxRealtime";
import { InboxMarkRead } from "@/components/dashboard/inbox/InboxMarkRead";
import { LeadDetailRealtime } from "@/components/dashboard/leads/LeadDetailRealtime";
import type { Thread, ChatMessage } from "../demo-data";
import type { InboxConversation } from "./inbox-data";
import styles from "../../../../app/dashboard/v2/inbox/page.module.css";

interface ActiveData {
  leadId: string;
  naam: string;
  initials: string;
  sub: string;
  messages: ChatMessage[];
  suggestie: string | null;
  /** Bot gepauzeerd? Surface "aan" = inverse hiervan. */
  botGepauzeerd: boolean;
  context: InboxConversation["context"];
}

interface InboxClientProps {
  threads: Thread[];
  unreadById: Record<string, number>;
  activeId: string | null;
  /** Gegevens van het geselecteerde gesprek, of null als er niets gekozen is. */
  active: ActiveData | null;
}

// Schoon app-host-pad; de middleware rewrit /inbox intern naar de v2-route.
const V2_INBOX_PATH = "/inbox";

export function InboxClient({
  threads,
  unreadById,
  activeId,
  active,
}: InboxClientProps) {
  const router = useRouter();
  const [navPending, startNav] = useTransition();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  // Optimistische selectie: de aangeklikte thread direct highlighten, zonder te
  // wachten op de server-round-trip. Wordt losgelaten zodra de echte data
  // binnen is (activeId verspringt naar het nieuwe gesprek).
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    setPendingId(null);
  }, [activeId]);
  const highlightId = pendingId ?? activeId;

  // Surface aan/uit hergebruikt exact de bot-pauzeren proxy-route.
  const { run: runBot, pending: botPending } = useBotAction(
    activeId ? `/api/dashboard/lead/${activeId}/bot-pauzeren` : "",
  );

  const surfaceAan = active ? !active.botGepauzeerd : true;

  function selectThread(id: string) {
    if (id === activeId) return;
    setPendingId(id); // direct visueel reageren, scheelt het "bevroren" gevoel
    setDraft("");
    setSendError(null);
    startNav(() => {
      router.push(`${V2_INBOX_PATH}?lead=${encodeURIComponent(id)}`);
    });
  }

  // Prefetch de RSC-payload van een gesprek bij hover, zodat de daadwerkelijke
  // klik bijna direct voelt (de force-dynamic data staat dan al klaar).
  function prefetchThread(id: string) {
    if (id === activeId) return;
    router.prefetch(`${V2_INBOX_PATH}?lead=${encodeURIComponent(id)}`);
  }

  function onSurfaceChange(next: boolean) {
    if (!activeId || botPending) return;
    // next=true → Surface aan → bot NIET gepauzeerd → paused:false.
    runBot({ paused: !next });
  }

  // Versturen: zelfde route + voorwaarden als WhatsAppComposer. Alleen
  // mogelijk wanneer de bot gepauzeerd is (owner neemt over).
  function onSend() {
    if (!activeId || !active) return;
    const bericht = draft.trim();
    if (!bericht) return;
    if (!active.botGepauzeerd) {
      setSendError(
        "Zet Surface eerst uit voor dit gesprek om zelf te kunnen reageren.",
      );
      return;
    }
    setSendError(null);
    startSend(async () => {
      try {
        const res = await fetch(
          `/api/dashboard/lead/${activeId}/send-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bericht }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          setSendError(
            typeof data?.error === "string"
              ? data.error
              : `Verzoek mislukt (HTTP ${res.status}).`,
          );
          return;
        }
        setDraft("");
        router.refresh();
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Netwerkfout.");
      }
    });
  }

  return (
    <>
      {/* Realtime-subscriptions: geen zichtbare UI. Bewust BUITEN de grid
          (in een display:none-wrapper) zodat ze geen grid-kolom innemen,
          LeadDetailRealtime rendert anders een LiveDot die de 3-koloms-
          layout een kolom opschuift. De subscriptions blijven gewoon lopen. */}
      <div className={styles.realtime} aria-hidden="true">
        <InboxRealtime />
        {activeId ? (
          <>
            <InboxMarkRead leadId={activeId} />
            <LeadDetailRealtime leadId={activeId} />
          </>
        ) : null}
      </div>

      <div className={styles.page}>
        <ThreadList
          threads={threads}
          activeId={highlightId ?? ""}
          unreadById={unreadById}
          onSelect={selectThread}
          onHover={prefetchThread}
        />

        {active ? (
          <ChatPane
            naam={active.naam}
            initials={active.initials}
            sub={active.sub}
            messages={active.messages}
            surfaceAan={surfaceAan}
            draft={draft}
            loading={navPending}
            onSurfaceChange={onSurfaceChange}
            onDraftChange={setDraft}
            onSend={onSend}
          />
        ) : (
          <EmptyChat />
        )}

        {active ? (
          <LeadContext
            leadId={active.leadId}
            naam={active.naam}
            initials={active.initials}
            context={active.context}
          />
        ) : (
          <EmptyContext />
        )}
      </div>

      {sendError ? (
        <div role="alert" className={styles.sendError}>
          {sendError}
        </div>
      ) : null}
    </>
  );
}

/** Lege middenkolom wanneer er nog geen gesprek gekozen is. */
function EmptyChat() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>Kies een gesprek</div>
      <div className={styles.emptySub}>
        Selecteer een conversatie uit de lijst om de WhatsApp-thread te
        bekijken.
      </div>
    </div>
  );
}

/** Lege rechterkolom wanneer er nog geen gesprek gekozen is. */
function EmptyContext() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptySub}>Selecteer een gesprek voor lead-info.</div>
    </div>
  );
}
