'use client'

// ── DossOfferteEdit ──────────────────────────────────────────────────────
// Hoofd-editor van de mobiele offerte-tab (Optie A, inline). Faithful port van
// `DossOfferteEdit` uit de handoff (MobileOfferteEdit.jsx): alle secties
// (factuuradres · persoonlijk bericht · snel instellen · regels + sleep-herorden ·
// toeslagen · korting · BTW · totalen · geldigheid · acties) + de twee full-screen
// overlays (PDF-preview / versie-historie). Werkt op lokale state, gevoed met
// echte lead-data via seedOfferteState(...). Schrijven naar DB/versturen blijft
// bewust de bestaande desktop-flow, dit scherm raakt het CRM niet aan.
//
// Translation Contract: handoff inline-styles → CSS Modules + tokens; custom
// SVG-iconen → lucide-react; dynamische accent-tint via --tone + color-mix
// (geen alpha-hex). Komma-decimaal in alle numerieke inputs (via de atoms).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  FileText,
  MessageCircle,
  Ruler,
  GripVertical,
  Check,
  Trash2,
  Plus,
  Percent,
  Tag,
  X,
  Calendar,
  Eye,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import {
  OStepper,
  ONumField,
  OSwitch,
  OSectionLabel,
  OClientNote,
  OAddrInput,
  OUnitPicker,
  OSegmented,
} from './OfferteEditAtoms'
import {
  SS_CATALOG,
  SS_TOESLAG_PRESETS,
  BTW_OPTIONS,
  offerteTotals,
  eur,
  eur0,
  addDays,
  fmtDatum,
  isoDate,
  btwLabel,
  lineQty,
  lineAmount,
  type OfferteLine,
  type Toeslag,
  type BtwKey,
  type OfferteUnit,
  type CatalogItem,
} from './offerte-edit-model'
import { seedOfferteState } from './offerte-edit-seed'
import { OffertePdfPreview, type OffertePdfData } from './OffertePdfPreview'
import { OfferteHistorie } from './OfferteHistorie'
import type { MobileDossierData } from '../dossier-mappers'
import styles from './DossOfferteEdit.module.css'

// CSS-kleur-vars die als --tone aan de atomen worden doorgegeven (geen hex
// hardcode in JS, de tokens zelf bepalen het thema). Amber = toeslagen,
// success = korting, primary = standaard-accent.
const TONE_AMBER = 'var(--color-warning)'
const TONE_SUCCESS = 'var(--color-success)'
const TONE_PRIMARY = 'var(--color-primary)'

// OffertePdfData (spec §4.7-shape) wordt geïmporteerd uit OffertePdfPreview, // dat is de bron-of-truth voor de PDF-render en het props-contract.

type DossOfferteEditProps = {
  offerte: MobileDossierData['offerte']
  pdfApiRef?: React.RefObject<{ openPdf: () => void } | null>
}

// Stabiele id-teller voor nieuw toegevoegde regels/toeslagen tijdens een sessie.
// Begint hoog zodat hij nooit botst met de deterministische seed-ids ('l0'..).
let _uid = 1000
function newId(prefix: string): string {
  _uid += 1
  return `${prefix}${_uid}`
}

// Nieuwe regel uit een catalogus-item: area-regels nemen de m² over, overige de
// defaultQty. rate/label/unit/area komen rechtstreeks uit de catalogus.
function lineFromCatalog(cat: CatalogItem, m2: number): OfferteLine {
  return {
    id: newId('l'),
    key: cat.key,
    label: cat.label,
    unit: cat.unit,
    rate: cat.rate,
    area: cat.area,
    m2: cat.area ? m2 : 0,
    qty: cat.area ? 0 : cat.defaultQty ?? 1,
    on: true,
    note: '',
    custom: false,
  }
}

// Lege vrije regel (meerwerk): omschrijving + prijs + eenheid vult de gebruiker.
function freeLine(): OfferteLine {
  return {
    id: newId('l'),
    key: 'custom',
    label: '',
    unit: 'post',
    rate: 0,
    area: false,
    m2: 0,
    qty: 1,
    on: true,
    note: '',
    custom: true,
  }
}

export function DossOfferteEdit({ offerte, pdfApiRef }: DossOfferteEditProps) {
  // ── begin-state uit echte lead-data (lazy: seed draait één keer) ──
  const [seed] = useState(() =>
    seedOfferteState({
      klant: offerte.klant,
      m2: offerte.m2,
      voornaam: offerte.voornaam,
      korstmos: offerte.korstmos,
      kortingPct: offerte.kortingPct,
      kortingNote: offerte.kortingNote,
      seedRegels: offerte.seedRegels,
    }),
  )

  const [lines, setLines] = useState<OfferteLine[]>(seed.lines)
  const [toeslagen, setToeslagen] = useState<Toeslag[]>(seed.toeslagen)
  const [pct, setPct] = useState(seed.kortingPct)
  const [kortingNote, setKortingNote] = useState(seed.kortingNote)
  const [btwKey, setBtwKey] = useState<BtwKey>(seed.btwKey)
  const [dagen, setDagen] = useState(seed.dagen)
  const [bericht, setBericht] = useState(seed.bericht)

  // UI-state
  const [adding, setAdding] = useState(false) // regel-picker open
  const [bulk, setBulk] = useState(offerte.m2 || 80) // snel-instellen waarde
  const [afwijkend, setAfwijkend] = useState(false)
  const [adr, setAdr] = useState(offerte.klant)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)

  // ── datum: hydration-veilig ──────────────────────────────────────────────
  // "Vandaag" wordt één keer geseed in een lazy initializer (epoch-millis), nooit
  // een kale new Date() in het render-pad → geen SSR-mismatch. De geformatteerde
  // geldig-t/m datum tonen we pas ná mount (mounted-guard) zodat server en client
  // identiek renderen tot de eerste effect-tick.
  const [todayMs] = useState(() => Date.now())
  const today = new Date(todayMs)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // ── live totalen ──
  const tt = offerteTotals(lines, toeslagen, pct, btwKey)

  // ── PDF-opener registreren in de actiebalk-ref ──
  useEffect(() => {
    if (pdfApiRef) pdfApiRef.current = { openPdf: () => setPdfOpen(true) }
    // Bij unmount de ref opruimen zodat de actiebalk geen dode opener houdt.
    return () => {
      if (pdfApiRef) pdfApiRef.current = null
    }
  }, [pdfApiRef])

  // ── regel-mutaties ──
  const patch = (id: string, p: Partial<OfferteLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)))
  const delLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id))
  const addCatalog = (cat: CatalogItem) => {
    setLines((ls) => [...ls, lineFromCatalog(cat, offerte.m2)])
    setAdding(false)
  }
  const addFree = () => {
    setLines((ls) => [...ls, freeLine()])
    setAdding(false)
  }
  // Snel instellen: zet álle area-regels op dezelfde m².
  const applyBulk = () => setLines((ls) => ls.map((l) => (l.area ? { ...l, m2: bulk } : l)))
  const areaCount = lines.filter((l) => l.area).length
  const usedKeys = lines.map((l) => l.key)

  // ── sleep om te ordenen (pointer-events) ─────────────────────────────────
  // Bij drag-start meten we offsetTop/hoogte van elke rij t.o.v. de container.
  // Tijdens pointermove volgt de rij de vinger (translateY) en bepalen we de
  // insert-index; bij pointerup herordenen we de array. touch-action:none op de
  // grip (in CSS) houdt het scrollen tegen tijdens slepen.
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement>>({})
  type DragState = {
    id: string
    startY: number
    delta: number
    overIndex: number
    meta: { id: string; top: number; h: number }[]
    containerTop: number
  }
  const [drag, setDrag] = useState<DragState | null>(null)

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    const cont = listRef.current
    if (!cont) return
    // Meet elke rij; offsetTop is relatief aan de (position:relative) container.
    const meta = lines.map((l) => {
      const el = rowRefs.current[l.id]
      return { id: l.id, top: el?.offsetTop ?? 0, h: el?.offsetHeight ?? 0 }
    })
    setDrag({
      id,
      startY: e.clientY,
      delta: 0,
      overIndex: lines.findIndex((l) => l.id === id),
      meta,
      containerTop: cont.getBoundingClientRect().top,
    })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const relY = e.clientY - drag.containerTop
      // Tel hoeveel andere rijen we voorbij hun midden zijn → insert-index.
      let over = 0
      drag.meta.forEach((m) => {
        if (m.id === drag.id) return
        if (relY > m.top + m.h / 2) over++
      })
      setDrag((d) => (d ? { ...d, delta: e.clientY - d.startY, overIndex: over } : d))
    }
    const up = () =>
      setDrag((d) => {
        if (d) {
          setLines((ls) => {
            const from = ls.findIndex((l) => l.id === d.id)
            if (from < 0) return ls
            const arr = ls.slice()
            const [it] = arr.splice(from, 1)
            arr.splice(d.overIndex, 0, it)
            return arr
          })
        }
        return null
      })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    // Ook 'pointercancel' afronden: op touch kan een gesture onderbroken raken
    // (scroll-overname, telefoontje) zonder dat 'pointerup' vuurt, zonder deze
    // cleanup zou de lijst dan in drag-state blijven hangen.
    window.addEventListener('pointercancel', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // Alleen opnieuw binden bij een nieuwe drag-id (niet bij elke delta-tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id])

  // Y-positie van de blauwe insert-indicator (boven/onder de rest-rijen).
  let indicatorY: number | null = null
  if (drag) {
    const rest = drag.meta.filter((m) => m.id !== drag.id)
    if (drag.overIndex <= 0) indicatorY = rest.length ? rest[0].top - 4 : 0
    else if (drag.overIndex >= rest.length) {
      const last = rest[rest.length - 1]
      indicatorY = last.top + last.h + 4
    } else indicatorY = rest[drag.overIndex].top - 4
  }

  // ── toeslag-mutaties ──
  const [addingToeslag, setAddingToeslag] = useState(false)
  const patchToeslag = (id: string, p: Partial<Toeslag>) =>
    setToeslagen((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const delToeslag = (id: string) => setToeslagen((ts) => ts.filter((t) => t.id !== id))
  const addToeslagPreset = (preset: Omit<Toeslag, 'id' | 'on'>) => {
    setToeslagen((ts) => [...ts, { ...preset, id: newId('t'), on: true }])
    setAddingToeslag(false)
  }
  // 'Eigen toeslag', percentage-variant (gebruiker past % aan via stepper).
  const addEigenToeslag = () => {
    setToeslagen((ts) => [
      ...ts,
      { id: newId('t'), key: `custom-${_uid}`, label: 'Eigen toeslag', mode: 'pct', value: 10, on: true },
    ])
    setAddingToeslag(false)
  }
  // 'Eigen toeslag (vast bedrag)', bedrag-variant (bv. €25 voorrijkosten).
  const addEigenToeslagVast = () => {
    setToeslagen((ts) => [
      ...ts,
      { id: newId('t'), key: `custom-bedrag-${_uid}`, label: 'Eigen toeslag', mode: 'bedrag', value: 25, on: true },
    ])
    setAddingToeslag(false)
  }
  const usedToeslagKeys = toeslagen.map((t) => t.key)

  // ── korting open-state (geopend zodra er een percentage staat) ──
  const [kortingOpen, setKortingOpen] = useState(seed.kortingPct > 0)

  // ── geldigheid: einddatum afgeleid van today + dagen ──
  const eind = addDays(today, dagen)
  // Native date-input → bereken het aantal dagen t.o.v. vandaag terug.
  const onPickDate = (val: string) => {
    if (!val) return
    const [y, m, d] = val.split('-').map(Number)
    const picked = new Date(y, m - 1, d)
    // Beide datums op middernacht-lokaal voor een schone dag-telling.
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const diff = Math.round((picked.getTime() - base.getTime()) / 86_400_000)
    setDagen(Math.max(1, diff))
  }

  // ── PDF-data afgeleid van de live editor-state ───────────────────────────
  // Vorm = spec §4.7 OffertePdfDataV2-contract. De preview rekent niet zelf;
  // hij spiegelt het al-uitgerekende totalenblok. Offertenummer afgeleid van
  // de hoogste versie + het actuele jaar (hydration-veilig via todayMs/today).
  const pdfKlant = afwijkend ? adr : offerte.klant
  const onLines = lines.filter((l) => l.on)
  const nextVersie = (offerte.versies?.reduce((m, v) => Math.max(m, v.versie), 0) ?? 0) + 1
  // Jaar dynamisch uit `today` (zelfde lazy-initializer als todayMs, hydration-veilig).
  // Nooit hardcoded 2026: vanaf 2027 werkt dit dan correct.
  const pdfData: OffertePdfData = {
    nr: `${today.getFullYear()}-${String(nextVersie).padStart(4, '0')}`,
    datum: fmtDate(today),
    geldigTot: fmtDate(eind),
    dienst: offerte.dienst,
    m2: offerte.m2 > 0 ? offerte.m2 : undefined,
    klant: {
      naam: pdfKlant.naam,
      bedrijf: pdfKlant.bedrijf || undefined,
      straat: pdfKlant.straat,
      pcplaats: pdfKlant.pcplaats,
      // email/telefoon uit offerte-blok (§4.5); alleen bij niet-afwijkend adres.
      email: !afwijkend ? offerte.email : undefined,
      telefoon: !afwijkend ? offerte.telefoon : undefined,
    },
    regels: onLines.map((l) => ({
      omschrijving: l.label || 'Regel',
      // Aantal-label: bv. '80 m²' of '2 rol'; lege string bij qty 0.
      aantalLabel: lineQty(l) > 0 ? `${lineQty(l)} ${l.unit}` : '',
      stukprijs: l.rate,
      totaal: lineAmount(l),
    })),
    subtotaal: tt.sub0,
    toeslagen: tt.toeslagRegels,
    kortingPct: pct,
    kortingBedrag: tt.korting,
    kortingNote: kortingNote || undefined,
    totaalExcl: tt.subNet,
    // btwPct als getal (niet string): '21'→21, 'verlegd'→0.
    btwPct: btwKey === 'verlegd' || btwKey === '0' ? 0 : Number(btwKey),
    btwBedrag: tt.btw,
    totaalIncl: tt.totaal,
    toelichting: bericht || undefined,
  }

  return (
    <section className={styles.wrap} aria-label="Offerte bewerken">
      {/* ── 1. Factuuradres ─────────────────────────────────────────────── */}
      <section className={styles.card} data-pad="md">
        <div className={styles.factHead}>
          <span className={styles.iconBadge} aria-hidden="true">
            <FileText size={17} />
          </span>
          <div className={styles.factHeadText}>
            <div className={styles.cardTitle}>Factuuradres</div>
            <div className={styles.cardSub}>
              {afwijkend ? 'Afwijkend op deze offerte' : 'Zelfde als klantgegevens'}
            </div>
          </div>
          <OSwitch
            on={afwijkend}
            accent={TONE_PRIMARY}
            label="Afwijkend factuuradres"
            onChange={(v) => {
              setAfwijkend(v)
              if (v) setAdr(offerte.klant) // start de override met de klantgegevens
            }}
          />
        </div>

        {!afwijkend ? (
          <div className={styles.factRead}>
            <div className={styles.factReadName}>{offerte.klant.naam}</div>
            <div>{offerte.klant.straat}</div>
            <div>{offerte.klant.pcplaats}</div>
          </div>
        ) : (
          <div className={styles.factEdit}>
            {/* Info-melding: override op het document, CRM blijft ongewijzigd. */}
            <div className={styles.factInfo}>
              <Info size={13} aria-hidden="true" />
              <span>Geldt alleen voor deze offerte, klantgegevens blijven ongewijzigd</span>
            </div>
            <OAddrInput value={adr.naam} onChange={(v) => setAdr({ ...adr, naam: v })} placeholder="Naam" />
            <OAddrInput
              value={adr.bedrijf}
              onChange={(v) => setAdr({ ...adr, bedrijf: v })}
              placeholder="Bedrijf (optioneel)"
            />
            <OAddrInput
              value={adr.straat}
              onChange={(v) => setAdr({ ...adr, straat: v })}
              placeholder="Straat + nr"
            />
            <OAddrInput
              value={adr.pcplaats}
              onChange={(v) => setAdr({ ...adr, pcplaats: v })}
              placeholder="Postcode + plaats"
            />
            <button
              type="button"
              className={styles.factBack}
              onClick={() => {
                setAfwijkend(false)
                setAdr(offerte.klant)
              }}
            >
              <ChevronLeft size={14} aria-hidden="true" /> Terug naar klantgegevens
            </button>
          </div>
        )}
      </section>

      {/* ── 2. Persoonlijk bericht ──────────────────────────────────────── */}
      <BerichtCard value={bericht} onChange={setBericht} />

      {/* ── 3. Snel instellen ───────────────────────────────────────────── */}
      <section className={styles.card} data-pad="md">
        <div className={styles.snelHead}>
          <span className={styles.iconBadge} aria-hidden="true">
            <Ruler size={17} />
          </span>
          <div className={styles.factHeadText}>
            <div className={styles.cardTitle}>Snel instellen</div>
            <div className={styles.cardSub}>zet alle {areaCount} m²-regels gelijk</div>
          </div>
          <OStepper value={bulk} onChange={setBulk} step={5} suffix="m²" />
        </div>
        <button type="button" className={styles.snelApply} onClick={applyBulk}>
          Toepassen op alle m²-regels
        </button>
      </section>

      {/* ── 4. Regels (kern + sleep) ─────────────────────────────────────── */}
      <div>
        <OSectionLabel
          right={
            <span className={styles.dragHint}>
              sleep <GripVertical size={12} aria-hidden="true" /> om te ordenen
            </span>
          }
        >
          Regels
        </OSectionLabel>

        <div ref={listRef} className={styles.regelList}>
          {/* Blauwe insert-indicator tijdens slepen. */}
          {indicatorY !== null && (
            <div className={styles.dragIndicator} style={{ top: indicatorY }} aria-hidden="true" />
          )}

          {lines.map((l) => {
            const dragging = drag?.id === l.id
            return (
              <div
                key={l.id}
                ref={(el) => {
                  if (el) rowRefs.current[l.id] = el
                }}
                className={styles.regelCard}
                data-off={!l.on || undefined}
                data-dragging={dragging || undefined}
                // translateY volgt de vinger; alleen de actieve rij verschuift.
                style={dragging ? ({ transform: `translateY(${drag!.delta}px)` } as React.CSSProperties) : undefined}
              >
                <div className={styles.regelTop}>
                  {/* Grip-handle, start de drag (touch-action:none in CSS). */}
                  <div
                    className={styles.grip}
                    onPointerDown={(e) => startDrag(e, l.id)}
                    aria-label="Versleep om te ordenen"
                  >
                    <GripVertical size={16} aria-hidden="true" />
                  </div>

                  {/* Aan/uit-checkbox, uit = regel telt niet mee.
                      role="checkbox" + aria-checked geeft schermlezers de juiste
                      semantiek (toggle, niet push-button). */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={l.on}
                    className={styles.regelCheck}
                    data-on={l.on || undefined}
                    onClick={() => patch(l.id, { on: !l.on })}
                    aria-label={l.on ? 'Regel uitschakelen' : 'Regel inschakelen'}
                  >
                    {l.on && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                  </button>

                  {/* Naam: catalogus = statisch label, vrije regel = input. */}
                  {l.custom ? (
                    <input
                      className={styles.regelNameInput}
                      value={l.label}
                      onChange={(e) => patch(l.id, { label: e.target.value })}
                      placeholder="Omschrijving meerwerk…"
                    />
                  ) : (
                    <div className={styles.regelName}>{l.label}</div>
                  )}

                  {/* Live regelbedrag. */}
                  <div className={styles.regelBedrag}>{eur(lineAmount(l))}</div>
                </div>

                {/* Tweede rij: hoeveelheid-stepper × tikbaar tarief / eenheid. */}
                <div className={styles.regelControls}>
                  {l.area ? (
                    <OStepper value={l.m2} onChange={(v) => patch(l.id, { m2: v })} step={5} suffix="m²" />
                  ) : (
                    <OStepper
                      value={l.qty}
                      onChange={(v) => patch(l.id, { qty: v })}
                      suffix={l.custom ? '' : l.unit}
                    />
                  )}
                  <span className={styles.regelRate}>
                    ×
                    <ONumField value={l.rate} onChange={(v) => patch(l.id, { rate: v })} prefix="€" dec align="left" />
                    {l.custom ? (
                      <OUnitPicker value={l.unit} onChange={(v) => patch(l.id, { unit: v as OfferteUnit })} />
                    ) : (
                      <span className={styles.regelUnit}> / {l.unit}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => delLine(l.id)}
                    aria-label="Regel verwijderen"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>

                {/* Klant-zichtbare notitie. */}
                <div className={styles.regelNote}>
                  <OClientNote
                    value={l.note}
                    onChange={(v) => patch(l.id, { note: v })}
                    placeholder="Bijv. extra aangroei, intensievere reiniging nodig…"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Regel toevoegen: picker met 'Vrije regel' bovenaan + catalogus-chips. */}
        <div className={styles.addWrap}>
          {adding ? (
            <div className={styles.picker}>
              <div className={styles.pickerHead}>
                <span>Toevoegen</span>
                <button type="button" className={styles.pickerClose} onClick={() => setAdding(false)}>
                  Sluit
                </button>
              </div>
              <button type="button" className={styles.freeOption} onClick={addFree}>
                <Pencil size={16} aria-hidden="true" />
                <span className={styles.freeOptionLabel}>
                  Vrije regel <span className={styles.freeOptionSub}>· meerwerk, eigen tekst &amp; prijs</span>
                </span>
                <Plus size={16} aria-hidden="true" />
              </button>
              <div className={styles.pickerSubhead}>Uit catalogus</div>
              <div className={styles.chips}>
                {SS_CATALOG.filter((c) => !usedKeys.includes(c.key)).length === 0 && (
                  <span className={styles.chipsEmpty}>Alle vaste diensten staan al in de offerte.</span>
                )}
                {SS_CATALOG.filter((c) => !usedKeys.includes(c.key)).map((c) => (
                  <button key={c.key} type="button" className={styles.chip} onClick={() => addCatalog(c)}>
                    <Plus size={13} className={styles.chipPlus} aria-hidden="true" /> {c.label}
                    <span className={styles.chipMeta}>
                      · {eur0(c.rate)}/{c.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden="true" /> Regel toevoegen
            </button>
          )}
        </div>
      </div>

      {/* ── 5. Toeslagen ─────────────────────────────────────────────────── */}
      <div>
        <OSectionLabel>Toeslagen</OSectionLabel>
        <div className={styles.toeslagList}>
          {toeslagen.map((t) => (
            <div key={t.id} className={styles.toeslagCard} data-off={!t.on || undefined}>
              <div className={styles.toeslagTop}>
                <Percent size={16} className={styles.toeslagIcon} aria-hidden="true" />
                <span className={styles.toeslagLabel}>{t.label}</span>
                <OSwitch on={t.on} accent={TONE_AMBER} onChange={(v) => patchToeslag(t.id, { on: v })} label={t.label} />
              </div>
              <div className={styles.toeslagControls}>
                <OStepper
                  value={t.value}
                  onChange={(v) => patchToeslag(t.id, { value: v })}
                  step={5}
                  suffix={t.mode === 'pct' ? '%' : ''}
                  accent={TONE_AMBER}
                />
                <span className={styles.toeslagHint}>{t.mode === 'pct' ? 'over subtotaal' : '€ vast'}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => delToeslag(t.id)}
                  aria-label="Toeslag verwijderen"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.addWrap}>
          {addingToeslag ? (
            <div className={styles.picker}>
              <div className={styles.pickerHead}>
                <span>Kies een toeslag</span>
                <button type="button" className={styles.pickerClose} onClick={() => setAddingToeslag(false)}>
                  Sluit
                </button>
              </div>
              <div className={styles.chips}>
                {SS_TOESLAG_PRESETS.filter((p) => !usedToeslagKeys.includes(p.key)).map((p) => (
                  <button key={p.key} type="button" className={styles.chip} onClick={() => addToeslagPreset(p)}>
                    <Plus size={13} className={styles.chipPlusAmber} aria-hidden="true" /> {p.label}
                    <span className={styles.chipMeta}>· {p.mode === 'pct' ? `${p.value}%` : eur0(p.value)}</span>
                  </button>
                ))}
                {/* 'Eigen toeslag (%)': custom percentage-toeslag. */}
                <button type="button" className={styles.chip} onClick={addEigenToeslag}>
                  <Plus size={13} className={styles.chipPlusAmber} aria-hidden="true" /> Eigen toeslag
                  <span className={styles.chipMeta}>· % naar keuze</span>
                </button>
                {/* 'Eigen toeslag (€ vast)': vast-bedrag toeslag (bv. voorrijkosten). */}
                <button type="button" className={styles.chip} onClick={addEigenToeslagVast}>
                  <Plus size={13} className={styles.chipPlusAmber} aria-hidden="true" /> Eigen toeslag (vast)
                  <span className={styles.chipMeta}>· € vast bedrag</span>
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.linkAdd} onClick={() => setAddingToeslag(true)}>
              <Plus size={16} aria-hidden="true" /> Toeslag toevoegen
            </button>
          )}
        </div>
      </div>

      {/* ── 6. Korting ───────────────────────────────────────────────────── */}
      {!kortingOpen && pct === 0 ? (
        <button
          type="button"
          className={styles.linkAdd}
          onClick={() => {
            setKortingOpen(true)
            setPct(10)
          }}
        >
          <Tag size={16} aria-hidden="true" /> Korting toevoegen
        </button>
      ) : (
        <section className={styles.card} data-pad="md">
          <div className={styles.kortingTop}>
            <Tag size={16} className={styles.kortingIcon} aria-hidden="true" />
            <span className={styles.kortingLabel}>Korting</span>
            <OStepper
              value={pct}
              onChange={(v) => setPct(Math.min(100, Math.max(0, v)))}
              step={5}
              max={100}
              suffix="%"
              accent={TONE_SUCCESS}
            />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                setPct(0)
                setKortingNote('')
                setKortingOpen(false)
              }}
              aria-label="Korting verwijderen"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <OClientNote
            value={kortingNote}
            onChange={setKortingNote}
            placeholder="Bijv. vaste klant, 10% trouwkorting…"
          />
        </section>
      )}

      {/* ── 7. BTW-tarief ────────────────────────────────────────────────── */}
      <section className={styles.card} data-pad="md">
        <div className={styles.btwTitle}>BTW-tarief</div>
        <OSegmented value={btwKey} options={BTW_OPTIONS} onChange={(k) => setBtwKey(k as BtwKey)} />
        {btwKey === 'verlegd' && (
          <div className={styles.btwNote}>BTW wordt verlegd naar de klant (zakelijk).</div>
        )}
      </section>

      {/* ── 8. Totalen ───────────────────────────────────────────────────── */}
      <section className={styles.card} data-pad="lg">
        <div className={styles.totals}>
          <TotalRow label="Subtotaal" value={eur(tt.sub0)} />
          {tt.toeslagRegels.map((tr, i) => (
            <TotalRow key={i} label={tr.label} value={eur(tr.bedrag)} tone="amber" />
          ))}
          {tt.korting > 0 && <TotalRow label={`Korting (${pct}%)`} value={`– ${eur(tt.korting)}`} tone="green" />}
          <TotalRow label={btwLabel(btwKey)} value={eur(tt.btw)} />
          <div className={styles.totalDivider} />
          <TotalRow label="Totaal" value={eur(tt.totaal)} strong />
        </div>
      </section>

      {/* ── 9. Geldigheid ────────────────────────────────────────────────── */}
      <section className={styles.card} data-pad="md">
        <div className={styles.geldigHead}>
          <Calendar size={16} className={styles.geldigIcon} aria-hidden="true" />
          <span className={styles.geldigTitle}>Geldigheid</span>
          <OStepper value={dagen} onChange={(v) => setDagen(Math.max(1, Math.round(v)))} step={1} min={1} suffix="dgn" />
        </div>
        {/* Snelknoppen 7/14/30/60. */}
        <div className={styles.geldigQuick}>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              type="button"
              className={styles.geldigQuickBtn}
              data-on={d === dagen || undefined}
              onClick={() => setDagen(d)}
            >
              {d} dgn
            </button>
          ))}
        </div>
        {/* Datumkiezer-regel, toont de einddatum pas ná mount (hydration-veilig). */}
        <label className={styles.geldigDate}>
          <span className={styles.geldigDateLabel}>Geldig t/m</span>
          <span className={styles.geldigDateValue}>{mounted ? fmtDatum(eind) : '—'}</span>
          <input
            type="date"
            className={styles.geldigDateInput}
            value={mounted ? isoDate(eind) : ''}
            min={mounted ? isoDate(addDays(today, 1)) : undefined}
            onChange={(e) => onPickDate(e.target.value)}
            aria-label="Kies einddatum"
          />
        </label>
      </section>

      {/* ── 10. Acties (Bekijk PDF / Historie) ───────────────────────────── */}
      {/* footer/div[role=group] is correctere semantiek dan een lege div. */}
      <div role="group" className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={() => setPdfOpen(true)}>
          <Eye size={16} aria-hidden="true" /> Bekijk PDF
        </button>
        <button type="button" className={styles.actionBtn} onClick={() => setHistOpen(true)}>
          <Clock size={16} aria-hidden="true" /> Historie
        </button>
      </div>

      {/* ── overlays ─────────────────────────────────────────────────────── */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OffertePdfPreview open={pdfOpen} onClose={() => setPdfOpen(false)} data={pdfData} />
      <OfferteHistorie
        open={histOpen}
        onClose={() => setHistOpen(false)}
        huidigBedrag={tt.totaal}
        versies={offerte.versies}
      />
    </section>
  )
}

// ── persoonlijk bericht (inklapbare kaart) ─────────────────────────────────
// Dicht = eerste niet-lege regel als preview ('Beste Jeroen,'); open = textarea
// met de begeleidende tekst die bovenaan de offerte/PDF komt.
function BerichtCard({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const preview = value.split('\n').filter(Boolean)[0] || 'Geen begeleidende tekst'
  return (
    <div className={styles.card} data-pad="md">
      <button type="button" className={styles.berichtHead} onClick={() => setOpen((o) => !o)}>
        <span className={styles.iconBadge} aria-hidden="true">
          <MessageCircle size={17} />
        </span>
        <div className={styles.factHeadText}>
          <div className={styles.cardTitle}>Persoonlijk bericht</div>
          <div className={styles.berichtPreview}>{open ? 'Bovenaan de offerte' : preview}</div>
        </div>
        <ChevronRight size={16} className={styles.berichtChev} data-open={open || undefined} aria-hidden="true" />
      </button>
      {open && (
        <textarea
          className={styles.berichtArea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
      )}
    </div>
  )
}

// ── totaal-regel ───────────────────────────────────────────────────────────
// Label links, bedrag rechts. tone amber/green tint; strong = de grand-total.
function TotalRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'amber' | 'green'
}) {
  return (
    <div className={styles.totalRow} data-strong={strong || undefined} data-tone={tone}>
      <span className={styles.totalLabel}>{label}</span>
      <span className={styles.totalValue}>{value}</span>
    </div>
  )
}

// dd-mm-jjjj voor de PDF-preview (de SS-template gebruikt dat formaat).
function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}
