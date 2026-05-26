// src/screens/MobileFlow.jsx
// Mobile shell + flow controller — replaces the desktop layout on small viewports.
// Owns: bottom-nav tab → real route, page rendering, and Overzicht's internal drilldown stack.

const { useState: useStateMF, useEffect: useEffectMF, useMemo: useMemoMF } = React;

// Hook: are we on a mobile-shaped viewport, OR is mobilePreview tweak on?
function useIsMobile(mobilePreview) {
  const [w, setW] = useStateMF(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffectMF(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return !!mobilePreview || w < 720;
}

// Map route page → bottom-nav tab key
const PAGE_TO_TAB = {
  overzicht:    'home',
  leads:        'leads',
  inbox:        'inbox',
  agenda:       'cal',
  reviews:      'meer',
  analyses:     'meer',
  veldwerk:     'meer',
  instellingen: 'meer',
};
const TAB_TO_PAGE = {
  home:  'overzicht',
  leads: 'leads',
  inbox: 'inbox',
  cal:   'agenda',
  // 'meer' opens a sheet — handled in MobileShell, not a route
};

// ── Mobile shell ──────────────────────────────────────────
// Owns: per-page content, bottom-nav, meer-sheet, theme
function MobileShell({ page, param, navigate, tweaks, setTweak, empty }) {
  const t = useMemoMF(() => makeATheme({ dark: !!tweaks?.dark }), [tweaks?.dark]);
  const activeTab = PAGE_TO_TAB[page] || 'home';
  const [meerOpen, setMeerOpen] = useStateMF(false);

  const onTab = (k) => {
    if (k === 'meer') {
      setMeerOpen(true);
    } else {
      setMeerOpen(false);
      navigate(TAB_TO_PAGE[k] || 'overzicht');
    }
  };
  const onMeerNav = (route) => {
    setMeerOpen(false);
    navigate(route);
  };

  // Apply theme bg to the host body too so safe-areas blend
  useEffectMF(() => {
    document.body.style.background = t.bg;
    return () => { document.body.style.background = ''; };
  }, [t.bg]);

  // 2 reviews + 0 analyses + 0 instellingen — surface a dot if any are pending
  const hasMeerBadge = true;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg, color: t.fg,
      overflow: 'hidden',
    }}>
      {page === 'overzicht' && (
        <MobileOverzichtPage t={t} navigate={navigate} empty={empty}/>
      )}
      {page === 'leads' && !param && (
        <MobileFallback t={t} title="Leads" navigate={navigate}
          desc="Hier komt het mobiele leads-overzicht. Voor nu open je een lead via het dashboard."/>
      )}
      {page === 'leads' && param && (
        <MobileFallback t={t} title={`Lead ${param}`} navigate={navigate}
          back="leads"
          desc="Mobiel lead-detail komt eraan."/>
      )}
      {page === 'inbox' && (
        <MobileFallback t={t} title="Inbox" navigate={navigate}
          desc="WhatsApp-conversaties op mobiel — komt eraan."/>
      )}
      {page === 'agenda' && (
        <MobileFallback t={t} title="Agenda" navigate={navigate}
          desc="Agenda-overzicht op mobiel — voor nu zie 'Vandaag' vanuit Overzicht."/>
      )}
      {page === 'veldwerk' && (
        <MobileFallback t={t} title="Veldwerk" navigate={navigate}
          desc="De veldwerk-flow is ontworpen als telefoon-view. Open Dashboard.html en kies Veldwerk in de sidebar voor de iOS-frame demo."/>
      )}
      {page === 'reviews' && (
        <MobileFallback t={t} title="Reviews" navigate={navigate}
          desc="Reviews-overzicht op mobiel — komt eraan."/>
      )}
      {page === 'analyses' && (
        <MobileFallback t={t} title="Analyses" navigate={navigate}
          desc="Analyses op mobiel — komt eraan."/>
      )}
      {page === 'instellingen' && (
        <MobileFallback t={t} title="Instellingen" navigate={navigate}
          desc="Instellingen op mobiel — komt eraan."/>
      )}

      <ABottomNav active={activeTab} t={t} onTab={onTab} hasMeerBadge={hasMeerBadge}/>
      <MeerSheet open={meerOpen} t={t} onClose={() => setMeerOpen(false)} onNav={onMeerNav} setTweak={setTweak} tweaks={tweaks}/>
    </div>
  );
}

// ── Overzicht-page met interne drilldown stack ────────────
function MobileOverzichtPage({ t, navigate, empty }) {
  // sub state: null | 'watnu' | 'vandaag' | 'feed'
  const [sub, setSub] = useStateMF(null);
  // animate slide-in
  const slideRef = React.useRef(null);

  const open = (key) => {
    if (key === 'watnu' || key === 'vandaag' || key === 'feed') {
      setSub(key);
    } else if (key === 'search') {
      // future: search overlay
    } else {
      navigate(key);
    }
  };
  const back = () => setSub(null);

  if (empty) {
    return (
      <div style={{
        height: '100%', background: t.bg, color: t.fg,
        paddingTop: 64, paddingBottom: 86, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}>
        <AIcon name="inbox" size={36} color={t.fgMuted}/>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.fg, marginTop: 14 }}>
          Nog geen leads
        </div>
        <div style={{ fontSize: 13, color: t.fgMuted, marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
          Surface staat live en wacht op je eerste aanvraag.
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Base layer — main overzicht (kept mounted) */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: sub ? 'translateX(-20%) scale(0.96)' : 'translateX(0)',
        opacity: sub ? 0 : 1,
        transition: 'transform .28s ease, opacity .2s ease',
        pointerEvents: sub ? 'none' : 'auto',
      }}>
        <AOverzicht t={t} onOpen={open} showBottomNav={false}/>
      </div>

      {/* Drilldown layer */}
      <div ref={slideRef} style={{
        position: 'absolute', inset: 0,
        transform: sub ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s ease',
        pointerEvents: sub ? 'auto' : 'none',
      }}>
        {sub === 'watnu'   && <AWatNu t={t} onBack={back} showBottomNav={false}/>}
        {sub === 'vandaag' && <AVandaag t={t} onBack={back} showBottomNav={false}/>}
        {sub === 'feed'    && <AActiviteit t={t} onBack={back} showBottomNav={false}/>}
      </div>
    </div>
  );
}

// ── Fallback voor pages die nog geen mobiel ontwerp hebben ──
function MobileFallback({ t, title, desc, navigate, back }) {
  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 60, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      <div style={{ padding: '8px 20px 14px' }}>
        {back && (
          <button onClick={() => navigate(back)} style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 14, fontWeight: 500, padding: '6px 0 12px',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>
              <AIcon name="chev" size={18} color={t.accent}/>
            </span>
            Terug
          </button>
        )}
        <div style={{ fontSize: 28, fontWeight: 800, color: t.fg,
            letterSpacing: '-0.025em', lineHeight: 1.05 }}>{title}</div>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <div style={{
          background: t.surface, borderRadius: 16, padding: 18,
          boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.accent + '14', color: t.accent,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <AIcon name="spark" size={17}/>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.fg }}>Mobiele versie komt eraan</div>
            <div style={{ fontSize: 13, color: t.fgSoft, marginTop: 4, lineHeight: 1.45 }}>
              {desc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.MobileShell = MobileShell;
window.useIsMobile = useIsMobile;
window.MobileBezel = MobileBezel;

// ── Meer-sheet — slides up from above bottom-nav ──
// Houses Reviews, Analyses, Veldwerk, Instellingen + profile chip
function MeerSheet({ open, t, onClose, onNav, setTweak, tweaks }) {
  const items = [
    { route: 'reviews',  i: 'star',  l: 'Reviews',
      s: '2 nieuwe deze week',           tone: '#F59E0B', badge: '2' },
    { route: 'analyses', i: 'chart', l: 'Analyses',
      s: 'Conversie, omzet, bot-prestaties', tone: '#7C3AED' },
    { route: 'veldwerk', i: 'truck', l: 'Veldwerk',
      s: 'Voor onderweg · iOS-frame demo',   tone: '#0891B2', tag: 'PWA' },
  ];
  return (
    <React.Fragment>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,.36)',
        opacity: open ? 1 : 0,
        transition: 'opacity .22s ease',
        pointerEvents: open ? 'auto' : 'none',
        zIndex: 25,
      }}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform .28s cubic-bezier(.32,.72,0,1)',
        background: t.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow: '0 -12px 36px rgba(0,0,0,.20)',
        padding: '10px 8px 100px',
        zIndex: 26,
        maxHeight: '78%',
        overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ width: 38, height: 5, borderRadius: 3,
          background: t.dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)',
          margin: '4px auto 12px' }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', padding: '0 12px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.fgMuted,
              textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Meer
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', color: t.accent,
            border: 'none', fontSize: 13, fontWeight: 600, padding: 6,
          }}>Sluit</button>
        </div>

        {/* Section: workspace extras */}
        <div style={{ padding: '0 4px' }}>
          {items.map((m, i, arr) => (
            <button key={m.route} onClick={() => onNav(m.route)} style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 12px', minHeight: 60,
              background: 'transparent', border: 'none',
              borderBottom: i < arr.length - 1 ? '0.5px solid ' + t.borderSoft : 'none',
              textAlign: 'left', cursor: 'pointer', color: t.fg,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11,
                background: m.tone + '18', color: m.tone,
                display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <AIcon name={m.i} size={19}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.fg }}>{m.l}</div>
                <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 1 }}>{m.s}</div>
              </div>
              {m.badge && <span style={{
                background: t.danger, color: 'white',
                fontSize: 11, fontWeight: 700,
                padding: '2px 7px', borderRadius: 9, marginRight: 4,
              }}>{m.badge}</span>}
              {m.tag && <span style={{
                background: t.chipBg, color: t.fgMuted,
                fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 8, marginRight: 4,
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>{m.tag}</span>}
              <AIcon name="chev" size={16} color={t.fgMuted}/>
            </button>
          ))}
        </div>

        {/* Section: theme toggle inline */}
        <div style={{ padding: '12px 8px 0', display: 'flex', gap: 8 }}>
          <button onClick={() => setTweak?.('dark', !tweaks?.dark)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '14px 12px', minHeight: 50,
            background: t.chipBg, color: t.fg, border: 'none',
            borderRadius: 12, fontSize: 13, fontWeight: 600,
          }}>
            <AIcon name="sun" size={16}/>
            {tweaks?.dark ? 'Schakel naar licht' : 'Schakel naar donker'}
          </button>
        </div>

        {/* Profile chip + Instellingen */}
        <div style={{ padding: '14px 8px 0' }}>
          <div style={{
            background: t.bg, borderRadius: 14, padding: 12,
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid ' + t.borderSoft,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1A56FF,#00CFFF)',
              color: 'white', display: 'grid', placeItems: 'center',
              fontSize: 15, fontWeight: 700, flexShrink: 0 }}>CT</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.fg,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Christiaan Tromp
              </div>
              <div style={{ fontSize: 12, color: t.fgMuted,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Owner · Schoon Straatje
              </div>
            </div>
            <button onClick={() => onNav('instellingen')} style={{
              background: t.accent, color: 'white', border: 'none',
              padding: '9px 14px', minHeight: 36, borderRadius: 10,
              fontSize: 12, fontWeight: 600, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <AIcon name="spark" size={13}/> Instellingen
            </button>
          </div>
          <button onClick={() => { onClose(); window.__logout?.(); }} style={{
            width: '100%', marginTop: 8, padding: '13px',
            background: 'transparent', color: t.danger, border: 'none',
            fontSize: 13, fontWeight: 600,
          }}>Uitloggen</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ── Phone-shaped bezel for mobile-preview mode ──
// Wraps a MobileShell with the iOS phone chrome so designers can test on desktop.
// Note: positions MobileShell correctly (the existing MobilePreviewShell is built
// for scaled-desktop content and doesn't give children a positioned container).
function MobileBezel({ children, onExit }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'radial-gradient(ellipse at center, #1A1F2C 0%, #060810 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '32px 20px',
      overflow: 'auto',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 24,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg,#1A56FF,#00CFFF)',
          display: 'grid', placeItems: 'center', color: 'white', fontSize: 14, fontWeight: 700,
        }}>📱</div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1.1 }}>
            Mobiel · live preview
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
            iPhone 14 · 390 × 844 · echte mobiele UI
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }}/>
        <button onClick={onExit} style={{
          padding: '7px 14px',
          background: 'rgba(255,255,255,0.1)', color: 'white',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          ✕ Terug naar desktop
        </button>
      </div>

      {/* Phone bezel */}
      <div style={{
        width: 414, height: 868,
        background: '#1A1A1C',
        borderRadius: 56,
        padding: 12,
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1.5px #2E2E32, inset 0 0 0 1px rgba(255,255,255,0.04)',
        position: 'relative', flexShrink: 0,
      }}>
        {/* Side buttons */}
        <div style={{ position: 'absolute', left: -2, top: 110, width: 4, height: 32, background: '#1A1A1C', borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: -2, top: 170, width: 4, height: 58, background: '#1A1A1C', borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: -2, top: 240, width: 4, height: 58, background: '#1A1A1C', borderRadius: 2 }}/>
        <div style={{ position: 'absolute', right: -2, top: 180, width: 4, height: 84, background: '#1A1A1C', borderRadius: 2 }}/>

        {/* Screen — positioned context for MobileShell */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: 44, overflow: 'hidden',
          background: '#000',
          position: 'relative',
        }}>
          {/* Dynamic island */}
          <div style={{
            position: 'absolute', top: 11, left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 32, borderRadius: 20,
            background: '#000', zIndex: 10000, pointerEvents: 'none',
          }}/>
          {/* Status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 44,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 32px', zIndex: 9999,
            color: 'white', fontSize: 13, fontWeight: 600, pointerEvents: 'none',
          }}>
            <span>9:41</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7h2v3H1zM5 5h2v5H5zM9 3h2v7H9zM13 1h2v9h-2z"/></svg>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor"><path d="M7 .8C4.6.8 2.4 1.5.6 2.7l1.1 1.4C3.2 3.2 5 2.7 7 2.7s3.8.5 5.3 1.4l1.1-1.4C11.6 1.5 9.4.8 7 .8zM7 4.5c-1.7 0-3.3.5-4.6 1.4l1.1 1.4c1-.7 2.2-1 3.5-1s2.5.3 3.5 1l1.1-1.4C10.3 5 8.7 4.5 7 4.5zM7 8c-.9 0-1.8.2-2.6.7L7 11l2.6-2.3C8.8 8.2 7.9 8 7 8z"/></svg>
              <svg width="24" height="11" viewBox="0 0 24 11" fill="currentColor"><rect x="0.5" y="0.5" width="20" height="10" rx="2" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="14" height="7" rx="1"/><rect x="21" y="3.5" width="1.5" height="4" rx="0.5" opacity="0.4"/></svg>
            </span>
          </div>

          {/* App contents — MobileShell uses position:absolute inset:0 to fill */}
          {children}

          {/* Home indicator */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%',
            transform: 'translateX(-50%)',
            width: 140, height: 5, borderRadius: 3,
            background: 'white', opacity: 0.3,
            zIndex: 10000, pointerEvents: 'none',
          }}/>
        </div>
      </div>
    </div>
  );
}
