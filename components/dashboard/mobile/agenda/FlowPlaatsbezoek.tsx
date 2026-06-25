'use client'

// FlowPlaatsbezoek, Plaatsbezoek-detail, gerenderd als CONTENT binnen
// MobileDrilldownLayer. De layer levert de header (terug + titel); dit
// component levert alleen de body (geen eigen FNav). Andere primaire actie dan
// klus: "Offerte starten" met een aftikbare intake-checklist (lokale state).
// (Port van handoff src/agenda-b/flow/FPlaatsbezoek.jsx.)

import { useState } from 'react'
import Link from 'next/link'
import { Clock, MessageCircle, FileText, X } from 'lucide-react'
import {
  FHero,
  FDetailCard,
  FKV,
  FCheckRow,
} from './FlowAtoms'
import { FlowRouteMap } from './FlowRouteMap'
import { type AgendaEvent } from './agenda-mock'
import { eventTone } from './agenda-mobile-helpers'
import type { RouteBase } from '@/components/dashboard/v2/agenda/agenda-data'
import styles from './FlowPlaatsbezoek.module.css'

type FlowPlaatsbezoekProps = {
  ev: AgendaEvent
  onHerplan: () => void
  onStartOfferte: () => void
  /** Afspraak annuleren. Zonder handler blijft de knop verborgen. */
  onAnnuleer?: () => void
  /** Werkplaats-basis voor de live routekaart (werkplaats → klant). */
  base?: RouteBase | null
}

// Initialen voor de klant-avatar (stabiel, geen externe afhankelijkheid).
function initials(naam: string): string {
  const parts = naam.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Intake-stappen, in v1 lokaal afvinkbaar (geen persistentie).
const INTAKE_STEPS = [
  'Oppervlakte meten (verwacht 120m²)',
  "Foto's maken, 4 tot 6 stuks",
  'Type ondergrond noteren',
  'Onkruidbeheersing-vraag bespreken',
  'Toegang voor uitvoering afspreken',
]

export function FlowPlaatsbezoek({ ev, onHerplan, onStartOfferte, onAnnuleer, base }: FlowPlaatsbezoekProps) {
  // Lokale toggle-state per intake-stap. // TODO: functional pass, persist intake
  const [checked, setChecked] = useState<boolean[]>(() => INTAKE_STEPS.map(() => false))
  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  const doneCount = checked.filter(Boolean).length

  return (
    // --tone draagt de event-kleur door (plaatsbezoek → warning) naar de avatar.
    <div className={styles.root} style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}>
      <FHero
        ev={ev}
        kindLabel="Plaatsbezoek"
        badge={<span className={styles.intakeBadge}>Intake · nieuwe klant</span>}
      />

      {/* Klant + WA-context callout */}
      <FDetailCard icon="phone" title="Klant">
        <div className={styles.klantRow}>
          <span className={styles.avatar}>{initials(ev.naam)}</span>
          <div className={styles.klantMeta}>
            <div className={styles.klantNaam}>{ev.naam}</div>
            <div className={styles.klantTel}>Contact: Karin Visser · +31 6 33 02 11 87</div>
          </div>
          {/* Echte ingang naar het lead-dossier (ev.lead = lead_id). Alleen tonen
              als er een lead is: een lead-loos event (ev.id "ext-…") mag geen
              dode /leads/ext-…-link maken. */}
          {ev.lead && (
            <Link href={`/leads/${ev.lead}`} className={styles.leadChip}>
              Lead
            </Link>
          )}
        </div>

        <div className={styles.waCallout}>
          <MessageCircle size={14} className={styles.waIcon} />
          <div>
            <strong className={styles.waStrong}>Surface kreeg via WA:</strong> 24 tuinpaden + 1
            hoofdpad, &ldquo;wisselende staat, sommige zwaar mossig&rdquo;. Aanvraag voor
            onderhoudscontract.
          </div>
        </div>
      </FDetailCard>

      {/* Adres + map (live route waar mogelijk, anders statisch SVG-kaartje) */}
      <FDetailCard icon="pin" title="Adres">
        <div className={styles.adres}>{ev.adres}</div>
        <FlowRouteMap
          label={ev.afstandKm != null ? `${ev.afstandKm} km` : ''}
          lat={ev.lat}
          lng={ev.lng}
          base={base}
        />
      </FDetailCard>

      {/* Intake-checklist, lokaal afvinkbaar */}
      <FDetailCard
        icon="check"
        title="Intake-checklist"
        dense
        right={
          <span className={styles.progress}>
            {doneCount} / {INTAKE_STEPS.length}
          </span>
        }
      >
        {INTAKE_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.checkBtn}
            onClick={() => toggle(i)}
            aria-pressed={checked[i]}
          >
            <FCheckRow done={checked[i]} label={label} last={i === INTAKE_STEPS.length - 1} />
          </button>
        ))}
      </FDetailCard>

      {/* Offerte-basis */}
      <FDetailCard icon="edit" title="Offerte-basis">
        <FKV k="Verwacht type" v="Tuinpaden invegen" />
        <FKV k="Verwacht m²" v="±120 m²" />
        <FKV k="Prijsindicatie" v="€1.080, €1.320" />
        <FKV k="Concurrent-citaat" v="Geen" last />
      </FDetailCard>

      {/* Surface-tip (accent-callout) */}
      <FDetailCard icon="spark" title="Surface tipt">
        <div className={styles.tip}>
          VVE&apos;s hechten aan een meerjarig onderhoudscontract, vraag of ze interesse hebben in
          een 3-jaarsplan met jaarlijkse review. Geeft je 18% hogere marge.
        </div>
      </FDetailCard>

      {/* Footer-acties (sticky onderaan) */}
      <div className={styles.footer}>
        <button type="button" onClick={onHerplan} className={styles.btnGhost}>
          <Clock size={14} /> Herplannen
        </button>
        {onAnnuleer && (
          <button type="button" onClick={onAnnuleer} className={styles.btnGhost}>
            <X size={14} /> Annuleren
          </button>
        )}
        {/* TODO: functional pass, start offerte (create-quote server action) */}
        <button type="button" onClick={onStartOfferte} className={styles.btnPrimary}>
          <FileText size={16} /> Offerte starten
        </button>
      </div>
    </div>
  )
}
