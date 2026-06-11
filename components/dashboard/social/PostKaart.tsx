'use client'

// De goedkeuringskaart per post. Toont beeldpreview, de captions per kanaal
// (CaptionTabs), de status, de geplande datum, en de actieknoppen:
// goedkeuren, bewerken (inline via CaptionTabs), beeld vervangen, afkeuren,
// verplaatsen. Alle schrijf-acties lopen via de Server Actions uit
// lib/dashboard/social-actions; die volgen het ActionResult-patroon
// (nooit gooien) en revalidaten /social op layout-scope zodat de
// sidebar-badge meeloopt.

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  XCircle,
  ImageIcon,
  CalendarClock,
  Film,
  Image as ImageLucide,
  Sparkles,
  Clock,
} from 'lucide-react'
import { PostStatusBadge } from './PostStatusBadge'
import { CaptionTabs } from './CaptionTabs'
import {
  keurPostGoed,
  weigerPost,
  verplaatsPost,
} from '@/lib/dashboard/social-actions'
import type {
  SocialPostMetVarianten,
} from '@/lib/dashboard/social-queries'
import type { SocialStatus, SocialPijler } from '@/lib/dashboard/social-types'
import styles from './PostKaart.module.css'

// Pijler-labels (Nederlands) voor de chip linksboven.
const PIJLER_LABEL: Record<SocialPijler, string> = {
  voor_na:          'Voor en na',
  tip_educatie:     'Tip',
  social_proof:     'Review',
  achter_schermen:  'Achter de schermen',
  seizoen_lokaal:   'Seizoen',
  aanbod_cta:       'Aanbod',
}

// Statussen waarin bewerken/akkoord nog zinvol is.
const NOG_TE_BEHANDELEN: ReadonlySet<SocialStatus> = new Set([
  'concept',
  'ter_goedkeuring',
])

function formatGeplandeDatum(iso: string): string {
  // geplande_datum staat als UTC in de DB; toon in Amsterdamse tijd.
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}

export function PostKaart({ post }: { post: SocialPostMetVarianten }) {
  const status = post.status as SocialStatus
  const bewerkbaar = NOG_TE_BEHANDELEN.has(status)
  const kanGoedgekeurd = status === 'ter_goedkeuring' || status === 'mislukt'

  const [fout, setFout] = useState<string | null>(null)
  const [weigerOpen, setWeigerOpen] = useState(false)
  const [verplaatsOpen, setVerplaatsOpen] = useState(false)
  const [reden, setReden] = useState('')
  const [nieuweDatum, setNieuweDatum] = useState('')
  const [pending, start] = useTransition()

  const goedkeuren = () => {
    setFout(null)
    start(async () => {
      const res = await keurPostGoed(post.id)
      if (!res.ok) setFout(res.error)
    })
  }

  const afkeuren = () => {
    setFout(null)
    start(async () => {
      const res = await weigerPost(post.id, reden.trim())
      if (res.ok) {
        setWeigerOpen(false)
        setReden('')
      } else {
        setFout(res.error)
      }
    })
  }

  const verplaatsen = () => {
    setFout(null)
    if (!nieuweDatum) {
      setFout('Kies eerst een nieuwe datum en tijd')
      return
    }
    start(async () => {
      // datetime-local levert lokale tijd zonder zone; we sturen de ISO door
      // en de Server Action converteert naar UTC (B2 uit het draaiboek).
      const res = await verplaatsPost(post.id, new Date(nieuweDatum).toISOString())
      if (res.ok) {
        setVerplaatsOpen(false)
        setNieuweDatum('')
      } else {
        setFout(res.error)
      }
    })
  }

  const ContentTypeIcon =
    post.content_type === 'video'
      ? Film
      : post.content_type === 'graphic'
        ? Sparkles
        : ImageLucide

  const isVideo = post.content_type === 'video'

  return (
    <div className="dash-card">
      {/* ── Beeldpreview ──────────────────────────────────── */}
      <div className={styles.media}>
        {post.visual_url ? (
          isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={post.visual_url}
              className={styles.mediaEl}
              controls
              preload="metadata"
            />
          ) : (
            // Bewust een gewone img, niet next/image: de bron is een
            // signed Storage-URL met onbekend domein en korte levensduur,
            // die hoeft niet door de Next-image-optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.visual_url}
              alt={`Beeld voor de ${PIJLER_LABEL[post.pijler as SocialPijler] ?? 'post'}`}
              className={styles.mediaEl}
              loading="lazy"
            />
          )
        ) : (
          <div className={styles.mediaLeeg}>
            <ImageIcon size={28} aria-hidden="true" />
            <span>Beeld volgt</span>
          </div>
        )}

        {/* Chip linksboven: pijler plus content-type */}
        <div className={styles.mediaChip}>
          <ContentTypeIcon size={12} aria-hidden="true" />
          <span>{PIJLER_LABEL[post.pijler as SocialPijler] ?? post.pijler}</span>
        </div>
      </div>

      {/* ── Kop: status plus geplande datum ───────────────── */}
      <div className={styles.kop}>
        <PostStatusBadge status={status} />
        <span className={styles.datum}>
          <CalendarClock size={13} aria-hidden="true" />
          {formatGeplandeDatum(post.geplande_datum)}
        </span>
      </div>

      {/* ── Captions per kanaal ───────────────────────────── */}
      <div className={styles.captions}>
        <CaptionTabs varianten={post.social_post_varianten} bewerkbaar={bewerkbaar} />
      </div>

      {/* ── Foutmelding (inline, nooit een throw) ─────────── */}
      {fout && <div className={styles.fout}>{fout}</div>}

      {/* ── Verplaats-paneel ──────────────────────────────── */}
      {verplaatsOpen && (
        <div className={styles.subPaneel}>
          <label className={styles.subLabel}>Nieuwe datum en tijd</label>
          <input
            type="datetime-local"
            className={styles.subInput}
            value={nieuweDatum}
            onChange={(e) => setNieuweDatum(e.target.value)}
          />
          <div className={styles.subActies}>
            <button
              type="button"
              className="dash-btn dash-btn-primary dash-btn-sm"
              onClick={verplaatsen}
              disabled={pending}
            >
              {pending ? 'Verplaatsen...' : 'Verplaats'}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn-ghost dash-btn-sm"
              onClick={() => setVerplaatsOpen(false)}
              disabled={pending}
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* ── Afkeur-paneel ─────────────────────────────────── */}
      {weigerOpen && (
        <div className={styles.subPaneel}>
          <label className={styles.subLabel}>Waarom afkeuren? (optioneel)</label>
          <textarea
            className={styles.subTextarea}
            value={reden}
            onChange={(e) => setReden(e.target.value)}
            rows={2}
            placeholder="Bijv. verkeerde foto, of caption moet anders"
          />
          <div className={styles.subActies}>
            <button
              type="button"
              className="dash-btn dash-btn-primary dash-btn-sm"
              onClick={afkeuren}
              disabled={pending}
            >
              {pending ? 'Afkeuren...' : 'Afkeuren'}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn-ghost dash-btn-sm"
              onClick={() => setWeigerOpen(false)}
              disabled={pending}
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* ── Hoofd-actiebalk ───────────────────────────────── */}
      <div className={styles.acties}>
        {kanGoedgekeurd && (
          <button
            type="button"
            className="dash-btn dash-btn-primary dash-btn-sm"
            onClick={goedkeuren}
            disabled={pending}
          >
            <CheckCircle2 size={13} />
            {pending ? 'Bezig...' : status === 'mislukt' ? 'Opnieuw proberen' : 'Akkoord'}
          </button>
        )}

        {bewerkbaar && (
          <button
            type="button"
            className="dash-btn dash-btn-secondary dash-btn-sm"
            disabled
            title="Beeld vervangen, kies een ander item uit de contentbank (binnenkort)"
          >
            <ImageIcon size={13} />
            Beeld vervangen
          </button>
        )}

        {bewerkbaar && (
          <button
            type="button"
            className="dash-btn dash-btn-secondary dash-btn-sm"
            onClick={() => {
              setVerplaatsOpen((v) => !v)
              setWeigerOpen(false)
            }}
          >
            <Clock size={13} />
            Verplaats
          </button>
        )}

        {bewerkbaar && (
          <button
            type="button"
            className={`dash-btn dash-btn-ghost dash-btn-sm ${styles.weigerBtn}`}
            onClick={() => {
              setWeigerOpen((v) => !v)
              setVerplaatsOpen(false)
            }}
          >
            <XCircle size={13} />
            Afkeuren
          </button>
        )}
      </div>

      {/* Reden van afwijzing, zichtbaar zodra de post is afgekeurd */}
      {status === 'afgewezen' && post.afgewezen_reden && (
        <div className={styles.afwijsReden}>
          Afgekeurd: {post.afgewezen_reden}
        </div>
      )}
    </div>
  )
}
