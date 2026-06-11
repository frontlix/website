'use client'

// Per-kanaal captionweergave met inline bewerken. Eén tab per ingeschakeld
// platform; per tab de caption (en bij YouTube de aparte titel). De klant kan
// een kanaal aan/uit zetten en de caption bewerken. Schrijven gaat via de
// Server Actions uit lib/dashboard/social-actions (bewerkCaption,
// toggleKanaal); die updaten ook de Postiz-post als er al een batch loopt.

import { useState, useTransition } from 'react'
import {
  Facebook,
  Instagram,
  Youtube,
  MapPin,
  Music2,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { bewerkCaption, toggleKanaal } from '@/lib/dashboard/social-actions'
import type { SocialPostVariant, SocialPlatform } from '@/lib/dashboard/social-types'
import styles from './CaptionTabs.module.css'

// Platform-meta: label plus icon plus zachte limiet-hint. De limieten komen
// uit de huisstijl-prompt in sectie 7 van het draaiboek (alleen als hint,
// de harde check zit in social-ai.ts en preflight.py).
const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; Icon: typeof Facebook; hint: string }
> = {
  facebook:        { label: 'Facebook',  Icon: Facebook,  hint: 'tot ca. 400 tekens voor de afbreek' },
  instagram:       { label: 'Instagram', Icon: Instagram, hint: 'eerste 125 tekens zijn de hook' },
  tiktok:          { label: 'TikTok',    Icon: Music2,    hint: 'eerste 100 tekens zichtbaar' },
  youtube:         { label: 'YouTube',   Icon: Youtube,   hint: 'titel max 70 tekens, verplicht' },
  google_business: { label: 'Google',    Icon: MapPin,    hint: 'feitelijk, geen hashtags, max 1500' },
}

const PLATFORM_VOLGORDE: ReadonlyArray<SocialPlatform> = [
  'google_business',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
]

// Bewerken is alleen zinvol zolang de post nog niet definitief gepubliceerd
// of ingetrokken is. De pagina geeft `bewerkbaar` door.
export function CaptionTabs({
  varianten,
  bewerkbaar,
}: {
  varianten: SocialPostVariant[]
  bewerkbaar: boolean
}) {
  // Sorteer op de vaste platform-volgorde zodat de tabs stabiel staan,
  // ongeacht de DB-volgorde.
  const gesorteerd = [...varianten].sort(
    (a, b) =>
      PLATFORM_VOLGORDE.indexOf(a.platform as SocialPlatform) -
      PLATFORM_VOLGORDE.indexOf(b.platform as SocialPlatform),
  )

  const [actief, setActief] = useState<string>(gesorteerd[0]?.id ?? '')
  const huidige = gesorteerd.find((v) => v.id === actief) ?? gesorteerd[0]

  if (!huidige) {
    return <div className={styles.geenKanalen}>Nog geen kanalen ingesteld</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist">
        {gesorteerd.map((v) => {
          const meta = PLATFORM_META[v.platform as SocialPlatform]
          const Icon = meta?.Icon ?? MapPin
          const uit = !v.ingeschakeld
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === actief}
              className={`${styles.tab} ${v.id === actief ? styles.tabActief : ''} ${
                uit ? styles.tabUit : ''
              }`}
              onClick={() => setActief(v.id)}
              title={uit ? `${meta?.label}, staat uit` : meta?.label}
            >
              <Icon size={14} aria-hidden="true" />
              <span className={styles.tabLabel}>{meta?.label ?? v.platform}</span>
            </button>
          )
        })}
      </div>

      <CaptionPaneel
        key={huidige.id}
        variant={huidige}
        bewerkbaar={bewerkbaar}
      />
    </div>
  )
}

function CaptionPaneel({
  variant,
  bewerkbaar,
}: {
  variant: SocialPostVariant
  bewerkbaar: boolean
}) {
  const meta = PLATFORM_META[variant.platform as SocialPlatform]
  const isYouTube = variant.platform === 'youtube'

  const [bewerkt, setBewerkt] = useState(false)
  const [caption, setCaption] = useState(variant.caption)
  const [titel, setTitel] = useState(variant.youtube_titel ?? '')
  const [fout, setFout] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const opslaan = () => {
    setFout(null)
    // YouTube-titel is verplicht zodra YouTube ingeschakeld is (B6 uit het
    // draaiboek). We blokkeren hier al, zodat de Server Action niet onnodig
    // faalt.
    if (isYouTube && variant.ingeschakeld && titel.trim() === '') {
      setFout('YouTube-titel is verplicht zolang YouTube aan staat')
      return
    }
    start(async () => {
      const res = await bewerkCaption(
        variant.id,
        caption.trim(),
        isYouTube ? titel.trim() : undefined,
      )
      if (res.ok) {
        setBewerkt(false)
      } else {
        setFout(res.error)
      }
    })
  }

  const annuleer = () => {
    setCaption(variant.caption)
    setTitel(variant.youtube_titel ?? '')
    setFout(null)
    setBewerkt(false)
  }

  const wisselKanaal = () => {
    setFout(null)
    start(async () => {
      const res = await toggleKanaal(variant.id, !variant.ingeschakeld)
      if (!res.ok) setFout(res.error)
    })
  }

  return (
    <div className={styles.paneel}>
      <div className={styles.paneelKop}>
        <span className={styles.hint}>{meta?.hint}</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={variant.ingeschakeld}
            onChange={wisselKanaal}
            disabled={pending || !bewerkbaar}
          />
          <span>{variant.ingeschakeld ? 'Aan' : 'Uit'}</span>
        </label>
      </div>

      {isYouTube && (
        <div className={styles.titelRij}>
          <span className={styles.titelLabel}>Titel</span>
          {bewerkt ? (
            <input
              type="text"
              className={styles.titelInput}
              value={titel}
              maxLength={70}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Verplicht voor YouTube"
            />
          ) : (
            <span className={styles.titelTekst}>
              {variant.youtube_titel || (
                <em className={styles.ontbreekt}>Titel ontbreekt nog</em>
              )}
            </span>
          )}
        </div>
      )}

      {bewerkt ? (
        <textarea
          className={styles.textarea}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
        />
      ) : (
        <p className={styles.captionTekst}>{variant.caption}</p>
      )}

      {fout && <div className={styles.fout}>{fout}</div>}

      {bewerkbaar && (
        <div className={styles.acties}>
          {bewerkt ? (
            <>
              <button
                type="button"
                className="dash-btn dash-btn-primary dash-btn-sm"
                onClick={opslaan}
                disabled={pending}
              >
                <Check size={13} />
                {pending ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-ghost dash-btn-sm"
                onClick={annuleer}
                disabled={pending}
              >
                <X size={13} />
                Annuleer
              </button>
            </>
          ) : (
            <button
              type="button"
              className="dash-btn dash-btn-secondary dash-btn-sm"
              onClick={() => setBewerkt(true)}
            >
              <Pencil size={13} />
              Tekst bewerken
            </button>
          )}
        </div>
      )}
    </div>
  )
}
