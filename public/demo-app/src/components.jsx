// src/components.jsx
// Shared building blocks + icon set (inline SVG) + helpers
// All exports attached to window at bottom.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Icon (inline SVG, lucide-style 1.75 stroke) ─────────────────────
function Icon({ name, size = 18, stroke = 1.75, ...rest }) {
  const P = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    ...rest,
  };
  switch (name) {
    case 'home':       return (<svg {...P}><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></svg>);
    case 'inbox':      return (<svg {...P}><path d="M3 12h6l1 3h4l1-3h6"/><path d="M5 5h14l2 7v7H3v-7z"/></svg>);
    case 'calendar':   return (<svg {...P}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    case 'chart':      return (<svg {...P}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 4 5-7"/></svg>);
    case 'settings':   return (<svg {...P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case 'search':     return (<svg {...P}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>);
    case 'bell':       return (<svg {...P}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>);
    case 'plus':       return (<svg {...P}><path d="M12 5v14M5 12h14"/></svg>);
    case 'chevron-down': return (<svg {...P}><path d="m6 9 6 6 6-6"/></svg>);
    case 'chevron-right': return (<svg {...P}><path d="m9 6 6 6-6 6"/></svg>);
    case 'arrow-up':   return (<svg {...P}><path d="M12 19V5M5 12l7-7 7 7"/></svg>);
    case 'arrow-down': return (<svg {...P}><path d="M12 5v14M5 12l7 7 7-7"/></svg>);
    case 'arrow-right': return (<svg {...P}><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
    case 'check':      return (<svg {...P}><path d="M20 6 9 17l-5-5"/></svg>);
    case 'x':          return (<svg {...P}><path d="M18 6 6 18M6 6l12 12"/></svg>);
    case 'phone':      return (<svg {...P}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>);
    case 'mail':       return (<svg {...P}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>);
    case 'mappin':     return (<svg {...P}><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>);
    case 'whatsapp':   return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1s-.5-.1-.7.2-.8 1-1 1.2-.3.2-.6.1c-.4-.2-1.5-.6-2.8-1.7-1-.9-1.7-2.1-1.9-2.4-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5L8.6 6c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6 1.9.7 2.6.8 3.5.7.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.3-.1-.1-.2-.2-.4-.3zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg>);
    case 'image':      return (<svg {...P}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>);
    case 'file':       return (<svg {...P}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>);
    case 'tag':        return (<svg {...P}><path d="M20.6 13.4 12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1"/></svg>);
    case 'sparkle':    return (<svg {...P}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>);
    case 'flame':      return (<svg {...P}><path d="M8.5 14a4 4 0 0 0 7 0c0-3-2-4-2-7 0 0-3 .5-3 3-1-1-1.5-2-1.5-3-2 1-3 4-3 6a2.5 2.5 0 0 0 2.5 1z"/></svg>);
    case 'edit':       return (<svg {...P}><path d="M11 4H4v16h16v-7"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.5l-4 1 1-4z"/></svg>);
    case 'send':       return (<svg {...P}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>);
    case 'paperclip':  return (<svg {...P}><path d="m21 12-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3l7.5-7.5"/></svg>);
    case 'menu':       return (<svg {...P}><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
    case 'filter':     return (<svg {...P}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>);
    case 'grid':       return (<svg {...P}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>);
    case 'list':       return (<svg {...P}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>);
    case 'track':      return (<svg {...P}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/></svg>);
    case 'bot':        return (<svg {...P}><rect x="3" y="8" width="18" height="12" rx="3"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="14" r="1.2"/><path d="M12 4v4M8 4h8"/></svg>);
    case 'clock':      return (<svg {...P}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'euro':       return (<svg {...P}><path d="M18 7a6 6 0 0 0-9 1m0 8a6 6 0 0 0 9 1"/><path d="M3 10h10M3 14h10"/></svg>);
    case 'square':     return (<svg {...P}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>);
    case 'sun':        return (<svg {...P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
    case 'moon':       return (<svg {...P}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>);
    case 'sliders':    return (<svg {...P}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>);
    case 'star':       return (<svg {...P}><path d="m12 3 2.7 6 6.3.5-4.8 4.2 1.5 6.3L12 16.8 6.3 20l1.5-6.3L3 9.5 9.3 9z"/></svg>);
    case 'archive':    return (<svg {...P}><rect x="2" y="4" width="20" height="5" rx="2"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4"/></svg>);
    case 'users':      return (<svg {...P}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a4 4 0 0 0 0-8"/><path d="M22 21a7 7 0 0 0-5-7"/></svg>);
    case 'logout':     return (<svg {...P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>);
    case 'eye':        return (<svg {...P}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>);
    case 'sticky':     return (<svg {...P}><path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2h-4"/><path d="M16 21v-4a2 2 0 0 1 2-2h4"/></svg>);
    case 'building':   return (<svg {...P}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01"/></svg>);
    default:           return null;
  }
}

// ── Pill (status badge) ─────────────────────────────────────────────
function Pill({ tone = 'gray', children, dot = false, sm = false }) {
  return (
    <span className={`pill pill-${tone}`} style={sm ? { fontSize: 10, padding: '2px 7px' } : null}>
      {dot ? <span className="pill-dot" /> : null}
      {children}
    </span>
  );
}

// ── Avatar from initials ────────────────────────────────────────────
function Avatar({ name, size = 'md', tint }) {
  const initials = useMemo(() => {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
  }, [name]);
  const t = tint || (1 + (name.charCodeAt(0) % 5));
  return <div className={`avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''} tint-${t}`}>{initials}</div>;
}

// ── Tiny inline sparkline ───────────────────────────────────────────
function Sparkline({ data, w = 80, h = 30, color = 'var(--primary)', fill = true }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="kpi-spark" width={w} height={h}>
      {fill && (
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A56FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1A56FF" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#sg-${color.replace(/[^a-z]/gi,'')})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Bigger area chart ───────────────────────────────────────────────
function AreaChart({ data, height = 140 }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 14) - 4]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${w},${height} L 0,${height} Z`;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={w} height={height} className="area-chart">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A56FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1A56FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1A56FF" />
            <stop offset="100%" stopColor="#00CFFF" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1="0" x2={w} y1={height * p} y2={height * p} stroke="var(--border)" strokeDasharray="2 4" />
        ))}
        <path d={area}  fill="url(#areaFill)" />
        <path d={path}  fill="none" stroke="url(#areaStroke)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          i === pts.length - 1
            ? <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="white" stroke="var(--primary)" strokeWidth="2.4" />
            : null
        ))}
      </svg>
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────
function KpiCard({ label, value, prefix, suffix, delta, trend, invertDelta }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (typeof value !== 'number') return;
    setShown(0);
    const start = Date.now();
    const duration = 900;
    const it = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p >= 1) clearInterval(it);
    }, 16);
    return () => clearInterval(it);
  }, [value]);
  const formatted = useMemo(() => {
    if (typeof value !== 'number') return value;
    if (value >= 1000) return Math.round(shown).toLocaleString('nl-NL');
    if (value % 1 === 0) return Math.round(shown);
    return shown.toFixed(1);
  }, [shown, value]);
  const positive = delta && (delta.startsWith('+') || delta.startsWith('–') === false);
  const isNeutral = delta === '—';
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {prefix ? <span className="unit">{prefix}</span> : null}
        <span className="tabular">{formatted}</span>
        {suffix ? <span className="unit">{suffix}</span> : null}
      </div>
      <div className="kpi-foot">
        {!isNeutral && (
          <span className={`kpi-delta ${invertDelta ? (positive ? 'down' : 'up') : (positive ? 'up' : 'down')}`}>
            {delta}
          </span>
        )}
        {isNeutral && <span className="kpi-delta">—</span>}
        <span>vs vorige week</span>
      </div>
      <Sparkline data={trend} w={88} h={36} />
    </div>
  );
}

// ── Hash router ─────────────────────────────────────────────────────
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#\/?/, '') || 'overzicht');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.replace(/^#\/?/, '') || 'overzicht');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback(to => { window.location.hash = `/${to}`; }, []);
  return [hash, navigate];
}

// ── Format helpers ──────────────────────────────────────────────────
const fmtEur = n => '€' + Math.round(n).toLocaleString('nl-NL');
const fmtEurDec = n => '€ ' + n.toFixed(2).replace('.', ',');

Object.assign(window, {
  Icon, Pill, Avatar, Sparkline, AreaChart, KpiCard, useHashRoute, fmtEur, fmtEurDec,
});
