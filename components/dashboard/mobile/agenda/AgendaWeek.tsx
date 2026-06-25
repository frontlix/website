'use client'

// AgendaWeek, gepolijste week-lijst (port van agenda-b/ABMain.jsx).
// Componeert: grote titel ("Agenda" + week-samenvatting + search/+ knoppen),
// filter-pills (lokale filter-state), day-jump-strip, live "bezig"-banner en
// gegroepeerde AgendaDayGroup's met AgendaEventRow's.
// Data: AG_EVENTS/NOW_ID uit ./agenda-mock; eventTone/durStr uit ./agenda-mobile-helpers.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import type { AgendaEvent, AgendaWeekDay } from './agenda-mock'
import { minutesBetween } from './agenda-mobile-helpers'
import { AgendaFilterPills } from './AgendaFilterPills'
import { AgendaDayJumpStrip } from './AgendaDayJumpStrip'
import { AgendaWeekNav } from './AgendaWeekNav'
import { AgendaLiveBanner } from './AgendaLiveBanner'
import { AgendaDayGroup } from './AgendaDayGroup'
import { AgendaEventRow } from './AgendaEventRow'
import styles from './AgendaWeek.module.css'

// Filter-segmenten (handoff ABMain items).
// "Volgende week" is bewust weggelaten: de route laadt maar één week, dus die
// pill zou per definitie altijd leeg zijn (misleidend). De overige pills
// filteren op echte velden (date / kind).
const FILTER_ITEMS = [
  { k: 'vandaag', l: 'Vandaag' },
  { k: 'week', l: 'Deze week' },
  { k: 'eigen', l: 'Eigen werk' },
]

const NL_WEEKDAY_LONG = [
  'zondag',
  'maandag',
  'dinsdag',
  'woensdag',
  'donderdag',
  'vrijdag',
  'zaterdag',
]
const NL_MONTH_SHORT = [
  'jan',
  'feb',
  'mrt',
  'apr',
  'mei',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
]

type DayBucket = {
  date: string
  label: string
  summary: string
  hours: number
  today: boolean
  past: boolean
  events: AgendaEvent[]
}

/** Lange NL-datumlabel relatief t.o.v. "vandaag" (Vandaag/Morgen/Gisteren). */
function dayLabel(date: string, todayDate: string): string {
  const d = new Date(`${date}T00:00:00`)
  const today = new Date(`${todayDate}T00:00:00`)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gisteren'
  const wd = NL_WEEKDAY_LONG[d.getDay()]
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()} ${NL_MONTH_SHORT[d.getMonth()]}`
}

interface AgendaWeekProps {
  events: AgendaEvent[]
  /** Vandaag (Europe/Amsterdam) als 'YYYY-MM-DD', bepaalt Vandaag/Morgen-labels. */
  todayDate: string
  /** Huidige tijd 'HH:MM' (Amsterdam) voor de live-banner resterende-tijd. */
  nowTime: string
  /** 7 week-dagen voor de day-jump-strip. */
  weekDays: AgendaWeekDay[]
  /** Subtitle, bv. "Week 20 · 11 t/m 17 mei 2026". */
  weekLabel: string
  /** Maandag-key vorige week (YYYY-MM-DD). */
  prevWeekKey: string
  /** Maandag-key volgende week (YYYY-MM-DD). */
  nextWeekKey: string
  /** True → "Vandaag" inactief. */
  isCurrentWeek: boolean
  /** Actieve weergave (voor de Week|Maand-switch rechts op de navigatie-regel). */
  view?: 'week' | 'maand'
  /** Wissel van weergave (instant client-side). */
  onViewChange?: (v: 'week' | 'maand') => void
  onOpenEvent?: (ev: AgendaEvent) => void
  onNew?: () => void
  onOpenSearch?: () => void
  /** Live-banner "Afronden"-shortcut → opent de afrond-flow voor het live event. */
  onAfrondenLive?: (ev: AgendaEvent) => void
}

export function AgendaWeek({
  events,
  todayDate,
  nowTime,
  weekDays,
  weekLabel,
  prevWeekKey,
  nextWeekKey,
  isCurrentWeek,
  view,
  onViewChange,
  onOpenEvent,
  onNew,
  onOpenSearch,
  onAfrondenLive,
}: AgendaWeekProps) {
  const [filter, setFilter] = useState('week')

  // Live event = de afspraak die nu loopt (en niet al afgehandeld is).
  // Bewust op ALLE events (niet de gefilterde lijst) zodat de live-banner
  // zichtbaar blijft ongeacht het actieve filter.
  const nowEvent = useMemo(() => events.find((e) => e.current && !e.done), [events])

  // Filter toepassen op de dag-groepen (echte velden: date / kind).
  const visibleEvents = useMemo(() => {
    if (filter === 'vandaag') return events.filter((e) => e.date === todayDate)
    if (filter === 'eigen') return events.filter((e) => e.kind === 'eigen')
    return events // 'week'
  }, [events, filter, todayDate])

  // Groepeer per dag (gesorteerd op start) → buckets met label/summary/hours.
  const days = useMemo<DayBucket[]>(() => {
    const byDate = new Map<string, AgendaEvent[]>()
    for (const ev of visibleEvents) {
      const arr = byDate.get(ev.date) ?? []
      arr.push(ev)
      byDate.set(ev.date, arr)
    }
    const todayMs = todayDate ? new Date(`${todayDate}T00:00:00`).getTime() : 0
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evs]) => {
        const sorted = [...evs].sort((a, b) => a.start.localeCompare(b.start))
        const totalMin = sorted.reduce((s, e) => s + minutesBetween(e.start, e.end), 0)
        const hours = Math.round((totalMin / 60) * 10) / 10
        const summary =
          sorted.length === 0
            ? 'Geen afspraken'
            : `${sorted.length} ${sorted.length === 1 ? 'afspraak' : 'afspraken'} · van ${sorted[0].start} tot ${sorted[sorted.length - 1].end}`
        const ms = new Date(`${date}T00:00:00`).getTime()
        return {
          date,
          label: dayLabel(date, todayDate),
          summary,
          hours,
          today: date === todayDate,
          past: ms < todayMs,
          events: sorted,
        }
      })
  }, [visibleEvents, todayDate])

  // Tik op een dag in de strip → scroll naar de bijbehorende dag-groep.
  // De scroll-container is .root (overflow-y:auto); scrollIntoView scrollt
  // de dichtstbijzijnde scrollbare ancestor.
  const handleJump = (date: string) => {
    document
      .getElementById(`agday-${date}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Week-totaal voor de subtitle.
  const totalEv = events.length

  return (
    <div className={styles.root}>
      {/* Grote titel + acties */}
      <header className={styles.titleBar}>
        <div className={styles.titleCol}>
          <h1 className={styles.title}>Agenda</h1>
          <p className={styles.subtitle}>
            {totalEv} {totalEv === 1 ? 'afspraak' : 'afspraken'}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Zoeken"
            onClick={onOpenSearch}
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.addBtn}
            aria-label="Nieuwe afspraak"
            onClick={onNew}
          >
            <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Periode-regel: weeklabel + Week|Maand-switch */}
      <AgendaWeekNav weekLabel={weekLabel} view={view} onViewChange={onViewChange} />

      {/* Filter-pills */}
      <AgendaFilterPills active={filter} onPick={setFilter} items={FILTER_ITEMS} />

      {/* Week vorige/volgende-navigatie rond de mini-week day-jump strip */}
      <div className={styles.stripNav}>
        <Link
          href={`/agenda?week=${prevWeekKey}`}
          className={styles.stripArrow}
          aria-label="Vorige week"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>

        <div className={styles.stripWrap}>
          <AgendaDayJumpStrip
            days={weekDays}
            events={events}
            todayDate={todayDate}
            onJump={handleJump}
          />
        </div>

        <Link
          href={`/agenda?week=${nextWeekKey}`}
          className={styles.stripArrow}
          aria-label="Volgende week"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </Link>

        {!isCurrentWeek && (
          <Link href="/agenda" className={styles.stripToday}>
            Vandaag
          </Link>
        )}
      </div>

      {/* Live "bezig"-banner */}
      {nowEvent && (
        <AgendaLiveBanner
          ev={nowEvent}
          nowTime={nowTime}
          onOpen={() => onOpenEvent?.(nowEvent)}
          onAfronden={() => onAfrondenLive?.(nowEvent)}
          // Foto-upload heeft nog geen infra (storage/handler) → no-op.
          onFoto={() => {}}
          // WhatsApp opent het echte gesprek met de klant (0→31-normalisatie).
          onWhatsApp={() => {
            const d = (nowEvent.telefoon ?? '').replace(/\D/g, '')
            const wa = d.startsWith('0') ? `31${d.slice(1)}` : d
            if (wa) window.open(`https://wa.me/${wa}`, '_blank', 'noopener,noreferrer')
          }}
        />
      )}

      {/* Lege staat als de week geen afspraken bevat */}
      {days.length === 0 && (
        <p className={styles.empty}>Geen afspraken deze week.</p>
      )}

      {/* Dag-groepen */}
      {days.map((d) => (
        <AgendaDayGroup
          key={d.date}
          id={`agday-${d.date}`}
          date={d.date}
          label={d.label}
          summary={d.summary}
          hours={d.events.length > 0 ? d.hours : undefined}
          today={d.today}
          past={d.past}
        >
          {d.events.length > 0
            ? d.events.map((ev, i) => (
                <AgendaEventRow
                  key={ev.id}
                  ev={ev}
                  state={ev.done ? 'done' : ev.current ? 'now' : 'idle'}
                  last={i === d.events.length - 1}
                  onClick={() => onOpenEvent?.(ev)}
                />
              ))
            : null}
        </AgendaDayGroup>
      ))}

      <div className={styles.tailSpace} />
    </div>
  )
}
