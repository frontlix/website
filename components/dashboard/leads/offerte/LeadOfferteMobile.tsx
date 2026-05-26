'use client'

/**
 * LeadOfferteMobile — mobile-only variant van de Offerte-tab in lead-detail.
 *
 * Volledig parallelle render-tree naast de desktop (OfferteRegelsTable + OfferteSidebar).
 * Parent (LeadOfferte) bepaalt welke tree mount via useIsMobile-hook — beide
 * delen geen state.
 *
 * Layout:
 *  - BronRow (samenvatting lead-data + Bewerk → BronSheet)
 *  - Groep-kaarten (gegroepeerde auto-regels) — tap regel → EditRuleSheet
 *  - Extra-regel knop → AddCustomSheet
 *  - Tile-rij (Korting + Verzendopties) → eigen sheets
 *  - Subtotaal-blok (rekening-overzicht)
 *  - Sticky bottom-bar (totaal incl. + PDF + WhatsApp verstuur)
 *
 * State:
 *  - regels: lokale RegelEdit[]-state, gesynced naar parent via onRegelsChange.
 *  - korting + verzendopties komen via props van parent (single source of truth).
 *  - BronSheet schrijft direct naar lead via updateLeadFields; auto-regels worden
 *    server-side geregenereerd en via router.refresh() opnieuw binnengehaald.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  MessageCircle,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import type { Lead, Prijsregel } from '@/lib/dashboard/database.types'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import { formatEuro } from '@/lib/dashboard/format'
import { updateLeadFields, type LeadEditPatch } from '@/lib/dashboard/lead-actions'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'
import type { VerzendOpties } from './VerzendoptiesKaart'
import styles from './LeadOfferteMobile.module.css'

// ─── Types ────────────────────────────────────────────────────────────────

export type RegelEdit = {
  uid: string
  id?: string
  bron: 'auto_lead' | 'manual'
  omschrijving: string
  aantal: string
  eenheid: string
  stukprijs: string
}

type GroupDef = {
  k: string
  label: string
  icon: string
  // Pure pattern-match op omschrijving voor groepering van auto-regels.
  match: (omschrijving: string) => boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseDecimal(input: string): number {
  if (!input) return 0
  const n = Number.parseFloat(input.replace(',', '.').trim())
  return Number.isFinite(n) ? n : 0
}

function numToInputString(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace('.', ',')
}

function makeUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function mapToEdit(regel: Prijsregel): RegelEdit {
  return {
    uid: regel.id ?? makeUid(),
    id: regel.id,
    bron: regel.bron === 'auto_lead' ? 'auto_lead' : 'manual',
    omschrijving: regel.omschrijving ?? '',
    aantal: numToInputString(regel.aantal),
    eenheid: regel.eenheid ?? '',
    stukprijs: numToInputString(regel.stukprijs),
  }
}

function regelTotaal(r: RegelEdit): number {
  return parseDecimal(r.aantal) * parseDecimal(r.stukprijs)
}

// Bouw "150 m² × € 3,95" — zelfde stijl als desktop mobile-summary.
function buildMeta(r: RegelEdit): string {
  const parts: string[] = []
  const a = r.aantal?.trim()
  const e = r.eenheid?.trim()
  if (a) parts.push(e ? `${a} ${e}` : a)
  else if (e) parts.push(e)
  const s = parseDecimal(r.stukprijs)
  if (s > 0) parts.push(`× ${formatEuro(s)}`)
  return parts.join(' ')
}

// Strip de groep-prefix uit een sub-regel-omschrijving (de groep-kop toont 'm al).
function shortenDesc(desc: string, groupKey: string): string {
  if (groupKey === 'invegen') {
    return desc.replace(/^Invegen[\s—\-:]+/i, '')
  }
  return desc
}

// Bouw de korte samenvatting voor de BronRow op basis van lead-velden.
function buildBronDesc(lead: Lead): string {
  const parts: string[] = []
  if (lead.m2 != null) parts.push(`${lead.m2} m²`)
  if (lead.voegzand_type) {
    const kleur =
      lead.zand_kleur ||
      (lead.zand_kleur_antraciet ? 'antraciet' : '') ||
      (lead.zand_kleur_naturel ? 'naturel' : '')
    parts.push(kleur ? `${lead.voegzand_type} ${kleur}` : String(lead.voegzand_type))
  }
  return parts.join(' · ')
}

// ─── Groep-definities ─────────────────────────────────────────────────────
//
// Hardcoded volgorde — eerste hit wint. Onbekende auto-regels vallen in
// "Overig" (catch-all aan het einde, opgebouwd in render).

const AUTO_GROUPS: GroupDef[] = [
  {
    k: 'invegen',
    label: 'Invegen straatwerk',
    icon: '🧹',
    match: (o) => /reiniging|invegen|arbeid|voegzand/i.test(o),
  },
  {
    k: 'beschermlaag',
    label: 'Beschermlaag impregneren',
    icon: '🛡️',
    match: (o) => /beschermlaag|impregner/i.test(o),
  },
  {
    k: 'planten',
    label: 'Planten beschermen',
    icon: '🌿',
    match: (o) => /planten|folie/i.test(o),
  },
  {
    k: 'reis',
    label: 'Reiskosten',
    icon: '🚗',
    match: (o) => /reis|kilometer/i.test(o),
  },
]

const OVERIG_GROUP: GroupDef = {
  k: 'overig',
  label: 'Overig',
  icon: '📋',
  match: () => false,
}

const MANUAL_GROUP: GroupDef = {
  k: 'manual',
  label: 'Eigen regels',
  icon: '✏️',
  match: () => false,
}

// ─── Component ────────────────────────────────────────────────────────────

type Props = {
  leadId: string
  lead: Lead
  initialRegels: Prijsregel[]
  fotosCount: number
  kortingPct: number
  kortingOmschrijving: string
  verzendOpties: VerzendOpties
  onRegelsChange: (regels: RegelEdit[]) => void
  onKortingChange: (pct: number, omschrijving: string) => void
  onVerzendOptiesChange: (opts: VerzendOpties) => void
  onPdfClick: () => void
  onSendClick: () => void
}

export function LeadOfferteMobile({
  leadId,
  lead,
  initialRegels,
  fotosCount,
  kortingPct,
  kortingOmschrijving,
  verzendOpties,
  onRegelsChange,
  onKortingChange,
  onVerzendOptiesChange,
  onPdfClick,
  onSendClick,
}: Props) {
  // ─── State ────────────────────────────────────────────────
  const [regels, setRegels] = useState<RegelEdit[]>(() => initialRegels.map(mapToEdit))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [addingCustom, setAddingCustom] = useState(false)
  const [kortingOpen, setKortingOpen] = useState(false)
  const [verzendOpen, setVerzendOpen] = useState(false)
  const [bronOpen, setBronOpen] = useState(false)

  // ─── Sync internal regels naar parent ─────────────────────
  const onChangeRef = useRef(onRegelsChange)
  useEffect(() => {
    onChangeRef.current = onRegelsChange
  }, [onRegelsChange])
  useEffect(() => {
    onChangeRef.current?.(regels)
  }, [regels])

  // ─── Re-seed bij prop-changes (na router.refresh van BronSheet) ────
  // Fingerprint vergelijkt alleen wat de server zegt — onze interne edits
  // worden bewust niet weggegooid bij elke parent-rerender, alleen als de
  // server-data daadwerkelijk verandert.
  const initialFp = useMemo(
    () =>
      initialRegels
        .map((r) => `${r.id}|${r.aantal}|${r.stukprijs}|${r.bron}|${r.omschrijving}`)
        .join('||'),
    [initialRegels],
  )
  // Skip first render — initial state al goed.
  const isFirstFpRef = useRef(true)
  useEffect(() => {
    if (isFirstFpRef.current) {
      isFirstFpRef.current = false
      return
    }
    setRegels(initialRegels.map(mapToEdit))
  }, [initialFp]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mutators ─────────────────────────────────────────────
  const updateRegel = useCallback((uid: string, patch: Partial<RegelEdit>) => {
    setRegels((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }, [])

  const removeRegel = useCallback((uid: string) => {
    setRegels((prev) => prev.filter((r) => r.uid !== uid))
  }, [])

  const addCustom = useCallback((newReg: Omit<RegelEdit, 'uid' | 'bron'>) => {
    setRegels((prev) => [...prev, { ...newReg, uid: makeUid(), bron: 'manual' }])
  }, [])

  // ─── Groepering ───────────────────────────────────────────
  // Bouw per groep: items + totaal + meta-tekst voor de header.
  const groupedView = useMemo(() => {
    const auto = regels.filter((r) => r.bron === 'auto_lead')
    const manual = regels.filter((r) => r.bron === 'manual')

    const groups: Array<{ group: GroupDef; items: RegelEdit[]; total: number; meta: string }> = []
    const matched = new Set<string>()

    AUTO_GROUPS.forEach((g) => {
      const items = auto.filter((r) => g.match(r.omschrijving))
      if (items.length === 0) return
      items.forEach((r) => matched.add(r.uid))
      const total = items.reduce((s, r) => s + regelTotaal(r), 0)

      let meta = ''
      if (g.k === 'invegen') {
        const m2 = lead.m2 != null ? `${lead.m2} m²` : ''
        const vt = lead.voegzand_type ? ` · ${lead.voegzand_type}` : ''
        const kl = lead.zand_kleur ? ` ${lead.zand_kleur}` : ''
        meta = (m2 + vt + kl).trim()
      } else if (g.k === 'beschermlaag') {
        meta = lead.beschermlaag_m2 != null ? `${lead.beschermlaag_m2} m²` : lead.m2 != null ? `${lead.m2} m²` : ''
      } else if (g.k === 'planten') {
        const first = items[0]
        meta = first?.aantal ? `${first.aantal} ${first.eenheid || ''}`.trim() : 'folie'
      } else if (g.k === 'reis') {
        meta = lead.afstand_km != null ? `${lead.afstand_km} km` : ''
      }
      groups.push({ group: g, items, total, meta })
    })

    // Catch-all voor auto-regels die geen groep matchen
    const unmatched = auto.filter((r) => !matched.has(r.uid))
    if (unmatched.length > 0) {
      const total = unmatched.reduce((s, r) => s + regelTotaal(r), 0)
      groups.push({
        group: OVERIG_GROUP,
        items: unmatched,
        total,
        meta: `${unmatched.length} ${unmatched.length === 1 ? 'regel' : 'regels'}`,
      })
    }

    if (manual.length > 0) {
      const total = manual.reduce((s, r) => s + regelTotaal(r), 0)
      groups.push({
        group: MANUAL_GROUP,
        items: manual,
        total,
        meta: `${manual.length} ${manual.length === 1 ? 'regel' : 'regels'}`,
      })
    }

    return groups
  }, [regels, lead])

  // ─── Totalen voor sticky bar ──────────────────────────────
  const totalen = useMemo(
    () => berekenTotalen(regels.map((r) => regelTotaal(r)), kortingPct),
    [regels, kortingPct],
  )

  const editingRegel = useMemo(
    () => regels.find((r) => r.uid === editingUid) ?? null,
    [regels, editingUid],
  )

  const heeftRegels = regels.length > 0
  const bronDesc = buildBronDesc(lead)

  return (
    <div className={styles.container}>
      {/* ─── BRON ROW ─── */}
      <div className={styles.bronRow}>
        <div className={styles.bronRowIcon} aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div className={styles.bronRowContent}>
          <div className={styles.bronRowLabel}>Gegenereerd uit lead-data</div>
          <div className={styles.bronRowDesc}>{bronDesc || 'Nog geen lead-data ingevuld'}</div>
        </div>
        <button
          type="button"
          className={styles.bronRowEdit}
          onClick={() => setBronOpen(true)}
        >
          Bewerk
        </button>
      </div>

      {/* ─── GROUPS ─── */}
      {groupedView.map(({ group, items, total, meta }) => {
        const isOpen = !(collapsed[group.k] ?? false)
        return (
          <div key={group.k} className={styles.group}>
            <button
              type="button"
              className={styles.groupHeader}
              onClick={() => setCollapsed((p) => ({ ...p, [group.k]: !!isOpen }))}
              aria-expanded={isOpen}
            >
              <span className={styles.groupIcon} aria-hidden="true">{group.icon}</span>
              <div className={styles.groupTitleWrap}>
                <span className={styles.groupTitle}>{group.label}</span>
                {meta && <span className={styles.groupMeta}>{meta}</span>}
              </div>
              <span className={styles.groupTotal}>{formatEuro(total)}</span>
              <ChevronDown
                size={16}
                className={`${styles.groupChevron} ${isOpen ? styles.groupChevronOpen : ''}`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className={styles.groupItems}>
                {items.map((r) => (
                  <button
                    key={r.uid}
                    type="button"
                    className={styles.rule}
                    onClick={() => setEditingUid(r.uid)}
                  >
                    <div className={styles.ruleContent}>
                      <span className={styles.ruleDesc}>
                        {shortenDesc(r.omschrijving, group.k) || '—'}
                      </span>
                      {buildMeta(r) && <span className={styles.ruleMeta}>{buildMeta(r)}</span>}
                    </div>
                    <span className={styles.ruleAmount}>{formatEuro(regelTotaal(r))}</span>
                    <ChevronRight size={14} className={styles.ruleArrow} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* ─── ADD CUSTOM ─── */}
      <button
        type="button"
        className={styles.addCustomBtn}
        onClick={() => setAddingCustom(true)}
      >
        <Plus size={16} aria-hidden="true" />
        Extra regel toevoegen
      </button>

      {/* ─── TILES ─── */}
      <div className={styles.tiles}>
        <button
          type="button"
          className={styles.tile}
          onClick={() => setKortingOpen(true)}
        >
          <span className={styles.tileIcon} aria-hidden="true">
            <Tag size={16} />
          </span>
          <div className={styles.tileContent}>
            <span className={styles.tileLabel}>Korting</span>
            <span className={styles.tileValue}>
              {kortingPct > 0
                ? kortingOmschrijving
                  ? `${kortingPct}% — ${kortingOmschrijving}`
                  : `${kortingPct}%`
                : 'Geen'}
            </span>
          </div>
          <ChevronRight size={14} className={styles.tileArrow} aria-hidden="true" />
        </button>

        <button
          type="button"
          className={styles.tile}
          onClick={() => setVerzendOpen(true)}
        >
          <span className={styles.tileIcon} aria-hidden="true">
            <Send size={16} />
          </span>
          <div className={styles.tileContent}>
            <span className={styles.tileLabel}>Verzendopties</span>
            <span className={styles.tileValue}>
              {verzendOpties.geldigheidDagen} dgn
              {verzendOpties.metGarantie ? ' · garantie' : ''}
              {verzendOpties.metFotos && fotosCount > 0 ? ` · ${fotosCount} foto's` : ''}
            </span>
          </div>
          <ChevronRight size={14} className={styles.tileArrow} aria-hidden="true" />
        </button>
      </div>

      {/* ─── SUBTOTAAL ─── */}
      <div className={styles.subtotaal}>
        <div className={styles.subRow}>
          <span className={styles.subLabel}>Subtotaal</span>
          <span className={styles.subValue}>{formatEuro(totalen.subtotaalExcl)}</span>
        </div>
        {kortingPct > 0 && totalen.kortingBedrag > 0 && (
          <div className={styles.subRow}>
            <span className={styles.subLabel}>Korting ({kortingPct}%)</span>
            <span className={`${styles.subValue} ${styles.subValueDiscount}`}>
              − {formatEuro(totalen.kortingBedrag)}
            </span>
          </div>
        )}
        <div className={styles.subRow}>
          <span className={styles.subLabel}>BTW {totalen.btwPercentage}%</span>
          <span className={styles.subValue}>{formatEuro(totalen.btw)}</span>
        </div>
      </div>

      {/* ─── STICKY BAR ─── */}
      <div className={styles.stickyBar}>
        <div className={styles.stickyTotal}>
          <span className={styles.stickyTotalLabel}>Totaal incl. BTW</span>
          <span className={styles.stickyTotalAmount}>{formatEuro(totalen.totaalIncl)}</span>
        </div>
        <div className={styles.stickyActions}>
          <button type="button" className={styles.stickyPdfBtn} onClick={onPdfClick}>
            <Eye size={14} aria-hidden="true" />
            PDF
          </button>
          <button
            type="button"
            className={`${styles.stickySendBtn} ${!heeftRegels ? styles.stickySendBtnDisabled : ''}`}
            onClick={heeftRegels ? onSendClick : undefined}
            disabled={!heeftRegels}
            aria-label="Verstuur via WhatsApp"
          >
            <MessageCircle size={14} aria-hidden="true" />
            Verstuur
          </button>
        </div>
      </div>

      {/* ─── SHEETS ─── */}
      <EditRuleSheet
        regel={editingRegel}
        onClose={() => setEditingUid(null)}
        onUpdate={updateRegel}
        onDelete={(uid) => {
          removeRegel(uid)
          setEditingUid(null)
        }}
      />

      <AddCustomSheet
        open={addingCustom}
        onClose={() => setAddingCustom(false)}
        onAdd={(reg) => {
          addCustom(reg)
          setAddingCustom(false)
        }}
      />

      <KortingSheet
        open={kortingOpen}
        kortingPct={kortingPct}
        kortingOmschrijving={kortingOmschrijving}
        onClose={() => setKortingOpen(false)}
        onChange={onKortingChange}
      />

      <VerzendSheet
        open={verzendOpen}
        opties={verzendOpties}
        fotosCount={fotosCount}
        onClose={() => setVerzendOpen(false)}
        onChange={onVerzendOptiesChange}
      />

      <BronSheet
        open={bronOpen}
        leadId={leadId}
        lead={lead}
        onClose={() => setBronOpen(false)}
      />
    </div>
  )
}

// ─── EditRuleSheet ─────────────────────────────────────────────────────────

type EditRuleSheetProps = {
  regel: RegelEdit | null
  onClose: () => void
  onUpdate: (uid: string, patch: Partial<RegelEdit>) => void
  onDelete: (uid: string) => void
}

function EditRuleSheet({ regel, onClose, onUpdate, onDelete }: EditRuleSheetProps) {
  const [omschrijving, setOmschrijving] = useState('')
  const [aantal, setAantal] = useState('')
  const [eenheid, setEenheid] = useState('')
  const [stukprijs, setStukprijs] = useState('')

  // Sync velden zodra een regel geselecteerd wordt.
  useEffect(() => {
    if (regel) {
      setOmschrijving(regel.omschrijving)
      setAantal(regel.aantal)
      setEenheid(regel.eenheid)
      setStukprijs(regel.stukprijs)
    }
  }, [regel])

  const isAuto = regel?.bron === 'auto_lead'

  const livePreview = useMemo(
    () => parseDecimal(aantal) * parseDecimal(stukprijs),
    [aantal, stukprijs],
  )

  if (!regel) {
    // Render gesloten sheet zonder children om mount/unmount-flicker te voorkomen.
    return <MobileSheet open={false} onClose={onClose}><span /></MobileSheet>
  }

  const handleSave = () => {
    onUpdate(regel.uid, {
      omschrijving: isAuto ? regel.omschrijving : omschrijving,
      aantal,
      eenheid,
      stukprijs,
    })
    onClose()
  }

  const stepperDec = () => {
    const n = parseDecimal(aantal)
    setAantal(numToInputString(Math.max(0, n - 1)))
  }
  const stepperInc = () => {
    const n = parseDecimal(aantal)
    setAantal(numToInputString(n + 1))
  }

  return (
    <MobileSheet
      open={true}
      onClose={onClose}
      title="Regel bewerken"
      footer={
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.sheetActionDelete}
            onClick={() => onDelete(regel.uid)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Verwijder
          </button>
          <button
            type="button"
            className={styles.sheetActionSave}
            onClick={handleSave}
          >
            <Save size={14} aria-hidden="true" />
            Opslaan
          </button>
        </div>
      }
    >
      <div className={styles.sheetSection}>
        <div className={styles.sheetTotalPreview}>
          <div className={styles.sheetTotalLeft}>
            <span className={styles.sheetTotalLabel}>Regel-totaal</span>
            <span className={styles.sheetTotalAmount}>{formatEuro(livePreview)}</span>
          </div>
          <span className={styles.sheetTotalMeta}>
            {parseDecimal(aantal) || 0} {eenheid} × {formatEuro(parseDecimal(stukprijs))}
          </span>
        </div>
      </div>

      {isAuto && (
        <div className={styles.sheetSection}>
          <div className={styles.sheetAutoNote}>
            <Info size={14} aria-hidden="true" />
            <span>Auto-regel uit lead-data. Wijzig om te overschrijven — auto-titels passen zich aan op lead-data.</span>
          </div>
        </div>
      )}

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Omschrijving</label>
          <input
            type="text"
            className={styles.sheetInput}
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            disabled={isAuto}
            readOnly={isAuto}
          />
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetGrid2}>
          <div className={styles.sheetField}>
            <label className={styles.sheetLabel}>Aantal</label>
            <div className={styles.sheetStepper}>
              <button type="button" className={styles.stepperBtn} onClick={stepperDec}>−</button>
              <input
                type="text"
                inputMode="decimal"
                className={styles.stepperValue}
                value={aantal}
                onChange={(e) => setAantal(e.target.value)}
                aria-label="Aantal"
              />
              <button type="button" className={styles.stepperBtn} onClick={stepperInc}>+</button>
            </div>
          </div>
          <div className={styles.sheetField}>
            <label className={styles.sheetLabel}>Eenheid</label>
            <input
              type="text"
              className={styles.sheetInput}
              value={eenheid}
              onChange={(e) => setEenheid(e.target.value)}
              placeholder="m², stuk, zak…"
            />
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>
            Prijs per {eenheid || 'eenheid'} (€)
          </label>
          <input
            type="text"
            inputMode="decimal"
            className={styles.sheetInput}
            value={stukprijs}
            onChange={(e) => setStukprijs(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>
    </MobileSheet>
  )
}

// ─── AddCustomSheet ───────────────────────────────────────────────────────

type AddCustomSheetProps = {
  open: boolean
  onClose: () => void
  onAdd: (reg: Omit<RegelEdit, 'uid' | 'bron'>) => void
}

function AddCustomSheet({ open, onClose, onAdd }: AddCustomSheetProps) {
  const [omschrijving, setOmschrijving] = useState('')
  const [aantal, setAantal] = useState('1')
  const [eenheid, setEenheid] = useState('stuk')
  const [stukprijs, setStukprijs] = useState('0')

  // Reset bij heropenen
  useEffect(() => {
    if (open) {
      setOmschrijving('')
      setAantal('1')
      setEenheid('stuk')
      setStukprijs('0')
    }
  }, [open])

  const livePreview = useMemo(
    () => parseDecimal(aantal) * parseDecimal(stukprijs),
    [aantal, stukprijs],
  )

  const canSave = omschrijving.trim().length > 0

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Nieuwe regel"
      footer={
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.sheetActionSave}
            disabled={!canSave}
            onClick={() => onAdd({ omschrijving, aantal, eenheid, stukprijs })}
          >
            <Plus size={14} aria-hidden="true" />
            Toevoegen
          </button>
        </div>
      }
    >
      <div className={styles.sheetSection}>
        <div className={styles.sheetTotalPreview}>
          <div className={styles.sheetTotalLeft}>
            <span className={styles.sheetTotalLabel}>Regel-totaal</span>
            <span className={styles.sheetTotalAmount}>{formatEuro(livePreview)}</span>
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Omschrijving</label>
          <input
            type="text"
            className={styles.sheetInput}
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Bijv. Meerwerk inrit"
            autoFocus
          />
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetGrid2}>
          <div className={styles.sheetField}>
            <label className={styles.sheetLabel}>Aantal</label>
            <input
              type="text"
              inputMode="decimal"
              className={styles.sheetInput}
              value={aantal}
              onChange={(e) => setAantal(e.target.value)}
            />
          </div>
          <div className={styles.sheetField}>
            <label className={styles.sheetLabel}>Eenheid</label>
            <input
              type="text"
              className={styles.sheetInput}
              value={eenheid}
              onChange={(e) => setEenheid(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Prijs per eenheid (€)</label>
          <input
            type="text"
            inputMode="decimal"
            className={styles.sheetInput}
            value={stukprijs}
            onChange={(e) => setStukprijs(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>
    </MobileSheet>
  )
}

// ─── KortingSheet ─────────────────────────────────────────────────────────

const KORTING_PRESETS = [0, 10, 20, 40] as const

type KortingSheetProps = {
  open: boolean
  kortingPct: number
  kortingOmschrijving: string
  onClose: () => void
  onChange: (pct: number, omschrijving: string) => void
}

function KortingSheet({ open, kortingPct, kortingOmschrijving, onClose, onChange }: KortingSheetProps) {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Korting"
      footer={
        <div className={styles.sheetActions}>
          <button type="button" className={styles.sheetActionSave} onClick={onClose}>
            Klaar
          </button>
        </div>
      }
    >
      <div className={styles.sheetSection}>
        <div className={styles.sheetTotalPreview}>
          <div className={styles.sheetTotalLeft}>
            <span className={styles.sheetTotalLabel}>Huidige korting</span>
            <span className={styles.sheetTotalAmount}>{kortingPct}%</span>
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Snelkeuze</label>
          <div className={styles.sheetPresets}>
            {KORTING_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.presetBtn} ${p === kortingPct ? styles.presetBtnActive : ''}`}
                onClick={() => onChange(p, kortingOmschrijving)}
                aria-pressed={p === kortingPct}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Schuif voor exact percentage</label>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={kortingPct}
            onChange={(e) => onChange(Number(e.target.value), kortingOmschrijving)}
            aria-label="Kortingspercentage"
          />
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Omschrijving</label>
          <input
            type="text"
            className={styles.sheetInput}
            value={kortingOmschrijving}
            onChange={(e) => onChange(kortingPct, e.target.value)}
            placeholder="Bijv. Kennismakingskorting"
          />
        </div>
      </div>
    </MobileSheet>
  )
}

// ─── VerzendSheet ─────────────────────────────────────────────────────────

const GELDIGHEID_PRESETS = [7, 14, 30, 60] as const

type VerzendSheetProps = {
  open: boolean
  opties: VerzendOpties
  fotosCount: number
  onClose: () => void
  onChange: (opties: VerzendOpties) => void
}

function VerzendSheet({ open, opties, fotosCount, onClose, onChange }: VerzendSheetProps) {
  // Toggle-rij: tap op de hele rij (label én switch) wisselt de waarde.
  // Spatie/Enter werken via role="switch" + aria-checked op het track-element.
  const toggleHandler = (key: keyof VerzendOpties) => () => {
    const cur = opties[key]
    if (typeof cur === 'boolean') {
      onChange({ ...opties, [key]: !cur })
    }
  }

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Verzendopties"
      footer={
        <div className={styles.sheetActions}>
          <button type="button" className={styles.sheetActionSave} onClick={onClose}>
            Klaar
          </button>
        </div>
      }
    >
      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Geldigheid (snelkeuze)</label>
          <div className={styles.sheetPresets}>
            {GELDIGHEID_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.presetBtn} ${d === opties.geldigheidDagen ? styles.presetBtnActive : ''}`}
                onClick={() => onChange({ ...opties, geldigheidDagen: d })}
                aria-pressed={d === opties.geldigheidDagen}
              >
                {d} dgn
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Exact aantal dagen</label>
          <input
            type="number"
            className={styles.sheetInput}
            min={1}
            max={365}
            value={opties.geldigheidDagen}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) {
                onChange({ ...opties, geldigheidDagen: Math.max(1, Math.min(365, n)) })
              }
            }}
          />
        </div>
      </div>

      <div className={styles.sheetSection}>
        <button
          type="button"
          className={styles.sheetToggleRow}
          onClick={toggleHandler('metGarantie')}
        >
          <span className={styles.sheetToggleLabel}>Garantie-tekst meesturen</span>
          <span
            className={styles.sheetToggle}
            role="switch"
            aria-checked={opties.metGarantie}
          />
        </button>
        <button
          type="button"
          className={styles.sheetToggleRow}
          onClick={toggleHandler('metVoorwaarden')}
        >
          <span className={styles.sheetToggleLabel}>Algemene voorwaarden</span>
          <span
            className={styles.sheetToggle}
            role="switch"
            aria-checked={opties.metVoorwaarden}
          />
        </button>
        <button
          type="button"
          className={styles.sheetToggleRow}
          onClick={toggleHandler('metFotos')}
          disabled={fotosCount === 0}
        >
          <span className={styles.sheetToggleLabel}>
            Foto&apos;s meesturen ({fotosCount})
          </span>
          <span
            className={styles.sheetToggle}
            role="switch"
            aria-checked={opties.metFotos && fotosCount > 0}
          />
        </button>
      </div>
    </MobileSheet>
  )
}

// ─── BronSheet ────────────────────────────────────────────────────────────

type BronSheetProps = {
  open: boolean
  leadId: string
  lead: Lead
  onClose: () => void
}

function BronSheet({ open, leadId, lead, onClose }: BronSheetProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [m2, setM2] = useState<string>(lead.m2 != null ? String(lead.m2) : '')
  const [voegzandType, setVoegzandType] = useState<string>(lead.voegzand_type ?? '')
  const [zandKleur, setZandKleur] = useState<string>(lead.zand_kleur ?? '')
  const [korstmos, setKorstmos] = useState<string>(lead.korstmos ?? '')
  const [plantenAfschermen, setPlantenAfschermen] = useState<string>(lead.planten_afschermen ?? '')

  // Reset bij heropenen — neem laatste server-state mee.
  useEffect(() => {
    if (open) {
      setM2(lead.m2 != null ? String(lead.m2) : '')
      setVoegzandType(lead.voegzand_type ?? '')
      setZandKleur(lead.zand_kleur ?? '')
      setKorstmos(lead.korstmos ?? '')
      setPlantenAfschermen(lead.planten_afschermen ?? '')
    }
  }, [open, lead])

  const handleSave = () => {
    const m2Num = m2.trim() === '' ? null : Number(m2)
    if (m2Num != null && !Number.isFinite(m2Num)) {
      // eslint-disable-next-line no-alert
      alert('Oppervlakte moet een getal zijn.')
      return
    }
    const patch: LeadEditPatch = {
      m2: m2Num,
      voegzand_type: voegzandType.trim() || null,
      zand_kleur: zandKleur.trim() || null,
      korstmos: korstmos.trim() || null,
      planten_afschermen: plantenAfschermen.trim() || null,
    }
    startTransition(async () => {
      const res = await updateLeadFields(leadId, patch)
      if (res.ok) {
        // Router refresh haalt nieuwe lead + geregenereerde auto-regels op;
        // re-seed van mobile-component pickt 'm via initialFp-effect op.
        router.refresh()
        onClose()
      } else {
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res.error}`)
      }
    })
  }

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Lead-data bewerken"
      footer={
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.sheetActionSave}
            onClick={handleSave}
            disabled={pending}
          >
            <Save size={14} aria-hidden="true" />
            {pending ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <div className={styles.sheetSection}>
        <div className={styles.sheetAutoNote}>
          <Info size={14} aria-hidden="true" />
          <span>Wijzigingen worden direct opgeslagen en de auto-regels worden opnieuw berekend.</span>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Oppervlakte (m²)</label>
          <input
            type="number"
            inputMode="decimal"
            className={styles.sheetInput}
            value={m2}
            onChange={(e) => setM2(e.target.value)}
            min={0}
            placeholder="0"
          />
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Voegzand-type</label>
          <div className={styles.sheetPresets}>
            {['normaal', 'onkruidwerend', 'beide'].map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.presetBtn} ${v === voegzandType ? styles.presetBtnActive : ''}`}
                onClick={() => setVoegzandType(v === voegzandType ? '' : v)}
                aria-pressed={v === voegzandType}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Zand-kleur</label>
          <div className={styles.sheetPresets}>
            {['naturel', 'antraciet'].map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.presetBtn} ${v === zandKleur ? styles.presetBtnActive : ''}`}
                onClick={() => setZandKleur(v === zandKleur ? '' : v)}
                aria-pressed={v === zandKleur}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Korstmos aanwezig</label>
          <div className={styles.sheetPresets}>
            {['ja', 'nee'].map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.presetBtn} ${v === korstmos ? styles.presetBtnActive : ''}`}
                onClick={() => setKorstmos(v === korstmos ? '' : v)}
                aria-pressed={v === korstmos}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.sheetSection}>
        <div className={styles.sheetField}>
          <label className={styles.sheetLabel}>Planten afschermen</label>
          <div className={styles.sheetPresets}>
            {['ja', 'nee'].map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.presetBtn} ${v === plantenAfschermen ? styles.presetBtnActive : ''}`}
                onClick={() => setPlantenAfschermen(v === plantenAfschermen ? '' : v)}
                aria-pressed={v === plantenAfschermen}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileSheet>
  )
}
