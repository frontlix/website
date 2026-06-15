"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { Toggle } from "../ui";
import { Avatar } from "../ui/Avatar";
import type { ChatMessage } from "../demo-data";
import styles from "./ChatPane.module.css";

interface ChatPaneProps {
  naam: string;
  initials: string;
  sub: string;
  messages: ChatMessage[];
  surfaceAan: boolean;
  draft: string;
  /** True terwijl het volgende gesprek laadt (toont een subtiele laad-balk). */
  loading?: boolean;
  onSurfaceChange: (next: boolean) => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
}

/** Middenkolom: het WhatsApp-gesprek, styling identiek aan het dossier
 *  (var(--rb-wa-*)). Header met Surface-toggle en invoer. */
export function ChatPane({
  naam,
  initials,
  sub,
  messages,
  surfaceAan,
  draft,
  loading = false,
  onSurfaceChange,
  onDraftChange,
  onSend,
}: ChatPaneProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  // Kanaal-accent uit de sub-tekst ("Telefoon · ..." → cyaan, anders WhatsApp-groen).
  const isTelefoon = sub.startsWith("Telefoon");

  // Scroll mee naar het laatste bericht bij nieuwe berichten of wissel.
  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, naam]);

  return (
    <div className={styles.card}>
      {loading ? <div className={styles.loadingBar} aria-hidden="true" /> : null}
      <div className={styles.head}>
        <span
          className={`${styles.avatarWrap} ${
            isTelefoon ? styles.channelTelefoon : styles.channelWhatsApp
          }`}
        >
          <Avatar name={naam} initials={initials} size={40} radius={14} />
          <span className={styles.channelDot} aria-hidden="true" />
        </span>
        <div className={styles.headMain}>
          <div className={styles.naam}>{naam}</div>
          <div className={styles.sub}>{sub}</div>
        </div>
        <div className={`${styles.surfaceToggle} ${surfaceAan ? "" : styles.surfaceToggleOff}`}>
          <span className={`${styles.surfaceLabel} ${surfaceAan ? "" : styles.surfaceLabelOff}`}>
            Surface {surfaceAan ? "aan" : "uit"}
          </span>
          <Toggle value={surfaceAan} onChange={onSurfaceChange} aria-label="Surface aan of uit" />
        </div>
      </div>

      <div
        className={`${styles.stream} ${loading ? styles.streamLoading : ""}`}
        ref={streamRef}
      >
        <div className={styles.bubbles}>
          {messages.map((m, i) => {
            const mine = m.from === "mij";
            return (
              <div key={i} className={`${styles.row} ${mine ? styles.rowMine : ""}`}>
                {mine ? <span className={styles.sender}>Jij</span> : null}
                <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleIn}`}>
                  {m.text}
                </div>
                <div className={styles.meta}>
                  {m.tijd}
                  {m.status ? ` · ${m.status}` : ""}
                </div>
              </div>
            );
          })}
        </div>

        {!surfaceAan ? (
          <div className={styles.paused}>
            <span className={styles.pausedText}>
              Surface staat uit voor dit gesprek, jij antwoordt zelf. Nieuwe berichten worden niet
              automatisch beantwoord.
            </span>
            <button
              type="button"
              className={styles.zetAanBtn}
              onClick={() => onSurfaceChange(true)}
            >
              Zet aan
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.composer}>
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          placeholder="Typ een bericht…"
          className={styles.input}
        />
        <button type="button" className={styles.sendBtn} onClick={onSend} aria-label="Verstuur">
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
