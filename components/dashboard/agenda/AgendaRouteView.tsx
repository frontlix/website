'use client'

import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import styles from './AgendaRouteView.module.css'

/**
 * Volledige routekaart-UI in één client-component. Bevat zowel de map als
 * de dagindeling-sidebar zodat we de Directions-response (km + rijtijd per
 * dag) live kunnen tonen — die data komt namelijk pas binnen NADAT Google
 * Maps in de browser is geladen.
 *
 * Gebruikt `useMapsLibrary('routes')` om de DirectionsService runtime te
 * laden. Per dag wordt 1 route-request gedaan: BASIS → alle stops → BASIS,
 * met `optimizeWaypoints: true` zodat Google de optimale volgorde kiest.
 *
 * Polylines op de kaart worden door DirectionsRenderer getekend (we
 * suppressen de default markers; onze AdvancedMarkers blijven zichtbaar).
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
}

export type MapDay = {
  dayKey: string
  label: string // "donderdag 14 mei"
  color: string
  stops: MapStop[]
}

type DayRouteResult = {
  km: number
  minutes: number
}

type RouteMode = 'retour' | 'enkel'

const BASE_LAT = 51.3057
const BASE_LNG = 3.6515
const DEFAULT_CENTER = { lat: 52.1326, lng: 5.2913 }
const DEFAULT_ZOOM = 7

export type DayTab = {
  dayKey: string
  shortLabel: string // "wo 13"
  color: string
}

export function AgendaRouteView({
  apiKey,
  mapId,
  days,
  focusedDayKey,
  totalStops,
  missingCount,
  tip,
  dayTabs,
}: {
  apiKey: string
  mapId: string
  days: MapDay[]
  focusedDayKey: string | null
  totalStops: number
  missingCount: number
  tip: string | null
  dayTabs: DayTab[]
}) {
  const [routeByDay, setRouteByDay] = useState(
    () => new Map<string, DayRouteResult>(),
  )
  const [mode, setMode] = useState<RouteMode>('retour')

  // Bij mode-switch: oude resultaten wissen zodat sidebar "berekenen…"
  // toont terwijl Google opnieuw routes berekent.
  const switchMode = useCallback((next: RouteMode) => {
    setMode((prev) => {
      if (prev === next) return prev
      setRouteByDay(new Map())
      return next
    })
  }, [])

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

  const visibleDays = useMemo(
    () => (focusedDayKey ? days.filter((d) => d.dayKey === focusedDayKey) : days),
    [days, focusedDayKey],
  )

  const allStops = useMemo(() => days.flatMap((d) => d.stops), [days])

  // Totaal km voor de header (sum van alle dagen waarvan we al een route
  // hebben — andere dagen worden ge-update zodra hun route binnen is)
  const totalKm = useMemo(
    () =>
      [...routeByDay.values()].reduce((sum, r) => sum + r.km, 0),
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
                {totalKm > 0 ? ` · ~${totalKm} km ${modeLabel(mode)}` : ''} · vanuit Biervliet
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
            >
              <BasePin />
              {allStops
                .filter(
                  (s) => !focusedDayKey || s.dayKey === focusedDayKey,
                )
                .map((s) => (
                  <AdvancedMarker
                    key={s.lead_id}
                    position={{ lat: s.lat, lng: s.lng }}
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
              <DirectionsLayer
                days={visibleDays}
                mode={mode}
                onRoute={setRouteForDay}
              />
              <FitBounds stops={allStops} focusedDayKey={focusedDayKey} />
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

/* ── BASIS-pin (thuisbasis Biervliet) ──────────────────── */
function BasePin() {
  return (
    <AdvancedMarker
      position={{ lat: BASE_LAT, lng: BASE_LNG }}
      title="Thuisbasis · Biervliet"
    >
      <div className={styles.basisPin}>BASIS</div>
    </AdvancedMarker>
  )
}

/* ── DirectionsLayer: per dag 1 route-call + draw polyline ──
   - origin = destination = BASIS (rondje terug naar huis)
   - waypoints = alle stops (geoptimaliseerd door Google)
   - polyline-kleur = dag-kleur
   - resultaat-km/min wordt via onRoute aan parent doorgegeven */
function DirectionsLayer({
  days,
  mode,
  onRoute,
}: {
  days: MapDay[]
  mode: RouteMode
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
        suppressMarkers: true, // we tekenen zelf AdvancedMarkers
        preserveViewport: true,
        polylineOptions: {
          strokeColor: day.color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        },
      })
      renderers.push(renderer)

      // Retour: BASIS → alle stops → BASIS (rondreis, default).
      // Enkel : BASIS → alle stops behalve laatste → laatste stop (geen
      //         terugrit naar BASIS). Bij 1 stop is dat gewoon BASIS → die stop.
      const stops = day.stops
      const origin = { lat: BASE_LAT, lng: BASE_LNG }
      let destination: { lat: number; lng: number }
      let waypoints: { location: { lat: number; lng: number }; stopover: true }[]

      if (mode === 'retour') {
        destination = { lat: BASE_LAT, lng: BASE_LNG }
        waypoints = stops.map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        }))
      } else {
        const last = stops[stops.length - 1]
        destination = { lat: last.lat, lng: last.lng }
        waypoints = stops.slice(0, -1).map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        }))
      }

      service.route(
        {
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status !== google.maps.DirectionsStatus.OK || !result) {
            console.warn(
              `[directions] ${day.dayKey} status=${status}`,
            )
            return
          }
          renderer.setDirections(result)
          const legs = result.routes[0]?.legs ?? []
          const meters = legs.reduce(
            (s, l) => s + (l.distance?.value ?? 0),
            0,
          )
          const seconds = legs.reduce(
            (s, l) => s + (l.duration?.value ?? 0),
            0,
          )
          onRoute(day.dayKey, {
            km: Math.round(meters / 1000),
            minutes: Math.round(seconds / 60),
          })
        },
      )
    }

    return () => {
      for (const r of renderers) r.setMap(null)
    }
  }, [map, routesLib, days, mode, onRoute])

  return null
}

/* ── Fit bounds rondom basis + alle (of gefocuste) stops ── */
function FitBounds({
  stops,
  focusedDayKey,
}: {
  stops: MapStop[]
  focusedDayKey: string | null
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
    bounds.extend({ lat: BASE_LAT, lng: BASE_LNG })
    for (const s of visible) bounds.extend({ lat: s.lat, lng: s.lng })
    map.fitBounds(bounds, 60)
  }, [map, stops, focusedDayKey])
  return null
}

/* ── Dag-blok in de zijbalk ─────────────────────────────── */
function DayBlock({
  day,
  route,
}: {
  day: MapDay
  route: DayRouteResult | null
}) {
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
            <span
              className={styles.stopPin}
              style={{ background: day.color }}
            >
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

/** Tekst voor de subtitels: "retour" of "enkele rit". */
function modeLabel(mode: RouteMode): string {
  return mode === 'retour' ? 'retour' : 'enkele rit'
}

/**
 * "75 min" → "1u 15min", "30 min" → "30 min". Houdt het compact zodat de
 * dag-header niet wrapt.
 */
function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  if (rest === 0) return `${hours}u`
  return `${hours}u ${rest}min`
}
