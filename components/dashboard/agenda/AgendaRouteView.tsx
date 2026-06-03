'use client'

import Link from 'next/link'
import { Lightbulb, ExternalLink, TrendingDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import styles from './AgendaRouteView.module.css'

/**
 * Volledige routekaart-UI in één client-component. Bevat:
 * - Google Map met AdvancedMarkers per stop + InfoWindow on click
 * - DirectionsRenderer per dag (echte route over wegen)
 * - Sidebar met dagindeling, live km + rijtijd, en optimalisatie-bonus
 * - Modus-toggle: retour (BASIS → klanten → BASIS) vs enkel (BASIS → klanten)
 * - Per dag een "Open in Google Maps" deep-link (handig op telefoon)
 * - Verkeer-aware rijtijd via `drivingOptions.departureTime`
 *
 * Gebruikt `useMapsLibrary('routes')` om de DirectionsService runtime te
 * laden. Per dag wordt 1 route-request gedaan met `optimizeWaypoints: true`
 *, Google reorganiseert de stops voor de kortste totaalafstand.
 */

export type MapStop = {
  lead_id: string
  naam: string
  plaats: string | null
  m2Label: string | null
  tijd: string
  pinIndex: number
  dayKey: string
  color: string
  lat: number
  lng: number
  /** Volledige adres-string voor "Open in Google Maps" deep-link. */
  adres: string | null
}

export type MapDay = {
  dayKey: string
  label: string // "donderdag 14 mei"
  color: string
  stops: MapStop[]
}

export type DayTab = {
  dayKey: string
  shortLabel: string // "wo 13"
  color: string
}

type DayRouteResult = {
  km: number
  minutes: number
  /** km wanneer Google de huidige stop-volgorde NIET optimaliseert. */
  unoptimizedKm: number | null
}

type RouteMode = 'retour' | 'enkel'

const DEFAULT_CENTER = { lat: 52.1326, lng: 5.2913 } // ~midden NL
const DEFAULT_ZOOM = 7

export function AgendaRouteView({
  apiKey,
  mapId,
  days,
  focusedDayKey,
  totalStops,
  missingCount,
  tip,
  dayTabs,
  base,
}: {
  apiKey: string
  mapId: string
  days: MapDay[]
  focusedDayKey: string | null
  totalStops: number
  missingCount: number
  tip: string | null
  dayTabs: DayTab[]
  base: { lat: number; lng: number; label: string }
}) {
  const [routeByDay, setRouteByDay] = useState(
    () => new Map<string, DayRouteResult>(),
  )
  const [mode, setMode] = useState<RouteMode>('retour')
  const [activeStop, setActiveStop] = useState<MapStop | null>(null)

  const setRouteForDay = useCallback(
    (dayKey: string, route: DayRouteResult) => {
      setRouteByDay((prev) => {
        const next = new Map(prev)
        next.set(dayKey, route)
        return next
      })
    },
    [],
  )

  const switchMode = useCallback((next: RouteMode) => {
    setMode((prev) => {
      if (prev === next) return prev
      setRouteByDay(new Map())
      return next
    })
  }, [])

  const visibleDays = useMemo(
    () => (focusedDayKey ? days.filter((d) => d.dayKey === focusedDayKey) : days),
    [days, focusedDayKey],
  )

  const allStops = useMemo(() => days.flatMap((d) => d.stops), [days])

  const totalKm = useMemo(
    () => [...routeByDay.values()].reduce((sum, r) => sum + r.km, 0),
    [routeByDay],
  )

  const totalSavedKm = useMemo(
    () =>
      [...routeByDay.values()].reduce(
        (sum, r) =>
          sum + (r.unoptimizedKm !== null ? Math.max(0, r.unoptimizedKm - r.km) : 0),
        0,
      ),
    [routeByDay],
  )

  return (
    <APIProvider apiKey={apiKey}>
      <div className={styles.grid}>
        <div className={`dash-card ${styles.mapCard}`}>
          <div className={styles.mapHead}>
            <div>
              <div className={styles.mapTitle}>Routekaart van de week</div>
              <div className={styles.mapSub}>
                {totalStops} stop{totalStops === 1 ? '' : 's'}
                {totalKm > 0 ? ` · ~${totalKm} km ${modeLabel(mode)}` : ''} · vanuit {base.label}
                {missingCount > 0 ? ` · ${missingCount} zonder coords` : ''}
              </div>
            </div>
            <div className={styles.tabs}>
              <Link
                href="/agenda?view=routekaart"
                className={`${styles.tab} ${!focusedDayKey ? styles.tabActive : ''}`}
              >
                Hele week
              </Link>
              {dayTabs.map((t) => (
                <Link
                  key={t.dayKey}
                  href={`/agenda?view=routekaart&dag=${t.dayKey}`}
                  className={`${styles.tab} ${focusedDayKey === t.dayKey ? styles.tabActive : ''}`}
                >
                  <span className={styles.tabDot} style={{ background: t.color }} />
                  {t.shortLabel}
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.mapBox}>
            <GoogleMap
              mapId={mapId}
              defaultCenter={DEFAULT_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              gestureHandling="greedy"
              mapTypeControl={false}
              fullscreenControl={false}
              streetViewControl={false}
              className={styles.map}
              onClick={() => setActiveStop(null)}
            >
              <BasePin base={base} />
              {allStops
                .filter((s) => !focusedDayKey || s.dayKey === focusedDayKey)
                .map((s) => (
                  <AdvancedMarker
                    key={s.lead_id}
                    position={{ lat: s.lat, lng: s.lng }}
                    onClick={() => setActiveStop(s)}
                    title={`${s.naam}${s.plaats ? ` · ${s.plaats}` : ''} · ${s.tijd}`}
                  >
                    <Pin
                      background={s.color}
                      borderColor="white"
                      glyphColor="white"
                      glyph={`${s.pinIndex}`}
                      scale={1.2}
                    />
                  </AdvancedMarker>
                ))}
              {activeStop && (
                <InfoWindow
                  position={{ lat: activeStop.lat, lng: activeStop.lng }}
                  pixelOffset={[0, -42]}
                  onCloseClick={() => setActiveStop(null)}
                >
                  <div className={styles.infoWindow}>
                    <div className={styles.infoName}>{activeStop.naam}</div>
                    {activeStop.plaats && (
                      <div className={styles.infoMeta}>{activeStop.plaats}</div>
                    )}
                    <div className={styles.infoMeta}>
                      {activeStop.tijd}
                      {activeStop.m2Label ? ` · ${activeStop.m2Label}` : ''}
                    </div>
                    <a
                      href={`/leads/${activeStop.lead_id}`}
                      className={styles.infoLink}
                    >
                      Bekijk lead →
                    </a>
                  </div>
                </InfoWindow>
              )}
              <DirectionsLayer
                days={visibleDays}
                mode={mode}
                base={base}
                onRoute={setRouteForDay}
              />
              <FitBounds
                stops={allStops}
                focusedDayKey={focusedDayKey}
                base={base}
              />
            </GoogleMap>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className="dash-card">
            <div className="dash-card-head">
              <div>
                <div className="dash-card-title">Dagindeling</div>
                <div className="dash-card-sub">
                  {totalStops} stop{totalStops === 1 ? '' : 's'}
                  {totalKm > 0 ? ` · ~${totalKm} km ${modeLabel(mode)}` : ''}
                  {missingCount > 0 ? ` · ${missingCount} zonder coords` : ''}
                </div>
              </div>
            </div>
            <div className={styles.dayList}>
              {visibleDays.length === 0 && (
                <div className={styles.empty}>Geen routes deze week.</div>
              )}
              {visibleDays.map((d) => (
                <DayBlock
                  key={d.dayKey}
                  day={d}
                  route={routeByDay.get(d.dayKey) ?? null}
                  base={base}
                  mode={mode}
                />
              ))}
            </div>
            {visibleDays.length > 0 && (
              <div className={styles.modeToggleBar}>
                <span className={styles.modeToggleLabel}>Berekenwijze</span>
                <div className={styles.modeToggle} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'enkel'}
                    onClick={() => switchMode('enkel')}
                    className={`${styles.modeBtn} ${mode === 'enkel' ? styles.modeBtnActive : ''}`}
                    title="Alleen heenreis: BASIS → laatste klant"
                  >
                    Enkel
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'retour'}
                    onClick={() => switchMode('retour')}
                    className={`${styles.modeBtn} ${mode === 'retour' ? styles.modeBtnActive : ''}`}
                    title="Heen + terug: BASIS → klanten → BASIS"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>

          {totalSavedKm > 0 && (
            <div className={`dash-card ${styles.savingsCard}`}>
              <div className={styles.savingsHead}>
                <TrendingDown size={14} />
                <span>Route-optimalisatie</span>
              </div>
              <div className={styles.savingsBody}>
                Google&apos;s optimale volgorde bespaart{' '}
                <strong>~{totalSavedKm} km</strong> per week t.o.v. de boekings-
                volgorde. Pin-nummers tonen al de geoptimaliseerde route.
              </div>
            </div>
          )}

          {tip && (
            <div className={`dash-card ${styles.tipCard}`}>
              <div className={styles.tipHead}>
                <Lightbulb size={14} />
                <span>Tip</span>
              </div>
              <div className={styles.tipBody}>{tip}</div>
            </div>
          )}
        </div>
      </div>
    </APIProvider>
  )
}

/* ── BASIS-pin (thuisbasis) ─────────────────────────────── */
function BasePin({ base }: { base: { lat: number; lng: number; label: string } }) {
  return (
    <AdvancedMarker
      position={{ lat: base.lat, lng: base.lng }}
      title={`Thuisbasis · ${base.label}`}
    >
      <div className={styles.basisPin}>{base.label.toUpperCase()}</div>
    </AdvancedMarker>
  )
}

/* ── DirectionsLayer: routes + verkeer + optimalisatie-vergelijking ─
   - Per dag 1 hoofdroute (geoptimaliseerd) → polyline + km + tijd
   - Per dag 1 stille extra-route (boekingsvolgorde) → alleen voor km-vergelijking,
     wordt NIET gerenderd op de kaart
   - Verkeer-aware: drivingOptions.departureTime = afspraak-tijd
*/
function DirectionsLayer({
  days,
  mode,
  base,
  onRoute,
}: {
  days: MapDay[]
  mode: RouteMode
  base: { lat: number; lng: number }
  onRoute: (dayKey: string, route: DayRouteResult) => void
}) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')

  useEffect(() => {
    if (!map || !routesLib) return
    const service = new routesLib.DirectionsService()
    const renderers: google.maps.DirectionsRenderer[] = []

    for (const day of days) {
      if (day.stops.length === 0) continue

      const renderer = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: day.color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        },
      })
      renderers.push(renderer)

      const stops = day.stops
      const origin = { lat: base.lat, lng: base.lng }
      const destination =
        mode === 'retour'
          ? { lat: base.lat, lng: base.lng }
          : { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng }
      const waypointStops =
        mode === 'retour' ? stops : stops.slice(0, -1)
      const waypoints = waypointStops.map((s) => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true,
      }))

      // Bepaal vertrektijd voor verkeer-aware schatting: eerste afspraak-tijd
      // van de dag, of nu+1u als geen tijd bekend. Google heeft FUTURE tijd
      // nodig, anders negeert 'ie trafficModel.
      const departureTime = parseFirstAppointmentTime(day) ?? nextHour()

      service.route(
        {
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime,
            trafficModel: google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          if (status !== google.maps.DirectionsStatus.OK || !result) {
            console.warn(`[directions] ${day.dayKey} status=${status}`)
            return
          }
          renderer.setDirections(result)
          const legs = result.routes[0]?.legs ?? []
          const meters = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0)
          const seconds = legs.reduce(
            (s, l) => s + (l.duration_in_traffic?.value ?? l.duration?.value ?? 0),
            0,
          )

          // Tweede call zonder waypoint-optimalisatie → vergelijking voor de
          // "bespaarde km" indicator. Faalt deze stil, dan is unoptimizedKm null.
          if (waypoints.length >= 2) {
            service.route(
              {
                origin,
                destination,
                waypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (cmp, cmpStatus) => {
                let unoptKm: number | null = null
                if (cmpStatus === google.maps.DirectionsStatus.OK && cmp) {
                  const cmpMeters = (cmp.routes[0]?.legs ?? []).reduce(
                    (s, l) => s + (l.distance?.value ?? 0),
                    0,
                  )
                  unoptKm = Math.round(cmpMeters / 1000)
                }
                onRoute(day.dayKey, {
                  km: Math.round(meters / 1000),
                  minutes: Math.round(seconds / 60),
                  unoptimizedKm: unoptKm,
                })
              },
            )
          } else {
            onRoute(day.dayKey, {
              km: Math.round(meters / 1000),
              minutes: Math.round(seconds / 60),
              unoptimizedKm: null,
            })
          }
        },
      )
    }

    return () => {
      for (const r of renderers) r.setMap(null)
    }
  }, [map, routesLib, days, mode, base, onRoute])

  return null
}

/* ── Fit bounds rondom basis + alle (of gefocuste) stops ── */
function FitBounds({
  stops,
  focusedDayKey,
  base,
}: {
  stops: MapStop[]
  focusedDayKey: string | null
  base: { lat: number; lng: number }
}) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (typeof google === 'undefined' || !google.maps) return
    const visible = focusedDayKey
      ? stops.filter((s) => s.dayKey === focusedDayKey)
      : stops
    if (visible.length === 0) {
      map.setCenter(DEFAULT_CENTER)
      map.setZoom(DEFAULT_ZOOM)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    bounds.extend({ lat: base.lat, lng: base.lng })
    for (const s of visible) bounds.extend({ lat: s.lat, lng: s.lng })
    map.fitBounds(bounds, 60)
  }, [map, stops, focusedDayKey, base])
  return null
}

/* ── Dag-blok in de zijbalk ─────────────────────────────── */
function DayBlock({
  day,
  route,
  base,
  mode,
}: {
  day: MapDay
  route: DayRouteResult | null
  base: { lat: number; lng: number }
  mode: RouteMode
}) {
  const gmapsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(day, base, mode),
    [day, base, mode],
  )

  return (
    <div className={styles.dayBlock}>
      <div className={styles.dayHead}>
        <div className={styles.dayLabel}>{day.label}</div>
        <div className={styles.dayStats}>
          {route ? (
            <>
              <span>~{route.km} km</span>
              <span>·</span>
              <span>{formatDuration(route.minutes)}</span>
            </>
          ) : (
            <span className={styles.dayLoading}>…berekenen</span>
          )}
        </div>
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
      {gmapsUrl && (
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.openMapsBtn}
        >
          <ExternalLink size={12} />
          Open in Google Maps
        </a>
      )}
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────── */

function modeLabel(mode: RouteMode): string {
  return mode === 'retour' ? 'retour' : 'enkele rit'
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  if (rest === 0) return `${hours}u`
  return `${hours}u ${rest}min`
}

/**
 * Bouw een deep-link naar Google Maps mobile/web met de rit van die dag.
 * Format: https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
 *
 * Op telefoon opent dit direct de Google Maps app als die geïnstalleerd is,  * handig voor de uitvoerders die onderweg gaan.
 */
function buildGoogleMapsDirectionsUrl(
  day: MapDay,
  base: { lat: number; lng: number },
  mode: RouteMode,
): string | null {
  if (day.stops.length === 0) return null
  const stops = day.stops
  const origin = `${base.lat},${base.lng}`
  const destination =
    mode === 'retour'
      ? `${base.lat},${base.lng}`
      : `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`
  const waypointStops = mode === 'retour' ? stops : stops.slice(0, -1)
  const waypoints = waypointStops
    .map((s) => `${s.lat},${s.lng}`)
    .join('|')

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  })
  if (waypoints) params.set('waypoints', waypoints)

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Parse de eerste afspraak-tijd ("HH:mm") van een dag naar een Date.
 * Gebruikt om `drivingOptions.departureTime` te zetten, Google houdt dan
 * rekening met spits-verkeer op die echte tijd.
 */
function parseFirstAppointmentTime(day: MapDay): Date | null {
  const firstTime = day.stops.find((s) => s.tijd)?.tijd
  if (!firstTime) return null
  const match = firstTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const [, hh, mm] = match
  const [y, m, d] = day.dayKey.split('-').map(Number)
  if (!y || !m || !d) return null
  // Gebruik de dag-key + tijd; tijd is in NL-tijd, we doen .Z niet zodat
  // browser de lokale tijd interpreteert (alle Frontlix-klanten zijn NL).
  const date = new Date(y, m - 1, d, Number(hh), Number(mm))
  // Als de datum in het verleden ligt → Google negeert traffic. Dan +1 week.
  if (date.getTime() < Date.now()) {
    date.setDate(date.getDate() + 7)
  }
  return date
}

function nextHour(): Date {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}
