// src/inbox-c/InboxC.jsx
// Werkende Variant C — Tijdlijn-grouped met:
//  - Gepind sectie bovenaan (eigen blok boven Nu actief)
//  - Sectie-acties (markeer alles gelezen / open Surface-overzicht)
//  - Swipe-acties per rij (← contact, → admin)
//  - Sticky search-knop in header
//  - Tap rij → opent ChatDetail (via prop)

function InboxC({ t, onOpenChat, onOpenSearch }) {
  // Bucket conversations by activity-window
  const buckets = React.useMemo(() => {
    const out = { pinned: [], live: [], today: [], yest: [], older: [] };
    IB_CONVOS_SORTED.forEach(c => {
      if (c.pinned) { out.pinned.push(c); return; }
      const ts = c.timestamp;
      if (ts === 'nu' || /^\d+m$/.test(ts)) out.live.push(c);
      else if (/^\d+u$/.test(ts)) out.today.push(c);
      else if (ts === 'gist') out.yest.push(c);
      else out.older.push(c);
    });
    return out;
  }, []);

  const totalUnread = IB_CONVOS.reduce((s, c) => s + (c.unread || 0), 0);
  const liveCount = buckets.live.length;

  const SURFACE = '#7C3AED';

  const sections = [
    { key: 'pinned', label: 'Gepind',     icon: 'pin',   list: buckets.pinned, tint: '#D97706', pin: true },
    { key: 'live',   label: 'Nu actief',  icon: 'bolt',  list: buckets.live,   tint: t.danger,  hot: true,
      sub: 'Laatste 30 minuten' },
    { key: 'today',  label: 'Vandaag',    icon: 'clock', list: buckets.today,  tint: t.accent },
    { key: 'yest',   label: 'Gisteren',   icon: 'cal',   list: buckets.yest,   tint: t.fgMuted },
    { key: 'older',  label: 'Eerder',     icon: 'doc',   list: buckets.older,  tint: t.fgMuted },
  ].filter(s => s.list.length > 0);

  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      <IBHeader t={t}
        title="Inbox"
        sub={<><ALiveDot/> {liveCount} live · {totalUnread} ongelezen</>}
        right={<>
          <button onClick={onOpenSearch} style={hdrBtnStyle(t)} aria-label="Zoek">
            <AIcon name="search" size={18}/>
          </button>
        </>}
      />

      <div style={{ padding: '0 16px 18px' }}>
        {sections.map(s => (
          <SectionC key={s.key} section={s} t={t} onOpenChat={onOpenChat}/>
        ))}
      </div>

      <ABottomNav active="inbox" t={t}/>
    </div>
  );
}

function hdrBtnStyle(t) {
  return {
    width: 40, height: 40, borderRadius: 20,
    background: t.chipBg, border: 'none', color: t.fg,
    display: 'grid', placeItems: 'center', cursor: 'pointer',
  };
}

// ── Section ──────────────────────────────────────────────────
function SectionC({ section, t, onOpenChat }) {
  const unreadInSection = section.list.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 4px 10px',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7,
          background: section.tint + '18', color: section.tint,
          display: 'inline-grid', placeItems: 'center', flexShrink: 0,
        }}>
          <AIcon name={section.icon} size={12} stroke={2.4} color={section.tint}/>
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: t.fg,
            letterSpacing: '-0.005em',
          }}>{section.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: t.fgMuted,
            background: t.chipBg, padding: '2px 7px', borderRadius: 9999,
          }}>{section.list.length}</span>
          {section.sub && (
            <span style={{ fontSize: 11, color: t.fgMuted, marginLeft: 2 }}>
              · {section.sub}
            </span>
          )}
          {section.hot && (
            <span style={{
              marginLeft: 4,
              width: 6, height: 6, borderRadius: '50%',
              background: section.tint,
              boxShadow: '0 0 0 4px ' + section.tint + '24',
              animation: 'icPulse 1.6s ease-in-out infinite',
            }}/>
          )}
        </div>
        {/* Section action — "markeer alles gelezen" als er ongelezen zijn */}
        {unreadInSection > 0 && (
          <button style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 12, fontWeight: 600, padding: 4, cursor: 'pointer',
          }}>Markeer gelezen</button>
        )}
        <style>{`@keyframes icPulse { 50% { transform: scale(1.4); opacity: .55; } }`}</style>
      </div>

      {/* Card-group */}
      <div style={{
        background: t.surface, borderRadius: 12,
        overflow: 'hidden',
        boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      }}>
        {section.list.map((c, i) => (
          <SwipeableInboxRow
            key={c.id} c={c} t={t}
            divider={i < section.list.length - 1}
            onOpenChat={onOpenChat}
            highlight={section.hot}
          />
        ))}
      </div>
    </div>
  );
}

// ── Swipeable row ────────────────────────────────────────────
const ICR_REVEAL = 144;
const ICR_THRESHOLD = 40;

function SwipeableInboxRow({ c, t, divider, onOpenChat, highlight }) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startX = React.useRef(0);
  const startDx = React.useRef(0);
  const moved = React.useRef(false);

  function onDown(e) {
    setDragging(true);
    startX.current = e.clientX;
    startDx.current = dx;
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    setDx(Math.max(-ICR_REVEAL - 24, Math.min(ICR_REVEAL + 24, startDx.current + delta)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx > ICR_THRESHOLD) setDx(ICR_REVEAL);
    else if (dx < -ICR_THRESHOLD) setDx(-ICR_REVEAL);
    else setDx(0);
  }
  function onTap() {
    if (moved.current) { moved.current = false; return; }
    if (Math.abs(dx) > 4) { setDx(0); return; }
    onOpenChat?.(c.id);
  }

  return (
    <div style={{
      position: 'relative',
      borderBottom: divider ? '0.5px solid ' + t.borderSoft : 'none',
      overflow: 'hidden',
    }}>
      {/* Left actions — Bellen / WhatsApp */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: ICR_REVEAL, display: 'flex',
        alignItems: 'stretch', gap: 2,
        pointerEvents: dx > 0 ? 'auto' : 'none',
      }}>
        <SwipeBtn t={t} icon="phone" label="Bel"
          bg={`linear-gradient(135deg, ${t.accent}, ${t.accent2})`} fg="white" show={dx > 0}/>
        <SwipeBtn t={t} icon="wa" label="WA"
          bg={t.wa} fg="white" show={dx > 0}/>
      </div>
      {/* Right actions — Snooze / Archief */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: ICR_REVEAL, display: 'flex',
        alignItems: 'stretch', gap: 2,
        pointerEvents: dx < 0 ? 'auto' : 'none',
      }}>
        <SwipeBtn t={t} icon="clock" label="Snooze"
          bg={t.warning} fg="white" show={dx < 0}/>
        <SwipeBtn t={t} icon="x" label="Archief"
          bg={t.danger} fg="white" show={dx < 0}/>
      </div>

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onTap}
        style={{
          position: 'relative',
          background: t.surface,
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform .25s cubic-bezier(.32,.72,0,1)',
          touchAction: 'pan-y',
          userSelect: 'none',
          cursor: 'pointer',
        }}
      >
        <InboxRow c={c} t={t} highlight={highlight}/>
      </div>
    </div>
  );
}

function SwipeBtn({ t, icon, label, bg, fg, show }) {
  return (
    <div style={{
      flex: 1, background: bg, color: fg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 4,
      fontSize: 10.5, fontWeight: 700,
      opacity: show ? 1 : 0.65,
      transition: 'opacity .2s',
    }}>
      <AIcon name={icon} size={18} stroke={2.2} color={fg}/>
      {label}
    </div>
  );
}

// Plain row (no swipe-wrapping)
function InboxRow({ c, t, highlight }) {
  const unread = c.unread > 0;
  const isSurface = c.speaker === 'surface';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px',
    }}>
      <IBAvatarWithStatus
        name={c.naam} t={t} tint={c.id.length}
        online={c.online} size={40}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{
            fontSize: 14.5, fontWeight: unread ? 700 : 600, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            minWidth: 0, flex: 1,
            letterSpacing: '-0.005em',
          }}>{c.naam}</div>
          <span style={{
            fontSize: 11, color: highlight ? t.danger : (unread ? t.accent : t.fgMuted),
            fontWeight: unread || highlight ? 700 : 500, flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>{c.timestamp}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 2,
        }}>
          {isSurface && (
            <span style={{
              width: 12, height: 12, borderRadius: 3.5,
              background: 'linear-gradient(135deg,#0C7AB8,#074F77)',
              display: 'inline-grid', placeItems: 'center', flexShrink: 0,
            }}>
              <AIcon name="spark" size={6.5} stroke={2.6} color="white"/>
            </span>
          )}
          {c.voice && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 12.5, color: '#128C7E', fontWeight: 600, flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#128C7E">
                <path d="M6 4l14 8-14 8z"/>
              </svg>
              {c.voiceLen}s
            </span>
          )}
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 12.5, color: unread ? t.fg : t.fgMuted,
            fontWeight: unread ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{c.lastMsg}</span>
          <IBUnread count={c.unread} t={t}/>
        </div>
      </div>
    </div>
  );
}

window.InboxC = InboxC;
