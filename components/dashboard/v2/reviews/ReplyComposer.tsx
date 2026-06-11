"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Modal, Button } from "@/components/dashboard/v2/ui";
import { Stars } from "./Stars";
import type { WaitingReview } from "./reviews-data";
import styles from "./ReplyComposer.module.css";

interface ReplyComposerProps {
  /** De review die je beantwoordt; null sluit de composer. */
  review: WaitingReview | null;
  onClose: () => void;
  /** Antwoord versturen (markeert de review als beantwoord). */
  onSend: (naam: string) => void;
}

/** Antwoord-composer in een modal. Het conceptantwoord van Surface is
 *  voorgevuld en aanpasbaar; versturen markeert de review als beantwoord. */
export function ReplyComposer({ review, onClose, onSend }: ReplyComposerProps) {
  const [tekst, setTekst] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Bij openen: conceptantwoord voorvullen en focus op het veld.
  useEffect(() => {
    if (review) {
      setTekst(review.concept);
      // Focus na de modal-mount; cursor aan het eind.
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }, [review]);

  return (
    <Modal open={!!review} onClose={onClose} width={540} label="Antwoord op review">
      {review ? (
        <div className={styles.body}>
          <h2 className={styles.title}>Antwoord aan {review.naam}</h2>
          <div className={styles.meta}>
            <span>{review.bron}</span>
            <span className={styles.dot}>·</span>
            <Stars score={review.score} size={12} />
            <span className={styles.dot}>·</span>
            <span className={styles.conceptNote}>
              <Sparkles size={12} strokeWidth={2.5} className={styles.sparkle} />
              concept van Surface, pas aan en verstuur
            </span>
          </div>
          <textarea
            ref={ref}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={5}
            className={styles.textarea}
          />
          <div className={styles.actions}>
            <Button variant="primary" className={styles.send} onClick={() => onSend(review.naam)}>
              <Send size={15} strokeWidth={2.5} />
              Verstuur antwoord
            </Button>
            <Button variant="secondary" className={styles.cancel} onClick={onClose}>
              Annuleren
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
