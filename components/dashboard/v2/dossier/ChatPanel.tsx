"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Pause, Send } from "lucide-react";
import { Avatar } from "@/components/dashboard/v2/ui";
import type { DossierBericht, DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { SurfaceStrip } from "./SurfaceStrip";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  initials: string;
  messages: DossierBericht[];
  /** Surface beantwoordt automatisch (aan) of jij antwoordt zelf (uit). */
  botAan: boolean;
  onToggleBot: (next: boolean) => void;
  /** Zelf een bericht sturen, pauzeert Surface in de pagina-state. */
  onSend: (tekst: string) => void;
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Rechterkaart: WhatsApp-gesprek. Klantbubbels links wit, jij/Surface
 *  rechts groen met afzenderlabel; header met "Zelf overnemen / Surface
 *  aanzetten"-toggle en onderaan de Surface-strip of een gepauzeerd-strip. */
export function ChatPanel({
  initials,
  messages,
  botAan,
  onToggleBot,
  onSend,
  data = DOSSIER,
}: ChatPanelProps) {
  const [tekst, setTekst] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll naar het nieuwste bericht zodra de lijst groeit.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const stuur = () => {
    if (!tekst.trim()) return;
    onSend(tekst.trim());
    setTekst("");
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Avatar initials={initials} size={32} variant="soft" />
        <div className={styles.headerMain}>
          <div className={styles.headerTitle}>WhatsApp-gesprek</div>
          <div className={styles.headerSub}>
            {data.tel} · {botAan ? "Surface antwoordt automatisch" : "jij antwoordt zelf"}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.takeover} ${botAan ? styles.takeoverIdle : styles.takeoverActive}`}
          onClick={() => onToggleBot(!botAan)}
        >
          {botAan ? (
            <>
              <Pause size={12} strokeWidth={2.4} />
              Zelf overnemen
            </>
          ) : (
            <>
              <Sparkles size={12} strokeWidth={2.4} />
              Surface aanzetten
            </>
          )}
        </button>
      </div>

      <div className={styles.thread} ref={scrollRef}>
        {messages.map((m, i) => {
          const klant = m.van === "klant";
          return (
            <div
              key={`${m.tijd}-${i}`}
              className={`${styles.bubble} ${klant ? styles.bubbleIn : styles.bubbleOut}`}
            >
              {m.van === "bot" ? (
                <div className={styles.sender}>
                  <Sparkles size={10} strokeWidth={2.6} />
                  Surface
                </div>
              ) : null}
              {m.van === "mij" ? <div className={styles.senderMij}>Jij</div> : null}
              <div className={styles.bubbleText}>{m.tekst}</div>
              {m.fotos ? (
                <div className={styles.bubbleFotos}>
                  {data.fotos.map((f) => (
                    <PhotoPlaceholder key={f} tag={f} height={54} />
                  ))}
                </div>
              ) : null}
              <div className={styles.time}>{m.tijd}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        {botAan ? (
          <SurfaceStrip
            fase={data.surface.fase}
            actie={data.surface.actie}
            onPause={() => onToggleBot(false)}
          />
        ) : (
          <div className={styles.paused}>
            <Pause size={14} strokeWidth={2.2} />
            Surface is gepauzeerd voor dit gesprek, nieuwe berichten worden niet automatisch
            beantwoord.
          </div>
        )}
        <div className={styles.inputRow}>
          <input
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") stuur();
            }}
            placeholder="Typ een bericht, Surface pauzeert dan automatisch…"
            className={styles.input}
          />
          <button type="button" className={styles.sendBtn} onClick={stuur} aria-label="Versturen">
            <Send size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
