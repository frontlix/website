// src/leads-a/LeadsCardInteractive.jsx
// SwipeableCard — wraps LACard with:
//  - drag-to-reveal actions on either side (pointer events)
//  - tap-to-expand into an inline panel with full details + action buttons
//
// Swipe gestures:
//   Veeg ← (translate-negatief): reveals "Snooze / Archief" rechts
//   Veeg → (translate-positief): reveals "Bellen / WhatsApp" links
// Snap thresholds at 25% / 60% of card width.

const SC_REVEAL = 144; // px revealed when snapped to action-state
const SC_THRESHOLD = 40;

function SwipeableCard({ l, t, expanded, onExpand, onClose, onOpenLead }) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startX = React.useRef(0);
  const startDx = React.useRef(0);
  const moved = React.useRef(false);

  function onDown(e) {
    if (expanded) return;
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
    setDx(Math.max(-SC_REVEAL - 24, Math.min(SC_REVEAL + 24, startDx.current + delta)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx > SC_THRESHOLD) setDx(SC_REVEAL);
    else if (dx < -SC_THRESHOLD) setDx(-SC_REVEAL);
    else setDx(0);
  }
  function onTap(e) {
    // Only treat as tap if not dragged
    if (moved.current) { moved.current = false; return; }
    if (Math.abs(dx) > 4) { setDx(0); return; }
    onExpand?.(l.id);
  }

  // Reset when card collapses again
  React.useEffect(() => {
    if (expanded) setDx(0);
  }, [expanded]);

  const meta = LA_STAGE_META[l.stage];
  const stageColor = laToneColor(meta.tone, t);

  return (
    <div style={{ position: 'relative' }}>
      {/* Action lades — alleen renderen als card NIET expanded is */}
      {!expanded && (
        <React.Fragment>
          {/* Action lade — links (Bellen / WhatsApp), zichtbaar bij veeg → */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: SC_REVEAL, display: 'flex',
            alignItems: 'stretch', gap: 4,
            padding: '0 0 0 0', overflow: 'hidden',
            pointerEvents: dx > 0 ? 'auto' : 'none',
          }}>
            <SwipeActionBtn t={t} icon="phone" label="Bel"
              bg={`linear-gradient(135deg, ${t.accent}, ${t.accent2})`} fg="white"
              show={dx > 0}/>
            <SwipeActionBtn t={t} icon="wa" label="WA"
              bg={t.wa} fg="white" show={dx > 0}/>
          </div>
          {/* Action lade — rechts (Snooze / Archief), zichtbaar bij veeg ← */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0,
            width: SC_REVEAL, display: 'flex',
            alignItems: 'stretch', gap: 4,
            padding: 0, overflow: 'hidden',
            pointerEvents: dx < 0 ? 'auto' : 'none',
          }}>
            <SwipeActionBtn t={t} icon="clock" label="Snooze"
              bg={t.warning} fg="white" show={dx < 0}/>
            <SwipeActionBtn t={t} icon="x" label="Archief"
              bg={t.danger} fg="white" show={dx < 0}/>
          </div>
        </React.Fragment>
      )}

      {/* De card zelf — vertaalt met dx */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onTap}
        style={{
          position: 'relative',
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform .25s cubic-bezier(.32,.72,0,1)',
          touchAction: 'pan-y',
          cursor: dragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
        }}
      >
        <LACard l={l} t={t}/>
      </div>

      {/* Expanded panel — slides open onder de card */}
      {expanded && (
        <ExpandedPanel l={l} t={t} stageColor={stageColor} onClose={onClose} onOpenLead={onOpenLead}/>
      )}
    </div>
  );
}

function SwipeActionBtn({ t, icon, label, bg, fg, show }) {
  return (
    <div style={{
      flex: 1, background: bg, color: fg,
      borderRadius: 14,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 4,
      fontSize: 10.5, fontWeight: 700,
      opacity: show ? 1 : 0.7,
      transition: 'opacity .2s',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <AIcon name={icon} size={18} stroke={2.2} color={fg}/>
      {label}
    </div>
  );
}

// ── Expanded inline panel — alle context + actie-knoppen ──
function ExpandedPanel({ l, t, stageColor, onClose, onOpenLead }) {
  const meta = LA_STAGE_META[l.stage];
  // Actions depend on the stage
  const actions = expandedActionsFor(l, t);

  return (
    <div style={{
      marginTop: 6, background: t.surface, borderRadius: 14,
      overflow: 'hidden', position: 'relative',
      boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      border: '1px solid ' + stageColor + '30',
      animation: 'laExpand .25s cubic-bezier(.32,.72,0,1) both',
    }}>
      <style>{`
        @keyframes laExpand {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top color strip */}
      <div style={{
        background: `linear-gradient(135deg, ${stageColor}1A, ${stageColor}06)`,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid ' + t.borderSoft,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: stageColor,
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{meta.label}</div>
        <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} style={{
          background: 'transparent', border: 'none',
          color: t.fgMuted, padding: 4,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <AIcon name="chevd" size={14} color={t.fgMuted}/>
          Sluit
        </button>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        padding: '14px 14px',
        gap: 8,
        borderBottom: '0.5px solid ' + t.borderSoft,
      }}>
        <EStat t={t} v={l.m2 + 'm²'} lbl="Oppervlak"/>
        <EStat t={t} v={l.fotos} lbl="Foto's"/>
        <EStat t={t} v={l.prijs ? fmtA(l.prijs) : '—'} lbl="Offerte" hi={!!l.prijs} c={stageColor}/>
        <EStat t={t} v={l.binnen} lbl="Binnen"/>
      </div>

      {/* Dienst */}
      <div style={{
        padding: '12px 14px',
        fontSize: 13, color: t.fgSoft, lineHeight: 1.4,
        borderBottom: '0.5px solid ' + t.borderSoft,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: t.fgMuted,
          textTransform: 'uppercase', letterSpacing: '.06em',
          marginBottom: 4,
        }}>Dienst</div>
        {l.dienst}
      </div>

      {/* Why / context line */}
      {l.why && (
        <div style={{
          padding: '12px 14px',
          fontSize: 13, color: t.fgSoft, lineHeight: 1.4,
          borderBottom: '0.5px solid ' + t.borderSoft,
          display: 'flex', gap: 9, alignItems: 'flex-start',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 7,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <AIcon name="spark" size={12} stroke={2.4} color="white"/>
          </span>
          <span><span style={{ fontWeight: 600, color: t.fg }}>Surface · </span>{l.why}</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        padding: 12,
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
      }}>
        {actions.map((a, i) => (
          <button key={i}
            onClick={(e) => e.stopPropagation()}
            style={{
              minHeight: 42, padding: '10px 12px',
              background: a.primary
                ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})`
                : t.chipBg,
              color: a.primary ? 'white' : t.fg,
              border: 'none', borderRadius: 11,
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              boxShadow: a.primary ? `0 4px 12px ${t.accent}40` : 'none',
              cursor: 'pointer',
              gridColumn: a.full ? '1 / -1' : 'auto',
            }}>
            <AIcon name={a.icon} size={14}
              color={a.primary ? 'white' : (a.tint || t.fg)}/>
            {a.label}
          </button>
        ))}
      </div>

      {/* Link to full detail */}
      <div style={{
        padding: '0 14px 14px',
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenLead?.(l.id);
          }}
          style={{
            width: '100%', minHeight: 38, padding: '8px 12px',
            background: 'transparent',
            border: '1px solid ' + t.border,
            borderRadius: 10,
            color: t.fgSoft,
            fontSize: 12.5, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
            cursor: 'pointer',
          }}>
          Open volledig dossier
          <AIcon name="chev" size={12} color={t.fgSoft}/>
        </button>
      </div>
    </div>
  );
}

function EStat({ t, v, lbl, hi, c }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: hi ? c : t.fg,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>{v}</div>
      <div style={{
        fontSize: 10, color: t.fgMuted, marginTop: 2,
        textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600,
      }}>{lbl}</div>
    </div>
  );
}

// ── Returnt de juiste actie-set per fase ──
function expandedActionsFor(l, t) {
  const wa  = { label: 'WhatsApp', icon: 'wa',   tint: t.wa };
  const bel = { label: 'Bellen',   icon: 'phone' };
  const pic = { label: 'Foto\'s vragen', icon: 'cam' };

  switch (l.stage) {
    case 'gesprek':
      // Geen offerte nog: maak offerte / chat / foto's vragen
      return [
        { primary: true, label: 'Stuur offerte', icon: 'doc', full: true },
        wa, bel,
      ];
    case 'review':
      return [
        { primary: true, label: 'Goedkeuren',  icon: 'check', full: true },
        { label: 'Aanpassen', icon: 'doc' },
        wa,
      ];
    case 'uit':
      return [
        { primary: true, label: 'WhatsApp opvolgen', icon: 'wa', full: true },
        bel,
        { label: 'Offerte', icon: 'doc' },
      ];
    case 'gepland':
      return [
        { primary: true, label: 'Open afspraak', icon: 'cal', full: true },
        { label: 'Route', icon: 'pin' },
        wa,
      ];
    case 'klaar':
      return [
        { primary: true, label: 'Vraag review', icon: 'star', full: true },
        { label: 'Factuur', icon: 'doc' },
      ];
    default:
      return [wa, bel];
  }
}

Object.assign(window, {
  SwipeableCard, ExpandedPanel, expandedActionsFor,
});
