// src/optie-a/AShared.jsx
// Optie A — shared tokens, icons, bottom nav, helpers (theme-aware)

const fmtA = (n) => '€' + n.toLocaleString('nl-NL');

// Themed design tokens
function makeATheme({ dark = false, accent = '#1A56FF', accent2 = '#00CFFF' } = {}) {
  return {
    dark,
    bg:         dark ? '#000000' : '#F2F2F7',
    surface:    dark ? '#1C1C1E' : '#FFFFFF',
    surface2:   dark ? '#2C2C2E' : '#F2F2F7',
    elev:       dark ? '#2A2A2D' : '#FFFFFF',
    fg:         dark ? '#FFFFFF' : '#000000',
    fgMuted:    dark ? '#8E8E93' : '#8E8E93',
    fgSoft:     dark ? '#C7C7CC' : '#555555',
    border:     dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)',
    borderSoft: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
    chipBg:     dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
    accent,
    accent2,
    success: '#22C55E',
    warning: '#F59E0B',
    danger:  '#FF453A',
    wa:      '#25D366',
  };
}

// Icon set used throughout Optie A
function AIcon({ name, size = 18, stroke = 2, color = 'currentColor', fill = 'none' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill,
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':    return <svg {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case 'inbox':   return <svg {...p}><path d="M3 13l3-9h12l3 9"/><path d="M3 13v6h18v-6"/><path d="M9 13a3 3 0 006 0"/></svg>;
    case 'list':    return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case 'cal':     return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'truck':   return <svg {...p}><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'menu':    return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'plus':    return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'arrow':   return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'back':    return <svg {...p}><path d="M19 12H5M11 19l-7-7 7-7"/></svg>;
    case 'chev':    return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevd':   return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case 'check':   return <svg {...p}><path d="M5 12l5 5L20 7"/></svg>;
    case 'x':       return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'phone':   return <svg {...p}><path d="M5 4h4l2 5-2 1a11 11 0 005 5l1-2 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>;
    case 'wa':      return <svg {...p}><path d="M21 12a9 9 0 01-13.6 7.8L3 21l1.3-4.3A9 9 0 1121 12z"/><path d="M8.5 9.5c.5 2.5 3.5 5.5 6 6"/></svg>;
    case 'spark':   return <svg {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 16l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9L16.4 18.6 18.3 17.9z"/></svg>;
    case 'bolt':    return <svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>;
    case 'pin':     return <svg {...p}><path d="M12 21s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'euro':    return <svg {...p}><path d="M18 7a6 6 0 100 10"/><path d="M3 10h10M3 14h10"/></svg>;
    case 'pct':     return <svg {...p}><path d="M5 19L19 5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>;
    case 'clock':   return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'user':    return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>;
    case 'cam':     return <svg {...p}><path d="M3 7h4l2-2h6l2 2h4v12H3z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case 'fire':    return <svg {...p}><path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-10z"/></svg>;
    case 'bell':    return <svg {...p}><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 004 0"/></svg>;
    case 'search':  return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.4-4.4"/></svg>;
    case 'filter':  return <svg {...p}><path d="M4 6h16M7 12h10M10 18h4"/></svg>;
    case 'star':    return <svg {...p}><path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/></svg>;
    case 'chart':   return <svg {...p}><path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-7M21 16v-2"/></svg>;
    case 'doc':     return <svg {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>;
    case 'map':     return <svg {...p}><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>;
    case 'sun':     return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>;
    default:        return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

// Sparkline
function ASpark({ data, color = '#1A56FF', height = 36, width = 100, fill = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const dx = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * dx;
    const y = height - ((v - min) / Math.max(1, max - min)) * (height - 4) - 2;
    return [x, y];
  });
  const path = 'M' + pts.map(p => p.join(' ')).join(' L');
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.12"/>}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Live indicator dot
function ALiveDot({ color = '#22C55E' }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', background: color,
      display: 'inline-block', boxShadow: `0 0 0 3px ${color}26`,
    }} />
  );
}

// Bottom tab bar (themed)
function ABottomNav({ active = 'home', t, onTab, hasMeerBadge }) {
  const items = [
    { k: 'home',  i: 'home',  l: 'Overzicht' },
    { k: 'leads', i: 'list',  l: 'Leads',  badge: 14 },
    { k: 'inbox', i: 'inbox', l: 'Inbox',  badge: 2 },
    { k: 'cal',   i: 'cal',   l: 'Agenda' },
    { k: 'meer',  i: 'menu',  l: 'Meer',  dot: hasMeerBadge },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingTop: 8, paddingBottom: 26,
      background: t.dark ? 'rgba(28,28,30,0.88)' : 'rgba(255,255,255,0.86)',
      borderTop: '0.5px solid ' + t.border,
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      zIndex: 10,
    }}>
      {items.map(it => {
        const on = it.k === active;
        const c = on ? t.accent : t.fgMuted;
        return (
          <button key={it.k} onClick={() => onTab?.(it.k)} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, color: c, position: 'relative',
            background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer',
          }}>
            <div style={{ position: 'relative' }}>
              <AIcon name={it.i} size={22} stroke={on ? 2.2 : 1.8} color={c}/>
              {it.badge && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: t.danger, color: 'white',
                  fontSize: 9, fontWeight: 700,
                  padding: '1px 4px', borderRadius: 8, minWidth: 14, textAlign: 'center',
                  lineHeight: 1.3,
                }}>{it.badge}</span>
              )}
              {it.dot && !it.badge && (
                <span style={{
                  position: 'absolute', top: -1, right: -3,
                  width: 8, height: 8, borderRadius: '50%',
                  background: t.danger,
                  border: '2px solid ' + (t.dark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)'),
                }}/>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{it.l}</span>
          </button>
        );
      })}
    </div>
  );
}

// iOS-style sub-screen nav bar (back · title · right slot)
function ANavBar({ title, t, onBack, right, sub }) {
  return (
    <div style={{
      position: 'absolute', top: 54, left: 0, right: 0, zIndex: 9,
      paddingTop: 0, paddingBottom: 8,
      background: t.dark ? 'rgba(28,28,30,0.84)' : 'rgba(255,255,255,0.86)',
      borderBottom: '0.5px solid ' + t.borderSoft,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    }}>
      <div style={{
        height: 44, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 12px',
      }}>
        <button onClick={onBack} style={{
          minWidth: 64, display: 'flex', alignItems: 'center', gap: 2,
          background: 'transparent', border: 'none', color: t.accent,
          fontSize: 17, fontWeight: 500, padding: 4,
        }}>
          <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>
            <AIcon name="chev" size={20} stroke={2.4} color={t.accent}/>
          </span>
          <span>Terug</span>
        </button>
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.fg,
              letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          {sub && <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 1 }}>{sub}</div>}
        </div>
        <div style={{ minWidth: 64, display: 'flex', justifyContent: 'flex-end' }}>
          {right || <span style={{ visibility: 'hidden' }}>x</span>}
        </div>
      </div>
    </div>
  );
}

// Avatar with initials
function AAvatar({ name, size = 36, t, tint }) {
  const initials = (name || '?').split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase();
  const tints = [t.accent, '#0891B2', '#16A34A', '#7C3AED', '#DB2777'];
  const tc = tint != null ? tints[tint % tints.length] : tints[(name.length || 0) % tints.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: tc + '20', color: tc,
      display: 'grid', placeItems: 'center', flexShrink: 0,
      fontSize: size * 0.36, fontWeight: 700,
    }}>{initials}</div>
  );
}

// ── Mock data (echoes data.jsx, simplified for mobile screens) ──
const A_KPIS = {
  omzet:     { v: 18420, label: 'Omzet maand',  delta: '+€3.1k', trend: [11000,13000,14500,15800,16400,17800,18420] },
  leads:     { v: 14,    label: 'Nieuwe leads', delta: '+22%',   trend: [4,7,5,9,12,10,14] },
  conversie: { v: 64,    label: 'Conversie',    delta: '+8 pt',  trend: [52,55,58,60,61,62,64], suffix: '%' },
  reactie:   { v: 47,    label: 'Reactietijd',  delta: '−12s',   trend: [62,58,55,52,50,48,47], suffix: 's' },
  open:      { v: 7,     label: 'Offertes open',delta: '+2',     trend: [3,4,5,5,6,7,7] },
};

const A_URGENT = [
  { id: 'L-2084', name: 'Familie Bakker',  why: 'Wacht 4u 12m op owner-review',  meta: '€736 · korstmos',   tone: 'amber', age: '4u 12m' },
  { id: 'L-2080', name: 'Peter Hofstra',   why: 'Buiten radius — beslissen',     meta: '86 km · Utrecht · €998', tone: 'red',  age: '6u' },
  { id: 'L-2083', name: 'Thomas Wilms',    why: 'Vroeg om korting',              meta: '€395',              tone: 'blue', age: '12m' },
  { id: 'L-2086', name: 'Bouwbedrijf Korstmos', why: 'Offerte verstuurd — opvolgen', meta: '€4.180',         tone: 'blue', age: '2u' },
  { id: 'L-2078', name: 'David Klein',     why: 'Nieuwe lead — geen contact',    meta: 'WhatsApp',           tone: 'amber', age: '1u 4m' },
];

const A_FEED = [
  { kind: 'wa',    name: 'Jeroen de Vries',       text: 'stuurde 4 foto\'s',                 time: '2m',    ago: 'nu' },
  { kind: 'new',   name: 'Thomas Wilms',          text: 'vroeg om korting op €395',          time: '12m',   ago: 'nu' },
  { kind: 'appt',  name: 'Marieke v.d. Heijden',  text: 'bevestigde di 09:00',               time: '24m',   ago: 'nu' },
  { kind: 'quote', name: 'Familie Bakker',        text: 'wacht op owner-review',             time: '47m',   ago: 'vandaag' },
  { kind: 'new',   name: 'David Klein',           text: 'kwam binnen via formulier',         time: '1u',    ago: 'vandaag' },
  { kind: 'quote', name: 'Bouwbedrijf Korstmos',  text: 'offerte €4.180 verstuurd',          time: '2u',    ago: 'vandaag' },
  { kind: 'appt',  name: 'Sandra Janssen',        text: 'afspraak vr 8:30 ingepland',        time: 'gist 18:20', ago: 'gisteren' },
  { kind: 'quote', name: 'Korstmos B.V.',         text: 'akkoord €4.180',                    time: 'gist 16:02', ago: 'gisteren' },
  { kind: 'new',   name: 'VVE Stadshof',          text: 'kwam binnen via website',           time: 'gist 11:30', ago: 'gisteren' },
];

const A_TODAY = [
  { tijd: '10:30', name: 'Marieke v.d. Heijden', adres: 'Wilhelminapark 12 · Utrecht',  kind: 'plaatsbezoek', dur: '45m' },
  { tijd: '13:00', name: 'Familie Bakker',       adres: 'Kerkstraat 8 · Bilthoven',     kind: 'klus',         dur: '3u' },
  { tijd: '15:30', name: 'VVE Stadshof',         adres: 'Stadshof 1-24 · Zeist',        kind: 'klus',         dur: '2u' },
];

Object.assign(window, {
  AIcon, ASpark, ALiveDot, ABottomNav, ANavBar, AAvatar, makeATheme,
  fmtA, A_KPIS, A_URGENT, A_FEED, A_TODAY,
});
