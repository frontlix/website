import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import type { TenantBase } from '@/lib/dashboard/tenant-base'
import {
  BASE_COORD,
  buildRouteDays,
  type RouteDay,
  type RouteStop,
} from '@/lib/dashboard/agenda-route'
import {
  AgendaRouteView,
  type MapDay,
  type DayTab,
} from './AgendaRouteView'
import styles from './AgendaRouteMap.module.css'

/**
 * Server-component wrapper rond de routekaart-view.
 *
 * - Met Google Maps API key + Map ID → delegeert volledig aan de client-
 *   component AgendaRouteView (interactieve Google Map + live Directions).
 * - Zonder die env-vars → schematische SVG-fallback met statische km-
 *   schatting in de sidebar, zodat de view blijft werken in dev/staging.
 */
export function AgendaRouteMap({
  appointments,
  focusDay,
  base,
}: {
  mondayKey: string
  appointments: Appointment[]
  focusDay: string | null
  base: TenantBase
}) {
  const days = buildRouteDays(appointments)
  const totalStops = appointments.length
  const focused = focusDay ? days.find((d) => d.dayKey === focusDay) ?? null : null

  const gmapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const gmapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

  if (gmapsKey && gmapsMapId) {
    const mapDays: MapDay[] = days.map((d) => ({
      dayKey: d.dayKey,
      label: d.label,
      color: d.color,
      stops: d.stops
        .filter((s) => s.lat !== null && s.lng !== null)
        .map((s) => ({
          lead_id: s.lead_id,
          naam: s.naam,
          plaats: s.plaats,
          m2Label: s.m2Label,
          tijd: s.tijd,
          pinIndex: s.pinIndex,
          dayKey: s.dagKey,
          color: d.color,
          lat: s.lat as number,
          lng: s.lng as number,
          adres: s.plaats,
        })),
    }))
    const mappedCount = mapDays.reduce((n, d) => n + d.stops.length, 0)
    const missingCount = totalStops - mappedCount
    const dayTabs: DayTab[] = days.map((d) => ({
      dayKey: d.dayKey,
      shortLabel: d.shortLabel,
      color: d.color,
    }))

    return (
      <AgendaRouteView
        apiKey={gmapsKey}
        mapId={gmapsMapId}
        days={mapDays}
        focusedDayKey={focused?.dayKey ?? null}
        totalStops={totalStops}
        missingCount={missingCount}
        tip={buildTip(days)}
        dayTabs={dayTabs}
        base={base}
      />
    )
  }

  // ── Fallback: schematische SVG (geen Google Maps configuratie) ──
  const shownDays = focused ? [focused] : days
  const totalKm = days.reduce((sum, d) => sum + d.totalKm, 0)

  return (
    <div className={styles.grid}>
      <div className={`dash-card ${styles.mapCard}`}>
        <div className={styles.mapHead}>
          <div>
            <div className={styles.mapTitle}>Routekaart van de week</div>
            <div className={styles.mapSub}>
              {totalStops} stop{totalStops === 1 ? '' : 's'}
              {totalKm > 0 ? ` · ~${totalKm} km totaal` : ''} · vanuit Biervliet
            </div>
          </div>
          <div className={styles.tabs}>
            <DayTabLink href="/agenda?view=routekaart" active={!focused}>
              Hele week
            </DayTabLink>
            {days.map((d) => (
              <DayTabLink
                key={d.dayKey}
                href={`/agenda?view=routekaart&dag=${d.dayKey}`}
                active={focused?.dayKey === d.dayKey}
                color={d.color}
              >
                {d.shortLabel}
              </DayTabLink>
            ))}
          </div>
        </div>

        <RouteSvg days={shownDays} focused={focused} />

        <div className={styles.scaleBox}>
          <div className={styles.scaleLabel}>SCHAAL</div>
          <div className={styles.scaleValue}>
            Schematisch · Zuid- en West-Nederland
          </div>
        </div>
      </div>

      <div className={styles.sidebar}>
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">Dagindeling</div>
          </div>
          <div className={styles.dayList}>
            {shownDays.length === 0 && (
              <div className={styles.empty}>Geen routes deze week.</div>
            )}
            {shownDays.map((d) => (
              <DayBlock key={d.dayKey} day={d} />
            ))}
          </div>
        </div>

        {days.length >= 2 && (
          <div className={`dash-card ${styles.tipCard}`}>
            <div className={styles.tipHead}>
              <Lightbulb size={14} />
              <span>Tip</span>
            </div>
            <div className={styles.tipBody}>{buildTip(days)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Fallback helpers (alleen voor SVG-modus) ─────────── */

function DayTabLink({
  href,
  active,
  color,
  children,
}: {
  href: string
  active: boolean
  color?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`}>
      {color && <span className={styles.tabDot} style={{ background: color }} />}
      {children}
    </Link>
  )
}

function DayBlock({ day }: { day: RouteDay }) {
  return (
    <div className={styles.dayBlock}>
      <div className={styles.dayHead}>
        <div className={styles.dayLabel}>{day.label}</div>
        {day.totalKm > 0 && (
          <div className={styles.dayKm}>~{day.totalKm} km</div>
        )}
      </div>
      <div className={styles.dayStops}>
        {day.stops.map((s) => (
          <Link
            key={s.lead_id}
            href={`/leads/${s.lead_id}`}
            className={styles.stop}
          >
            <span className={styles.stopPin} style={{ background: day.color }}>
              {s.pinIndex}
            </span>
            <div className={styles.stopBody}>
              <div className={styles.stopName}>{s.naam}</div>
              <div className={styles.stopMeta}>
                {s.tijd}
                {s.plaats ? ` · ${s.plaats}` : ''}
                {s.m2Label ? ` · ${s.m2Label}` : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RouteSvg({
  days,
  focused,
}: {
  days: RouteDay[]
  focused: RouteDay | null
}) {
  return (
    <div className={styles.mapBox}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={styles.svg}>
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M 6 0 L 0 0 0 6"
              fill="none"
              stroke="rgba(26, 86, 255, 0.08)"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="rgba(26, 86, 255, 0.04)" />
        <rect width="100" height="100" fill="url(#grid)" />
        <path
          d="M 28 90 Q 18 70, 22 50 Q 18 30, 35 18 Q 50 10, 70 14 Q 88 18, 92 35 Q 95 55, 85 70 Q 75 85, 55 88 Q 40 92, 28 90 Z"
          fill="rgba(255, 248, 220, 0.65)"
          stroke="rgba(0, 0, 0, 0.15)"
          strokeWidth="0.4"
        />
        {days.flatMap((d) =>
          d.stops.map((s) => (
            <line
              key={`line-${s.lead_id}`}
              x1={BASE_COORD.x}
              y1={BASE_COORD.y}
              x2={s.x}
              y2={s.y}
              stroke={d.color}
              strokeWidth="0.6"
              strokeDasharray="2 1.5"
              opacity={focused && focused.dayKey !== d.dayKey ? 0.15 : 0.85}
            />
          )),
        )}
        {days.flatMap((d) =>
          d.stops.map((s) => (
            <StopPin key={`pin-${s.lead_id}`} stop={s} color={d.color} />
          )),
        )}
        <g>
          <circle
            cx={BASE_COORD.x}
            cy={BASE_COORD.y}
            r="2.4"
            fill="white"
            stroke="#1a1a1a"
            strokeWidth="0.6"
          />
          <circle cx={BASE_COORD.x} cy={BASE_COORD.y} r="0.9" fill="#1a1a1a" />
          <rect
            x={BASE_COORD.x - 5}
            y={BASE_COORD.y + 3.5}
            width="10"
            height="4"
            rx="0.8"
            fill="#1a1a1a"
          />
          <text
            x={BASE_COORD.x}
            y={BASE_COORD.y + 6.4}
            textAnchor="middle"
            fontSize="2.6"
            fontWeight="800"
            fill="white"
            letterSpacing="0.1"
          >
            BASIS
          </text>
        </g>
      </svg>
    </div>
  )
}

function StopPin({ stop, color }: { stop: RouteStop; color: string }) {
  return (
    <g>
      <circle cx={stop.x} cy={stop.y} r="2.6" fill={color} stroke="white" strokeWidth="0.6" />
      <text
        x={stop.x}
        y={stop.y + 0.9}
        textAnchor="middle"
        fontSize="2.6"
        fontWeight="800"
        fill="white"
      >
        {stop.pinIndex}
      </text>
      {stop.tijd && (
        <g>
          <rect
            x={stop.x - 3.4}
            y={stop.y - 6.6}
            width="6.8"
            height="3"
            rx="0.5"
            fill="white"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="0.2"
          />
          <text
            x={stop.x}
            y={stop.y - 4.5}
            textAnchor="middle"
            fontSize="2"
            fontWeight="700"
            fill="#1a1a1a"
          >
            {stop.tijd}
          </text>
        </g>
      )}
    </g>
  )
}

function buildTip(days: RouteDay[]): string | null {
  if (days.length < 2) return null
  const sorted = [...days].sort((a, b) => b.totalKm - a.totalKm)
  if (sorted[0]?.totalKm > 400) {
    return `${sorted[0].label} heeft de langste route (~${sorted[0].totalKm} km). Overweeg om kleinere klussen te combineren of op een andere dag te plannen om reistijd te beperken.`
  }
  return 'Routes zijn redelijk evenwichtig verdeeld over de week. Geen optimalisatie-suggesties.'
}
