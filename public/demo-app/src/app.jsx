// src/app.jsx
// Root: layout shell (sidebar + topbar) + routing + tweaks panel + tweak persistence

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "pipeline",
  "density": "cozy",
  "sidebar": true,
  "dark": false,
  "empty": false,
  "mobilePreview": false
}/*EDITMODE-END*/;

function App() {
  const [hash, navigate] = useHashRoute();
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useStateApp(false);
  const [manualQuote, setManualQuote] = useStateApp(false);
  const [showOnboarding, setShowOnboarding] = useStateApp(false);
  const [exportOpen, setExportOpen] = useStateApp(false);
  const [user, setUser] = useStateApp(() => {
    try { return JSON.parse(localStorage.getItem('frontlix_user') || 'null'); }
    catch { return null; }
  });

  const handleAuth = (u) => {
    setUser(u);
    try { localStorage.setItem('frontlix_user', JSON.stringify(u)); } catch {}
  };
  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem('frontlix_user'); } catch {}
  };

  // Expose globally so screens (Leads, Overzicht) can trigger without prop drilling
  useEffectApp(() => {
    window.__openManualQuote = () => setManualQuote(true);
    window.__logout = handleLogout;
    window.__openOnboarding = () => setShowOnboarding(true);
    window.__openExport = () => setExportOpen(true);
    return () => { delete window.__openManualQuote; delete window.__logout; delete window.__openOnboarding; delete window.__openExport; };
  }, []);

  // Listen to host's edit-mode toggle
  useEffectApp(() => {
    const onMsg = e => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Apply theme + density to body
  useEffectApp(() => {
    document.body.classList.toggle('dark', tweaks.dark);
    document.body.classList.remove('density-compact', 'density-cozy', 'density-roomy');
    document.body.classList.add(`density-${tweaks.density}`);
  }, [tweaks.dark, tweaks.density]);

  const setTweak = (k, v) => {
    const next = typeof k === 'object' ? { ...tweaks, ...k } : { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits: typeof k === 'object' ? k : { [k]: v },
    }, '*');
  };

  // Parse route
  const [page, param] = useMemoApp(() => {
    const parts = hash.split('/').filter(Boolean);
    return [parts[0] || 'overzicht', parts[1]];
  }, [hash]);

  const sidebarShown = tweaks.sidebar && !tweaks.mobilePreview;

  // ── Render Auth gate ────────────────────────────────────────
  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  const appShell = (
    <div className={`app ${sidebarShown ? '' : 'no-sidebar'}`}>
      <Sidebar page={page} navigate={navigate} />
      <main className="main">
        <Topbar page={page} param={param} navigate={navigate} sidebar={sidebarShown} setTweak={setTweak} />
        <div className="content">
          {page === 'overzicht'    && <Overzicht navigate={navigate} empty={tweaks.empty} />}
          {page === 'inbox'        && <Inbox navigate={navigate} />}
          {page === 'leads' && !param && <Leads navigate={navigate} view={tweaks.view} density={tweaks.density} empty={tweaks.empty} />}
          {page === 'leads' && param && <LeadDetail leadId={param} navigate={navigate} />}
          {page === 'agenda'       && <Agenda navigate={navigate} />}
          {page === 'reviews'      && <Reviews navigate={navigate} />}
          {page === 'veldwerk'     && <MobileScreen navigate={navigate} />}
          {page === 'instellingen' && <Instellingen />}
          {page === 'analyses'     && <Analyses />}
        </div>
      </main>
    </div>
  );

  return (
    <React.Fragment>
      {tweaks.mobilePreview
        ? <MobilePreviewShell onExit={() => setTweak('mobilePreview', false)}>{appShell}</MobilePreviewShell>
        : appShell}

      {tweaksOpen && (
        <TweaksWindow
          tweaks={tweaks}
          setTweak={setTweak}
          onClose={() => {
            setTweaksOpen(false);
            window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
          }}
        />
      )}

      {manualQuote && <ManualQuoteModal onClose={() => setManualQuote(false)} />}
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      {exportOpen && <ExportsModal onClose={() => setExportOpen(false)} />}
    </React.Fragment>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────
function Sidebar({ page, navigate }) {
  const navItems = [
    { k: 'overzicht',    l: 'Overzicht',    i: 'home',     badge: null },
    { k: 'inbox',        l: 'Inbox',        i: 'whatsapp', badge: { v: '2', tone: 'live' } },
    { k: 'leads',        l: 'Leads',        i: 'inbox',    badge: { v: '14' } },
    { k: 'agenda',       l: 'Agenda',       i: 'calendar', badge: { v: '4', muted: true } },
    { k: 'reviews',      l: 'Reviews',      i: 'star',     badge: { v: '2', tone: 'live' } },
    { k: 'analyses',     l: 'Analyses',     i: 'chart',    badge: null },
    { k: 'veldwerk',     l: 'Veldwerk',     i: 'phone',    badge: { v: 'PWA', muted: true } },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <img src="assets/frontlix-logo.png" className="sidebar-logo" alt="Frontlix" />
        <div>
          <div className="sidebar-brand">Frontl<span className="ix">ix</span></div>
          <div className="sidebar-tenant">Schoon Straatje</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">Werkruimte</div>
        {navItems.map(item => (
          <button
            key={item.k}
            className={`nav-item ${page === item.k ? 'active' : ''}`}
            onClick={() => navigate(item.k)}
          >
            <Icon name={item.i} size={16} />
            {item.l}
            {item.badge && (
              <span className={`nav-badge ${item.badge.muted ? 'muted' : ''}`} style={
                item.badge.tone === 'live' ? { background: 'linear-gradient(135deg, #16A34A, #22C55E)' } : null
              }>
                {item.badge.v}
              </span>
            )}
          </button>
        ))}

        <div className="sidebar-section">Beheer</div>
        <button
          className={`nav-item ${page === 'instellingen' ? 'active' : ''}`}
          onClick={() => navigate('instellingen')}
        >
          <Icon name="settings" size={16} />Instellingen
        </button>
      </div>

      <div className="sidebar-foot" style={{ position: 'relative' }}>
        <UserMenu />
      </div>
    </aside>
  );
}

// ── UserMenu ───────────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useStateApp(false);
  useEffectApp(() => {
    if (!open) return;
    const onClick = e => {
      if (!e.target.closest('.user-menu-popup') && !e.target.closest('.user-card')) setOpen(false);
    };
    setTimeout(() => document.addEventListener('click', onClick), 50);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  return (
    <React.Fragment>
      <div className="user-card" onClick={() => setOpen(o => !o)}>
        <div className="user-avatar">CT</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name truncate">Christiaan Tromp</div>
          <div className="user-mail truncate">Owner · Schoon Straatje</div>
        </div>
        <Icon name="chevron-down" size={14} style={{ color: 'var(--fg-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {open && (
        <div className="user-menu-popup" style={{
          position: 'absolute',
          bottom: 'calc(100% - 8px)',
          left: 12,
          right: 12,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
          padding: 6,
          zIndex: 100,
        }}>
          {/* Identity */}
          <div style={{
            padding: '12px 12px 14px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 6,
          }}>
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--gradient)', color: 'white',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 14,
              }}>CT</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">Christiaan Tromp</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">christiaan@schoonstraatje.nl</div>
              </div>
            </div>
            <Pill tone="green" sm>Owner-account</Pill>
          </div>

          {[
            { i: 'users',    l: 'Account & profiel',     a: () => alert('Account-instellingen') },
            { i: 'settings', l: 'Werkruimte instellingen', a: () => { window.location.hash = '/instellingen'; setOpen(false); } },
            { i: 'flame',    l: 'Plan & facturatie',     a: () => alert('Pro · €99/mnd · volgende factuur 1 juni') },
            { i: 'mail',     l: 'Help & support',         a: () => alert('Mail naar support@frontlix.com') },
          ].map((it, i) => (
            <button key={i}
              onClick={() => { it.a(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                width: '100%', borderRadius: 8,
                fontSize: 13, color: 'var(--fg-soft)',
                background: 'transparent',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name={it.i} size={14} />
              {it.l}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

          <button
            onClick={() => { window.__logout?.(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              width: '100%', borderRadius: 8,
              fontSize: 13, color: 'var(--danger)',
              background: 'transparent',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Icon name="logout" size={14} />
            Uitloggen
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────
function Topbar({ page, param, navigate, sidebar, setTweak }) {
  const [notifOpen, setNotifOpen] = useStateApp(false);
  const titles = {
    overzicht: { t: 'Overzicht', s: 'Live status van je leadpipeline' },
    leads:     { t: param ? 'Lead' : 'Leads', s: param ? `Detail · ${param}` : 'Alle aanvragen — in de bot, in review, of klaar voor offerte' },
    agenda:    { t: 'Agenda', s: 'Afspraken & plaatsbezoeken' },
    instellingen: { t: 'Instellingen', s: 'Bedrijf, prijzen, bot' },
    analyses:  { t: 'Analyses', s: 'Diepere stats over conversie en omzet' },
    reviews:   { t: 'Reviews', s: 'Klanttevredenheid & NPS-tracking' },
    veldwerk:  { t: 'Veldwerk-modus', s: 'Mobile-first view voor medewerkers op locatie' },
    inbox:     { t: 'Inbox', s: 'Actieve WhatsApp-gesprekken' },
  };
  const tdef = titles[page] || titles.overzicht;
  const isLeadsView = page === 'leads' && !param;

  return (
    <div className="topbar">
      <button className="icon-btn" onClick={() => setTweak('sidebar', !sidebar)}>
        <Icon name="menu" size={18} />
      </button>
      <div>
        <div className="topbar-title">{tdef.t}</div>
        <div className="topbar-sub">{tdef.s}</div>
      </div>

      <div className="topbar-search">
        <Icon name="search" size={14} />
        <input type="text" placeholder="Zoek leads, adressen, telefoon…" />
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-actions">
        {isLeadsView && (
          <ViewSwitcher setTweak={setTweak} />
        )}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.__openManualQuote?.()}
          style={{ marginRight: 4 }}
        >
          <Icon name="plus" size={13} /> Nieuwe offerte
        </button>
        <button
          className="icon-btn notif-trigger"
          onClick={e => { e.stopPropagation(); setNotifOpen(o => !o); }}
        >
          <Icon name="bell" size={18} />
          <span className="dot" />
        </button>
      </div>
      {notifOpen && <NotificationPanel navigate={navigate} onClose={() => setNotifOpen(false)} />}
    </div>
  );
}

function ViewSwitcher({ setTweak }) {
  // Read current view from body class to avoid prop drilling
  const cur = window.__appView || 'pipeline';
  const [val, setVal] = useStateApp(cur);
  useEffectApp(() => { window.__appView = val; setTweak('view', val); }, [val]);
  return (
    <div className="seg" style={{ marginRight: 4 }}>
      <button className={`seg-btn ${val === 'pipeline' ? 'active' : ''}`} onClick={() => setVal('pipeline')}>
        <Icon name="track" size={13} /> Pipeline
      </button>
      <button className={`seg-btn ${val === 'table' ? 'active' : ''}`} onClick={() => setVal('table')}>
        <Icon name="list" size={13} /> Tabel
      </button>
      <button className={`seg-btn ${val === 'kanban' ? 'active' : ''}`} onClick={() => setVal('kanban')}>
        <Icon name="grid" size={13} /> Kaarten
      </button>
    </div>
  );
}

// ── Tweaks Window ──────────────────────────────────────────────────
function TweaksWindow({ tweaks, setTweak, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20, right: 20,
      width: 280,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 20px 50px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08)',
      zIndex: 9999,
      overflow: 'hidden',
    }}>
      <div className="row between" style={{
        padding: '12px 14px',
        background: 'var(--gradient)',
        color: 'white',
      }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="sliders" size={15} />
          <strong style={{ fontSize: 13 }}>Tweaks</strong>
        </div>
        <button onClick={onClose} style={{ color: 'white', display: 'grid', placeItems: 'center', width: 24, height: 24 }}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <TweakField label="Leads-overzicht">
          <div className="seg" style={{ width: '100%' }}>
            {['pipeline', 'table', 'kanban'].map(v => (
              <button
                key={v}
                className={`seg-btn ${tweaks.view === v ? 'active' : ''}`}
                onClick={() => setTweak('view', v)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {v === 'pipeline' ? 'Pipeline' : v === 'table' ? 'Tabel' : 'Kaart'}
              </button>
            ))}
          </div>
        </TweakField>
        <TweakField label="Thema">
          <div className="seg" style={{ width: '100%' }}>
            <button className={`seg-btn ${!tweaks.dark ? 'active' : ''}`} onClick={() => setTweak('dark', false)} style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="sun" size={13} /> Licht
            </button>
            <button className={`seg-btn ${tweaks.dark ? 'active' : ''}`} onClick={() => setTweak('dark', true)} style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="moon" size={13} /> Donker
            </button>
          </div>
        </TweakField>
        <ToggleRowMini
          title="Sidebar zichtbaar"
          on={tweaks.sidebar}
          onChange={v => setTweak('sidebar', v)}
        />
        <ToggleRowMini
          title="📱 Mobile preview"
          on={tweaks.mobilePreview}
          onChange={v => setTweak('mobilePreview', v)}
        />
        <ToggleRowMini
          title="Lege staat (geen data)"
          on={tweaks.empty}
          onChange={v => setTweak('empty', v)}
        />
      </div>
    </div>
  );
}

function TweakField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ToggleRowMini({ title, on, onChange }) {
  return (
    <div className="row between" style={{ padding: '6px 0' }}>
      <span style={{ fontSize: 13 }}>{title}</span>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 36, height: 20,
          borderRadius: 9999,
          background: on ? 'var(--gradient)' : 'var(--surface-2)',
          position: 'relative',
          border: 'none',
        }}
      >
        <div style={{
          width: 14, height: 14,
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: 3,
          left: on ? 19 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  );
}

// ── MobilePreviewShell ────────────────────────────────────────────
// Wraps the dashboard in an iPhone-shaped bezel for "how does it look on my phone?"
function MobilePreviewShell({ children, onExit }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'radial-gradient(ellipse at center, #1A1F2C 0%, #060810 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '32px 20px',
      overflow: 'auto',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 24,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'var(--gradient)',
          display: 'grid', placeItems: 'center',
          color: 'white',
        }}>
          <Icon name="phone" size={15} />
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1.1 }}>
            Mobile preview
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
            iPhone 14 · 390 × 844
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
        <button
          onClick={onExit}
          style={{
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 9,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="x" size={13} /> Terug naar desktop
        </button>
      </div>

      {/* Phone bezel */}
      <div style={{
        width: 414, height: 868,
        background: '#1A1A1C',
        borderRadius: 56,
        padding: 12,
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1.5px #2E2E32, inset 0 0 0 1px rgba(255,255,255,0.04)',
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Side buttons */}
        <div style={{ position: 'absolute', left: -2, top: 110, width: 4, height: 32, background: '#1A1A1C', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: -2, top: 170, width: 4, height: 58, background: '#1A1A1C', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: -2, top: 240, width: 4, height: 58, background: '#1A1A1C', borderRadius: 2 }} />
        <div style={{ position: 'absolute', right: -2, top: 180, width: 4, height: 84, background: '#1A1A1C', borderRadius: 2 }} />

        {/* Screen */}
        <div className="mobile-preview-screen" style={{
          width: '100%', height: '100%',
          borderRadius: 44,
          overflow: 'hidden',
          background: 'var(--bg)',
          position: 'relative',
        }}>
          {/* iOS status bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 44,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 32px',
            zIndex: 9999,
            color: 'var(--fg)',
            fontSize: 13, fontWeight: 600,
            pointerEvents: 'none',
          }}>
            <span>9:41</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M1 7h2v3H1zM5 5h2v5H5zM9 3h2v7H9zM13 1h2v9h-2z"/></svg>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor"><path d="M7 .8C4.6.8 2.4 1.5.6 2.7l1.1 1.4C3.2 3.2 5 2.7 7 2.7s3.8.5 5.3 1.4l1.1-1.4C11.6 1.5 9.4.8 7 .8zM7 4.5c-1.7 0-3.3.5-4.6 1.4l1.1 1.4c1-.7 2.2-1 3.5-1s2.5.3 3.5 1l1.1-1.4C10.3 5 8.7 4.5 7 4.5zM7 8c-.9 0-1.8.2-2.6.7L7 11l2.6-2.3C8.8 8.2 7.9 8 7 8z"/></svg>
              <svg width="24" height="11" viewBox="0 0 24 11" fill="currentColor">
                <rect x="0.5" y="0.5" width="20" height="10" rx="2" fill="none" stroke="currentColor" opacity="0.4"/>
                <rect x="2" y="2" width="14" height="7" rx="1"/>
                <rect x="21" y="3.5" width="1.5" height="4" rx="0.5" opacity="0.4"/>
              </svg>
            </span>
          </div>

          {/* Dynamic island */}
          <div style={{
            position: 'absolute', top: 11, left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 32, borderRadius: 20,
            background: '#000',
            zIndex: 10000,
            pointerEvents: 'none',
          }} />

          {/* App contents */}
          <div style={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'auto',
            background: 'var(--bg)',
            WebkitOverflowScrolling: 'touch',
          }}>
            <div style={{ width: 390, minWidth: 390 }}>
              {children}
            </div>
          </div>

          {/* Home indicator */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%',
            transform: 'translateX(-50%)',
            width: 140, height: 5, borderRadius: 3,
            background: 'var(--fg)',
            opacity: 0.3,
            zIndex: 10000,
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Hint below phone */}
      <div style={{
        marginTop: 20,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 9,
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        textAlign: 'center',
        maxWidth: 480,
      }}>
        Het dashboard is desktop-first; sommige views (zoals de Pipeline) scrollen horizontaal in de phone-frame.
        Voor een dedicated mobiele werkflow: zie <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Veldwerk</strong> in de sidebar.
      </div>
    </div>
  );
}

// ── Analyses (lightweight extra screen) ────────────────────────────
function Analyses() {
  return (
    <div className="content-inner">
      <div className="section-head">
        <div>
          <div className="section-title">Analyses</div>
          <div className="section-sub">Diepere stats over conversie, omzet en bot-prestaties</div>
        </div>
      </div>
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Omzet Q2"             value={62400} prefix="€" delta="+18%"  trend={[12,18,22,28,35,48,62]} />
        <KpiCard label="Gem. offerte-waarde"  value={847}   prefix="€" delta="+€42"  trend={[700,720,740,760,790,820,847]} />
        <KpiCard label="Bot-onafhankelijk"    value={89}    suffix="%" delta="+3 pt" trend={[78,80,82,84,86,88,89]} />
        <KpiCard label="Cancellations"        value={4}     delta="–2"  trend={[8,7,6,6,5,5,4]} invertDelta />
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Omzet per maand (12 mnd)</div>
        <AreaChart data={[8400, 9200, 11000, 12800, 14500, 16200, 15800, 17400, 18900, 19800, 21400, 23100]} height={240} />
      </div>
    </div>
  );
}

function InboxRedirect({ navigate }) {
  useEffectApp(() => { navigate('leads/L-2087'); }, []);
  return null;
}

// ── Mount ──────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
