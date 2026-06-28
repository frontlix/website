"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Pause, Send } from "lucide-react";
import { Avatar } from "@/components/dashboard/v2/ui";
import type { DossierBericht, DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  initials: string;
  /** Naam van de lead, als seed voor de gekleurde avatar-tint (zelfde kleur
   *  als in de kop). Zonder = terugval op de initialen. */
  naam?: string;
  messages: DossierBericht[];
  /** Surface beantwoordt automatisch (aan) of jij antwoordt zelf (uit). */
  botAan: boolean;
  onToggleBot: (next: boolean) => void;
  /** Zelf een bericht naar de klant sturen. Kan alleen als Surface uit staat
   *  (bot_gepauzeerd). Geeft { ok, error } terug zodat de composer een mislukte
   *  verzending zichtbaar maakt i.p.v. stil te falen. */
  onSend: (tekst: string) => Promise<{ ok: boolean; error?: string }>;
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Rechterkaart: WhatsApp-gesprek. Klantbubbels links wit, jij/Surface
 *  rechts groen met afzenderlabel; header met "Zelf overnemen / Surface
 *  aanzetten"-toggle en onderaan de Surface-strip of een gepauzeerd-strip. */
export function ChatPanel({
  initials,
  naam,
  messages,
  botAan,
  onToggleBot,
  onSend,
  data = DOSSIER,
}: ChatPanelProps) {
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll naar het nieuwste bericht zodra de lijst groeit.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Zelf reageren kan alleen wanneer Surface uit staat (de backend weigert
  // anders met 409). We wachten het resultaat af en tonen een foutmelding
  // zodat een mislukte verzending niet stil verdwijnt.
  const stuur = async () => {
    const t = tekst.trim();
    if (!t || sending || botAan) return;
    setSending(true);
    setFout(null);
    try {
      const res = await onSend(t);
      if (res?.ok) {
        setTekst("");
      } else {
        setFout(res?.error ?? "Versturen mislukt. Probeer het opnieuw.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Avatar initials={initials} name={naam} size={32} />
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
                  {data.fotos.map((f, i) => (
                    <PhotoPlaceholder key={i} tag={f.tag} url={f.url} height={54} />
                  ))}
                </div>
              ) : null}
              <div className={styles.time}>{m.tijd}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        {/* Reageren kan rechtstreeks vanuit het dossier zodra Surface uit
            staat. Surface aan -> veld uit met instructie om over te nemen. */}
        {fout ? (
          <div role="alert" className={styles.fout}>
            {fout}
          </div>
        ) : null}
        <div className={styles.inputRow}>
          <input
            value={tekst}
            onChange={(e) => {
              setTekst(e.target.value);
              if (fout) setFout(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stuur();
              }
            }}
            disabled={botAan || sending}
            placeholder={
              botAan
                ? "Zet Surface uit om zelf te reageren"
                : "Typ een bericht aan de klant"
            }
            className={styles.input}
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={stuur}
            disabled={botAan || sending || !tekst.trim()}
            title={botAan ? "Zet eerst Surface uit" : "Versturen"}
            aria-label="Versturen"
          >
            <Send size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
