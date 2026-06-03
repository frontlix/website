'use client'

// Openingsbericht — mobiel, nu met volledige editor-pariteit met desktop:
// twee tabs (per hoofddienst), bewerkbare tekst, variabelen, live WA-preview,
// "Aanvraag indienen" (Meta-goedkeuring via Slack-flow) + status-historie.
// Defaults zijn 1-op-1 overgenomen van de desktop OpeningTemplateEditor zodat
// een aanvraag vanaf mobiel identiek is aan die vanaf desktop.

import { useMemo, useState } from 'react'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import { InstTemplateBlock } from './InstTemplateBlock'
import styles from './InstOpening.module.css'

const TEMPLATES = [
  {
    key: 'lead_intake_oprit',
    tabLabel: 'Oprit / Terras',
    hoofddienst: 'oprit',
    default: `Hoi {voornaam}👋

Bedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte op maat voor het reinigen en opnieuw invegen van je {hoofddienst}.

Klopt het dat het gaat om ongeveer {m2} m²?`,
  },
  {
    key: 'lead_intake_onkruid',
    tabLabel: 'Onkruidbeheersing',
    hoofddienst: 'onkruidbeheersing',
    default: `Hoi {voornaam}👋

Bedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam} — ik help je snel aan een passende offerte voor onkruidbeheersing op jullie locatie.

Klopt het dat het gaat om ongeveer {m2} m²?`,
  },
] as const

type TemplateKey = (typeof TEMPLATES)[number]['key']

const VARIABLES = [
  '{voornaam}',
  '{naam}',
  '{bedrijf}',
  '{bot_naam}',
  '{m2}',
  '{hoofddienst}',
  '{plaats}',
] as const

type Props = {
  bedrijfsnaam: string | null
  chatbot: string | null
  /** Template-aanvragen, gefilterd op lead_intake_* in de parent. */
  aanvragen: TemplateAanvraag[]
}

export function InstOpening({ bedrijfsnaam, chatbot, aanvragen }: Props) {
  const [activeKey, setActiveKey] = useState<TemplateKey>(TEMPLATES[0].key)
  const active = useMemo(
    () => TEMPLATES.find((t) => t.key === activeKey)!,
    [activeKey],
  )

  // Per-tab draft bewaren zodat tabwissel de tekst niet wist (als desktop).
  const [drafts, setDrafts] = useState<Record<TemplateKey, string>>(() => ({
    lead_intake_oprit: TEMPLATES[0].default,
    lead_intake_onkruid: TEMPLATES[1].default,
  }))

  // Preview-substitutie — echte bedrijfsnaam + bot-naam, rest demo-waarden.
  const makePreview = (text: string) =>
    text
      .replaceAll('{voornaam}', 'Jeroen')
      .replaceAll('{naam}', 'Jeroen de Vries')
      .replaceAll('{bedrijf}', bedrijfsnaam || 'Schoon Straatje')
      .replaceAll('{bot_naam}', chatbot || 'Surface')
      .replaceAll('{m2}', '145')
      .replaceAll('{hoofddienst}', active.hoofddienst)
      .replaceAll('{plaats}', 'Almere')

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        Een aanpassing aan de template wordt door Meta beoordeeld (24–48u). Pas de
        tekst aan en dien een aanvraag in — je ziet hieronder de status en krijgt
        bericht zodra Frontlix reageert.
      </div>

      {/* Tab-strip per hoofddienst */}
      <div className={styles.tabs} role="tablist">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === activeKey}
            className={`${styles.tab} ${t.key === activeKey ? styles.tabActive : ''}`}
            onClick={() => setActiveKey(t.key)}
          >
            {t.tabLabel}
          </button>
        ))}
      </div>

      <InstTemplateBlock
        templateKey={active.key}
        value={drafts[activeKey]}
        defaultText={active.default}
        onChange={(next) => setDrafts((prev) => ({ ...prev, [activeKey]: next }))}
        variables={VARIABLES}
        makePreview={makePreview}
        aanvragen={aanvragen.filter((a) => a.template_naam === active.key)}
        label="Template-tekst"
      />
    </div>
  )
}
