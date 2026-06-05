// src/components/RouteMap.jsx
// Geographic route map for the week's appointments — schematic NL silhouette with pins + driving order

const { useState: useStateRM, useMemo: useMemoRM } = React;

// Schematic regional coordinates (relative, 0-100). Not actual NL — visually spaced for clarity.
const CITY_COORDS = {
  'Biervliet':   { x: 16, y: 78, label: 'Biervliet (basis)' },
  'Rotterdam':   { x: 36, y: 48 },
  'Pijnacker':   { x: 50, y: 38 },
  'Delft':       { x: 28, y: 36 },
  'Den Haag':    { x: 22, y: 28 },
  'Utrecht':     { x: 64, y: 42 },
};

function RouteMap({ appointments }) {
  const [selectedDay, setSelectedDay] = useStateRM(0); // 0=all week, 1-5=ma-vr

  // Group by date
  const byDate = useMemoRM(() => {
    const map = {};
    appointments.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appointments]);

  const dates = Object.keys(byDate).sort();
  const colors = ['#1A56FF', '#00CFFF', '#16A34A', '#F59E0B', '#A855F7', '#EC4899'];

  // Pins to render
  const pins = useMemoRM(() => {
    const arr = [];
    let order = 1;
    dates.forEach((date, di) => {
      const dayAppts = byDate[date];
      dayAppts.forEach((a) => {
        const city = a.adres.split(',')[0]?.trim() || a.adres;
        const coord = CITY_COORDS[city] || CITY_COORDS['Den Haag'];
        arr.push({
          x: coord.x,
          y: coord.y,
          name: a.name,
          city,
          date,
          start: a.start,
          end: a.end,
          color: colors[di % colors.length],
          order: order++,
          m2: a.m2,
          dayIdx: di,
        });
      });
    });
    return arr;
  }, [byDate]);

  // Build day-routes (Biervliet → pin → Biervliet)
  const routes = useMemoRM(() => {
    return dates.map((date, di) => {
      const base = CITY_COORDS['Biervliet'];
      const pts = pins.filter(p => p.date === date);
      const all = [base, ...pts, base];
      return {
        date,
        color: colors[di % colors.length],
        points: all,
        km: estimateKm(all),
        count: pts.length,
      };
    });
  }, [pins, dates]);

  const visibleRoutes = selectedDay === 0 ? routes : routes.slice(selectedDay - 1, selectedDay);
  const visiblePins = selectedDay === 0 ? pins : pins.filter(p => p.dayIdx === selectedDay - 1);
  const totalKm = routes.reduce((s, r) => s + r.km, 0);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head">
        <div>
          <div className="card-title">Routekaart van de week</div>
          <div className="card-sub">{pins.length} stops · ~{Math.round(totalKm)} km totaal · vanuit Biervliet</div>
        </div>
        <div className="seg">
          <button className={`seg-btn ${selectedDay === 0 ? 'active' : ''}`} onClick={() => setSelectedDay(0)}>Hele week</button>
          {dates.map((d, i) => (
            <button
              key={d}
              className={`seg-btn ${selectedDay === i + 1 ? 'active' : ''}`}
              onClick={() => setSelectedDay(i + 1)}
              style={{ position: 'relative' }}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: colors[i % colors.length], marginRight: 4, verticalAlign: '-1px',
              }} />
              {new Date(d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: 0,
        height: 520,
      }}>
        {/* SVG map */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #E6F2FF 0%, #DCEEFF 30%, #C8E4F8 100%)',
          overflow: 'hidden',
        }}>
          {/* Land mass — schematic NL silhouette */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
          }}>
            <defs>
              <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5F7E8" />
                <stop offset="100%" stopColor="#E8EBD8" />
              </linearGradient>
            </defs>
            {/* Approximate NL outline */}
            <path
              d="M 12,18 Q 18,14 26,16 L 35,12 L 42,10 L 50,12 L 58,10 L 64,14 L 68,22 Q 72,30 70,38 L 72,48 L 74,58 L 70,68 L 62,76 L 50,82 L 36,84 L 22,80 L 14,74 L 8,62 L 6,48 L 8,32 Z"
              fill="url(#land)"
              stroke="#B8BC9C"
              strokeWidth="0.3"
            />
            {/* Belgium edge */}
            <path
              d="M 0,82 L 22,80 L 36,84 L 50,82 L 62,76 L 70,68 L 100,72 L 100,100 L 0,100 Z"
              fill="#EFF1DC"
              opacity="0.6"
            />

            {/* Grid */}
            {[20, 40, 60, 80].map(v => (
              <g key={v} stroke="rgba(26,86,255,0.06)" strokeWidth="0.15">
                <line x1="0" y1={v} x2="100" y2={v} />
                <line x1={v} y1="0" x2={v} y2="100" />
              </g>
            ))}

            {/* Routes (lines from base back to base) */}
            {visibleRoutes.map((r, i) => {
              const path = r.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={r.color}
                  strokeWidth="0.5"
                  strokeDasharray="2 1.2"
                  opacity="0.7"
                />
              );
            })}
          </svg>

          {/* Pins */}
          {visiblePins.map((pin, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${pin.x}%`, top: `${pin.y}%`,
              transform: 'translate(-50%, -100%)',
              cursor: 'pointer',
              zIndex: pin.order,
            }} title={`${pin.name} · ${pin.start}`}>
              <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  width: 28, height: 28,
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: pin.color,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid white',
                }}>
                  <span style={{
                    transform: 'rotate(45deg)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 13,
                  }}>{pin.order}</span>
                </div>
                <div style={{
                  marginTop: 4,
                  background: 'white',
                  padding: '3px 8px',
                  borderRadius: 9999,
                  fontSize: 10,
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap',
                }}>
                  {pin.start}
                </div>
              </div>
            </div>
          ))}

          {/* Base marker — Biervliet */}
          <div style={{
            position: 'absolute',
            left: `${CITY_COORDS['Biervliet'].x}%`,
            top: `${CITY_COORDS['Biervliet'].y}%`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}>
            <div style={{
              width: 18, height: 18,
              borderRadius: '50%',
              background: 'white',
              border: '3px solid var(--primary)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }} />
            <div style={{
              marginTop: 4,
              background: 'var(--primary)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              Basis
            </div>
          </div>

          {/* Legend */}
          <div style={{
            position: 'absolute',
            bottom: 14, left: 14,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 11,
            color: '#1A1A1A',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <strong style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.06, color: '#666' }}>Schaal</strong>
            <div style={{ marginTop: 4 }}>Schematisch · Zuid- en West-Nederland</div>
          </div>
        </div>

        {/* Side panel — day breakdown */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          padding: 14,
          background: 'var(--surface)',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Dagindeling
          </div>
          {routes.filter(r => r.count > 0).map((r, i) => {
            const dayPins = pins.filter(p => p.date === r.date).sort((a, b) => a.order - b.order);
            return (
              <div key={r.date} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${r.color}`,
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>
                    {new Date(r.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </strong>
                  <Pill tone="gray" sm>~{Math.round(r.km)} km</Pill>
                </div>
                {dayPins.map(p => (
                  <div key={p.order} className="row" style={{ gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <span style={{
                      width: 18, height: 18, flexShrink: 0,
                      borderRadius: '50%',
                      background: r.color, color: 'white',
                      display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}>{p.order}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{p.start} · {p.city} · {p.m2}m²</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{
            marginTop: 14,
            padding: 12,
            background: 'rgba(26,86,255,.06)',
            border: '1px solid rgba(26,86,255,.2)',
            borderRadius: 10,
          }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: 12 }}>Tip</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginTop: 6, lineHeight: 1.5 }}>
              Sandra (vr) en Marieke (di) liggen 5km uit elkaar — overweeg ze op dezelfde dag in te plannen voor ~40km minder rijden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function estimateKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy) * 4.2; // arbitrary scale to km-ish
  }
  return total;
}

window.RouteMap = RouteMap;
