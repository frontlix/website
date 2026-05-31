'use client'

import {
  DossLabel,
  DossRow,
  DossCheckPill,
  DossDotRow,
  DossCheckbox,
} from './DossAtoms'
import type { DossierLead, DossBijzonder, DossVraag } from './dossier-mock'
import styles from './DossInfo.module.css'

// ── DossInfo ──
// Info-tab: Contact, Dienst, Bijzonderheden en Surface-uitvraag — nu gevoed
// met echte lead-data (props) i.p.v. de DOSS-mock.
type DossInfoProps = {
  lead: Pick<DossierLead, 'm2'>
  contact: { telefoon: string; email: string; adres: string; afstand: number | null }
  dienst: { hoofd: string; sub: string[] }
  bijzonderheden: DossBijzonder[]
  vragen: DossVraag[]
}

export function DossInfo({ lead, contact, dienst, bijzonderheden, vragen }: DossInfoProps) {
  return (
    <div className={styles.wrap}>
      {/* Contact-kaart: telefoon + e-mail + adres met getinte actie-knop. */}
      <section>
        <DossLabel>Contact</DossLabel>
        <div className={styles.card}>
          <DossRow
            icon="phone"
            label="Telefoon"
            value={contact.telefoon}
            action={{ icon: 'wa', tone: 'var(--color-whatsapp)' }}
          />
          <DossRow icon="mail" label="E-mail" value={contact.email} />
          <DossRow
            icon="pin"
            label={contact.afstand != null ? `Adres · ${contact.afstand} km` : 'Adres'}
            value={contact.adres}
            action={{ icon: 'pin', tone: 'var(--color-primary)' }}
          />
        </div>
      </section>

      {/* Dienst-kaart: hoofd-dienst + check-pills per sub + een m²-pill. */}
      <section>
        <DossLabel>Dienst</DossLabel>
        <div className={styles.serviceCard}>
          <div className={styles.serviceTitle}>{dienst.hoofd}</div>
          <div className={styles.pillRow}>
            {dienst.sub.map((s) => (
              <DossCheckPill key={s}>{s}</DossCheckPill>
            ))}
            {lead.m2 > 0 && <span className={styles.m2Pill}>{lead.m2} m²</span>}
          </div>
        </div>
      </section>

      {/* Bijzonderheden: gekleurde dot-rijen (alleen tonen als er iets is). */}
      {bijzonderheden.length > 0 && (
        <section>
          <DossLabel>Bijzonderheden</DossLabel>
          <div className={styles.card}>
            {bijzonderheden.map((b) => (
              <DossDotRow key={b.l} tone={b.tone} label={b.l} value={b.v} />
            ))}
          </div>
        </section>
      )}

      {/* Surface-uitvraag: checkbox-vragen (afgevinkt = lichter gewicht). */}
      <section>
        <DossLabel>Surface-uitvraag</DossLabel>
        <div className={styles.questionCard}>
          {vragen.map((q) => (
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
