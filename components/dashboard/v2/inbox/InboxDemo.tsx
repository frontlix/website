"use client";

// ─────────────────────────────────────────────────────────────────────
// Inbox v2, DEMO-tak (dev-preview zonder login). Dit is de oorspronkelijke
// client-only inbox op demo-data: client-state voor versturen, Surface
// aan/uit en het overnemen van de Surface-suggestie. Wordt alleen gerenderd
// als v2Session() null is; in productie dwingt de middleware auth af en valt
// de pagina altijd op de echte-data-tak (InboxClient). Verwijder dit zodra
// v2 het live dashboard definitief vervangt.
// ─────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { THREADS, type ChatMessage } from "@/components/dashboard/v2/demo-data";
import { ThreadList } from "./ThreadList";
import { ChatPane } from "./ChatPane";
import { LeadContext } from "./LeadContext";
import { CONVERSATIONS } from "./inbox-data";
import styles from "@/app/dashboard/v2/inbox/page.module.css";

export function InboxDemo() {
  const [activeId, setActiveId] = useState<string>(THREADS[0].id);

  // Per gesprek: zelf getypte/verstuurde berichten (bovenop de demo-reeks).
  const [extra, setExtra] = useState<Record<string, ChatMessage[]>>({});
  // Per gesprek: concept-tekst in het invoerveld.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Per gesprek: Surface aan/uit (default aan). false = uitgezet.
  const [surfaceOff, setSurfaceOff] = useState<Record<string, boolean>>({});
  // Per gesprek: gelezen-vlag (zet de ongelezen-badge op 0 zodra geopend).
  const [gelezen, setGelezen] = useState<Record<string, boolean>>(() => ({
    [THREADS[0].id]: true,
  }));

  const unreadById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of THREADS) map[t.id] = gelezen[t.id] ? 0 : t.unread;
    return map;
  }, [gelezen]);

  const activeThread = THREADS.find((t) => t.id === activeId) ?? THREADS[0];
  const conversation = CONVERSATIONS[activeId];
  const surfaceAan = surfaceOff[activeId] !== true;
  const draft = drafts[activeId] ?? "";

  const messages = useMemo(
    () => [...conversation.messages, ...(extra[activeId] ?? [])],
    [conversation.messages, extra, activeId],
  );

  function selectThread(id: string) {
    setActiveId(id);
    setGelezen((g) => ({ ...g, [id]: true }));
  }

  function setDraft(value: string) {
    setDrafts((d) => ({ ...d, [activeId]: value }));
  }

  function setSurface(next: boolean) {
    setSurfaceOff((s) => ({ ...s, [activeId]: !next }));
  }

  // Zelf een bericht sturen pauzeert Surface automatisch (zoals in het dossier).
  function send() {
    const text = draft.trim();
    if (!text) return;
    setExtra((e) => ({
      ...e,
      [activeId]: [
        ...(e[activeId] ?? []),
        { from: "mij", text, tijd: "08:34", status: "Verzonden" },
      ],
    }));
    setDrafts((d) => ({ ...d, [activeId]: "" }));
    setSurfaceOff((s) => ({ ...s, [activeId]: true }));
  }

  return (
    <div className={styles.page}>
      <ThreadList
        threads={THREADS}
        activeId={activeId}
        unreadById={unreadById}
        onSelect={selectThread}
      />

      <ChatPane
        naam={activeThread.naam}
        initials={activeThread.initials}
        sub={conversation.sub}
        messages={messages}
        suggestie={conversation.suggestie}
        surfaceAan={surfaceAan}
        draft={draft}
        onSurfaceChange={setSurface}
        onDraftChange={setDraft}
        onUseSuggestion={setDraft}
        onSend={send}
      />

      <LeadContext
        leadId={activeThread.id}
        naam={activeThread.naam}
        initials={activeThread.initials}
        context={conversation.context}
      />
    </div>
  );
}
