'use client'

import { Mail, FileText, Check, Square } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { formatEuro } from '@/lib/dashboard/format'
import {
  type ManualOfferteData,
  type RegelComputed,
  type TotalsComputed,
  type SendKanaal,
  DIENST_LABELS,
} from '@/lib/dashboard/manual-offerte-types'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

// WhatsApp + Beide bewust verwijderd: WhatsApp-verzending vereist
// goedgekeurde Meta-templates met PDF-bijlage, en dat is op dit moment
// nog niet ingericht. Klant kan kiezen tussen e-mail met bijlage of
// zelf de PDF downloaden en doorsturen.
const KANAAL_OPTIES: ReadonlyArray<{
  k: SendKanaal
  l: string
  sub: string
  Icon: typeof Mail
  style?: 'primary' | 'alt'
}> = [
  { k: 'mail',   l: 'E-mail',           sub: 'met PDF bijlage',   Icon: Mail,     style: 'primary' },
  { k: 'manual', l: 'Alleen download',  sub: 'PDF zelf opsturen', Icon: FileText, style: 'alt' },
]

export function StepVersturen({
  data,
  set,
  rules,
  totals,
}: {
  data: ManualOfferteData
  set: SetFn
  rules: RegelComputed[]
  totals: TotalsComputed
}) {
  const naam = data.naam || 'Klant'
  const adres = `${data.straat || ''} ${data.huisnummer || ''}${data.postcode ? ', ' + data.postcode : ''} ${data.plaats || ''}`.trim() || '—'

  return (
    <>
      <div>
        <div className={styles.sectionLabel}>Klaar om te versturen?</div>
        <div className={styles.sectionSub}>
          Surface stuurt de PDF binnen 60 seconden via je gekozen kanaal, kies e-mail met bijlage of download zelf en stuur &lsquo;m handmatig door.
        </div>
      </div>

      {/* Summary card */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryHead}>
          <div className={styles.summaryIdent}>
            <Avatar name={naam} size="lg" />
            <div>
              <div className={styles.summaryName}>{naam}</div>
              <div className={styles.summaryMeta}>{adres}</div>
              <div className={styles.summaryMeta}>
                {data.telefoon}
                {data.email && ' · ' + data.email}
              </div>
            </div>
          </div>
          <div className={styles.summaryTotaal}>
            <div className={styles.summaryTotaalLabel}>Totaal incl. BTW</div>
            <div className={styles.summaryTotaalValue}>{formatEuro(totals.total + totals.btw)}</div>
          </div>
        </div>
        <div className={styles.summaryFacts}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Square size={12} /> {data.m2} m²
          </span>
          <span>·</span>
          <span>{data.sub.map((s) => DIENST_LABELS[s]).join(' + ')}</span>
          <span>·</span>
          <span>{rules.length} offerte-regels</span>
        </div>
      </div>

      {/* Notitie */}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Begeleidende notitie voor klant (optioneel)</label>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="Bv. Beste Jan, fijn dat we elkaar even hebben gesproken. Hierbij de offerte zoals afgesproken, je hoort het wel."
          value={data.notitie}
          onChange={(e) => set('notitie', e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
          Deze tekst staat boven de PDF en wordt als WhatsApp-bericht meegestuurd.
        </div>
      </div>

      {/* Kanaal-selectie */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Versturen via</div>
        <div className={styles.kanaalGrid}>
          {KANAAL_OPTIES.map((c) => {
            const active = data.kanaal === c.k
            const styleClass =
              c.style === 'primary' || active ? styles.kanaalBtnPrimary :
              c.style === 'alt'                 ? styles.kanaalBtnAlt :
              ''
            return (
              <button
                key={c.k}
                type="button"
                onClick={() => set('kanaal', c.k)}
                className={`${styles.kanaalBtn} ${styleClass}`}
                aria-pressed={active}
              >
                <c.Icon size={20} />
                <span className={styles.kanaalLabel}>{c.l}</span>
                <span className={styles.kanaalSub}>{c.sub}</span>
              </button>
            )
          })}
        </div>
        <div className={styles.kanaalHint}>
          <strong>&ldquo;Alleen download&rdquo;</strong> is handig als je de klant zelf wil contacteren (bijv. via persoonlijke e-mail of langs laten lopen). De PDF wordt naar je downloads-map opgeslagen, geen mail verstuurd.
        </div>
      </div>

      <div className={styles.readyBanner}>
        <Check size={16} className={styles.readyBannerIcon} />
        <div>
          <div className={styles.readyTitle}>Klaar om te versturen</div>
          <div className={styles.readyBody}>
            Na verzenden wordt de klant aangemaakt als lead, ontvang je notificaties bij elke reactie, en kun je &lsquo;m volgen via de Pipeline.
          </div>
        </div>
      </div>
    </>
  )
}
