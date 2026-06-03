'use client'

import { useState } from 'react'
import { Sparkles, Mic, ChevronRight, UserPlus } from 'lucide-react'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import type { ExistingClientMatch } from '@/lib/dashboard/manual-offerte-search'
import type { ExtractedFields } from '@/lib/dashboard/manual-offerte-ai'
import { applyAiExtracted, applyExistingClient } from '@/lib/dashboard/manual-offerte-handlers'
import { AiPasteInput } from './AiPasteInput'
import { ExistingClientSearch } from './ExistingClientSearch'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

type Props = {
  data: ManualOfferteData
  set: SetFn
  /** Voer de gebruiker door naar Step 1 (Klant). */
  onAdvance: () => void
  /** Vlak voor AI-set-calls: ManualOfferteModal gebruikt 'm om het auto-zakken-effect te suppressen. */
  onBeforeAiFill?: () => void
}

/**
 * Step 0 — mobile-only entry-scherm. Vier ingangen om een offerte te
 * starten: AI-paste, dicteer (placeholder), bestaande klant zoeken,
 * nieuwe klant. Na een succesvolle pick of AI-extract advancen we
 * automatisch naar Step 1 zodat de user direct het ingevulde formulier
 * ziet.
 */
export function StepStart({ data, set, onAdvance, onBeforeAiFill }: Props) {
  const [view, setView] = useState<'menu' | 'paste'>('menu')

  const handleAi = (f: ExtractedFields) => {
    applyAiExtracted(set, f, onBeforeAiFill)
    onAdvance()
  }

  const handlePick = (m: ExistingClientMatch) => {
    applyExistingClient(set, m)
    onAdvance()
  }

  const handleClear = () => set('existing_lead_id', null)

  if (view === 'paste') {
    return (
      <div className={styles.startWrap}>
        <AiPasteInput
          onExtracted={handleAi}
          defaultOpen
          onClose={() => setView('menu')}
        />
      </div>
    )
  }

  return (
    <div className={styles.startWrap}>
      <div className={styles.startIntro}>
        <h2 className={styles.startIntroTitle}>Hoe wil je beginnen?</h2>
        <p className={styles.startIntroSub}>
          Plak een WhatsApp-bericht, zoek een bestaande klant, of dicteer wat de klant zei
        </p>
      </div>

      <div className={styles.startSearchCard}>
        <ExistingClientSearch
          pickedLeadId={data.existing_lead_id}
          pickedNaam={data.naam}
          onPick={handlePick}
          onClear={handleClear}
        />
      </div>

      <button
        type="button"
        className={styles.startTile}
        onClick={() => setView('paste')}
      >
        <span className={styles.startTileIcon}>
          <Sparkles size={18} />
        </span>
        <div className={styles.startTileText}>
          <span className={styles.startTileTitle}>Plak bericht</span>
          <span className={styles.startTileSub}>AI haalt naam, adres en m² er automatisch uit</span>
        </div>
        <ChevronRight size={16} className={styles.startTileChevron} />
      </button>

      <button
        type="button"
        className={styles.startTile}
        onClick={() => alert('Dicteer komt binnenkort beschikbaar.')}
      >
        <span className={`${styles.startTileIcon} ${styles.startTileIconGreen}`}>
          <Mic size={18} />
        </span>
        <div className={styles.startTileText}>
          <span className={styles.startTileTitle}>Dicteer</span>
          <span className={styles.startTileSub}>&ldquo;85 m² oprit invegen voor Marieke uit Delft&hellip;&rdquo;</span>
        </div>
        <ChevronRight size={16} className={styles.startTileChevron} />
      </button>

      <button
        type="button"
        className={styles.startNewClientTile}
        onClick={onAdvance}
      >
        <span className={styles.startTileIcon}>
          <UserPlus size={18} />
        </span>
        <div className={styles.startTileText}>
          <span className={styles.startTileTitle}>Nieuwe klant invoeren</span>
          <span className={styles.startTileSub}>Vul de gegevens zelf in</span>
        </div>
        <ChevronRight size={16} className={styles.startTileChevron} />
      </button>
    </div>
  )
}
