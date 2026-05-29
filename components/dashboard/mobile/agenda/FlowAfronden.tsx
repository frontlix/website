'use client'

// FlowAfronden — "Klus afronden" completion flow.
// Full-height sheet content rendered by MobileAgenda inside a full-screen
// overlay. Includes its own FNav (the Afronden sheet is NOT a drilldown, so it
// carries its own header). Ported from handoff src/agenda-b/flow/FAfronden.jsx.
//
// v1: alle data is mock + lokale state. Geen echte persistence — de
// foto-upload, notitie-edit, materiaal-edit en de vervolgstap-toggles
// bewaren niets server-side. Zie de // TODO's voor de functionele pass.

import { useState } from 'react'
import { Check, Plus, Camera, FileText, Zap, Sparkles, Euro, Star, Bell } from 'lucide-react'
import type { AgendaEvent } from './agenda-mock'
import { FNav, FDetailCard, FKV } from './FlowAtoms'
import { MobileToggle } from '../shared/MobileToggle'
import styles from './FlowAfronden.module.css'

type Props = {
  ev: AgendaEvent
  open: boolean
  onClose: () => void
  onDone: () => void
}

// Synthetische foto-previews — gekleurde gradient + camera-icoon.
// Tones bewust inline als data (per Translation Contract: "PhotoTile gradient
// tones inline as data (3 gradients)").
const PHOTO_TONES = [
  'linear-gradient(135deg, #1A56FF 0%, #00CFFF 100%)',
  'linear-gradient(135deg, #16A34A 0%, #84CC16 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #FB7185 100%)',
]

// Eén "wat moet er nog gebeuren?"-rij met euro/star/bell + MobileToggle.
type NextStep = {
  id: string
  icon: 'euro' | 'star' | 'bell'
  title: string
  sub: string
  on: boolean
}

const NEXT_ICON = {
  euro: Euro,
  star: Star,
  bell: Bell,
} as const

const INITIAL_NEXT_STEPS: NextStep[] = [
  {
    id: 'factuur',
    icon: 'euro',
    title: 'Factuur sturen',
    sub: '€640 · vandaag versturen via e-mail',
    on: true,
  },
  {
    id: 'review',
    icon: 'star',
    title: 'Reviewlink via WhatsApp',
    sub: 'Stuurt morgen 10:00 — Google + eigen review',
    on: true,
  },
  {
    id: 'aftercare',
    icon: 'bell',
    title: 'Aftercare over 2 weken',
    sub: "Korte WA: hoe ligt 't erbij? + foto's terug",
    on: false,
  },
]

const DEFAULT_NOTE =
  'Voegen invegen netjes gelukt, beschermlaag aangebracht. Niet 48u betreden met natte voeten — drogen volledig binnen 24u.'

export function FlowAfronden({ ev, open, onClose, onDone }: Props) {
  // Klantnaam + plaats afgeleid uit het event (fallback = handoff-voorbeeld).
  const naam = ev?.naam ?? 'Marieke v.d. Heijden'
  const plaats = ev?.adres ? ev.adres.split(' · ').slice(-1)[0] : 'Utrecht'

  // Lokale state — upload/edit nog niet gekoppeld aan een server-action.
  const [photos] = useState<number[]>([1, 2, 3])
  const [note, setNote] = useState(DEFAULT_NOTE)
  const [nextSteps, setNextSteps] = useState<NextStep[]>(INITIAL_NEXT_STEPS)

  function toggleStep(id: string) {
    // TODO: functional pass — persisteer vervolgstap-keuze (server action).
    setNextSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, on: !s.on } : s)),
    )
  }

  function handleAddPhoto() {
    // TODO: functional pass — photo upload (file picker + storage).
  }

  function handleDone() {
    // TODO: functional pass — complete-job server action + photo upload.
    onDone()
  }

  if (!open) return null

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Klus afronden">
      <FNav title="Klus afronden" sub={`${naam} · ${plaats}`} rightLabel="Sluiten" onBack={onClose} />

      {/* Tijd-tracking summary */}
      <div className={styles.timeSummary}>
        <div className={styles.timeHead}>
          <span className={styles.timeCheck}>
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          </span>
          <span className={styles.timeHeadLabel}>Alle checklist-stappen gedaan</span>
        </div>
        <div className={styles.timeGrid}>
          {[
            { lbl: 'Start', v: '09:03' },
            { lbl: 'Klaar', v: '11:48' },
            { lbl: 'Gewerkt', v: '2u 45m' },
          ].map((s, i) => (
            <div key={s.lbl} className={styles.timeCell} data-divider={i < 2 || undefined}>
              <span className={styles.timeCellLabel}>{s.lbl}</span>
              <span className={styles.timeCellValue}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Foto's na uitvoering */}
      <FDetailCard
        icon="cam"
        title="Foto's na uitvoering"
        right={<span className={styles.uploadCount}>{photos.length} geüpload</span>}
      >
        <div className={styles.photoGrid}>
          {photos.map((n, i) => (
            <PhotoTile key={n} idx={n} tone={PHOTO_TONES[i % PHOTO_TONES.length]} />
          ))}
          {/* Add tile */}
          <button type="button" className={styles.addTile} onClick={handleAddPhoto} aria-label="Foto toevoegen">
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      </FDetailCard>

      {/* Notitie voor de klant — bewerkbaar, vooringevuld door Surface */}
      <FDetailCard icon="doc" title="Notitie voor de klant">
        <textarea
          className={styles.noteInput}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          aria-label="Notitie voor de klant"
        />
        <div className={styles.surfaceHint}>
          <Sparkles size={11} aria-hidden="true" /> Surface vulde dit alvast in
        </div>
      </FDetailCard>

      {/* Materiaal gebruikt — actueel vs. verwacht */}
      <FDetailCard icon="bolt" title="Materiaal gebruikt">
        <FKV k="Voegzand polymeer" v="2 zakken (verwacht 4)" />
        <FKV k="Beschermlaag spray" v="1 fles" />
        <FKV k="Extra reiskosten" v="—" last />
      </FDetailCard>

      {/* Vervolgstappen — toggles */}
      <FDetailCard icon="spark" title="Wat moet er nog gebeuren?">
        {nextSteps.map((step, i) => {
          const Icon = NEXT_ICON[step.icon]
          return (
            <div
              key={step.id}
              className={styles.nextStep}
              data-last={i === nextSteps.length - 1 || undefined}
            >
              <span className={styles.nextIcon} data-on={step.on || undefined}>
                <Icon size={14} aria-hidden="true" />
              </span>
              <div className={styles.nextText}>
                <div className={styles.nextTitle}>{step.title}</div>
                <div className={styles.nextSub}>{step.sub}</div>
              </div>
              <MobileToggle on={step.on} onChange={() => toggleStep(step.id)} label={step.title} />
            </div>
          )
        })}
      </FDetailCard>

      {/* Footer: markeer als afgerond */}
      <div className={styles.footer}>
        <button type="button" className={styles.doneBtn} onClick={handleDone}>
          <Check size={18} strokeWidth={2.4} aria-hidden="true" /> Markeer als afgerond
        </button>
      </div>
    </div>
  )
}

// ── PhotoTile ──
// Gekleurde gradient-tegel met camera-icoon + "1/3"-label. Gradient via --tone
// (inline data — geen thema-token, dit zijn synthetische placeholders).
type PhotoTileProps = {
  idx: number
  tone: string
}

function PhotoTile({ idx, tone }: PhotoTileProps) {
  return (
    <div className={styles.photoTile} style={{ '--tile-tone': tone } as React.CSSProperties}>
      <span className={styles.photoTileIcon}>
        <Camera size={20} aria-hidden="true" />
      </span>
      <span className={styles.photoTileTag}>{idx}/3</span>
    </div>
  )
}
