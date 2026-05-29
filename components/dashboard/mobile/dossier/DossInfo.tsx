'use client'

import {
  DossLabel,
  DossRow,
  DossCheckPill,
  DossDotRow,
  DossCheckbox,
} from './DossAtoms'
import { DOSS } from './dossier-mock'
import type { DossierLead } from './dossier-mock'
import styles from './DossInfo.module.css'

// ── DossInfo ──
// Info-tab van het lead-dossier: Contact, Dienst, Bijzonderheden en
// Surface-uitvraag. Leest de mock DOSS + de m² van de lead.
// (Port van handoff DossInfo, regels 82–143.)
type DossInfoProps = {
  lead: Pick<DossierLead, 'm2'>
}

export function DossInfo({ lead }: DossInfoProps) {
  return (
    <div className={styles.wrap}>
      {/* Contact-kaart: 3 rijen, telefoon + adres met getinte actie-knop. */}
      <section>
        <DossLabel>Contact</DossLabel>
        <div className={styles.card}>
          <DossRow
            icon="phone"
            label="Telefoon"
            value={DOSS.telefoon}
            action={{ icon: 'wa', tone: 'var(--color-whatsapp)' }}
          />
          <DossRow icon="mail" label="E-mail" value={DOSS.email} />
          <DossRow
            icon="pin"
            label={`Adres · ${DOSS.afstand} km`}
            value={DOSS.adres}
            action={{ icon: 'pin', tone: 'var(--color-primary)' }}
          />
        </div>
      </section>

      {/* Dienst-kaart: hoofd-dienst + check-pills per sub + een m²-pill. */}
      <section>
        <DossLabel>Dienst</DossLabel>
        <div className={styles.serviceCard}>
          <div className={styles.serviceTitle}>{DOSS.hoofd}</div>
          <div className={styles.pillRow}>
            {DOSS.sub.map((s) => (
              <DossCheckPill key={s}>{s}</DossCheckPill>
            ))}
            {/* Oppervlakte-pill (surface-2) — komt uit de lead, niet uit DOSS. */}
            <span className={styles.m2Pill}>{lead.m2} m²</span>
          </div>
        </div>
      </section>

      {/* Bijzonderheden: gekleurde dot-rijen. */}
      <section>
        <DossLabel>Bijzonderheden</DossLabel>
        <div className={styles.card}>
          {DOSS.bijzonderheden.map((b) => (
            <DossDotRow key={b.l} tone={b.tone} label={b.l} value={b.v} />
          ))}
        </div>
      </section>

      {/* Surface-uitvraag: checkbox-vragen (afgevinkt = lichter gewicht). */}
      <section>
        <DossLabel>Surface-uitvraag</DossLabel>
        <div className={styles.questionCard}>
          {DOSS.vragen.map((q) => (
            <div key={q.q} className={styles.questionRow}>
              <DossCheckbox done={q.done} />
              <span className={styles.questionText} data-done={q.done || undefined}>
                {q.q}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
