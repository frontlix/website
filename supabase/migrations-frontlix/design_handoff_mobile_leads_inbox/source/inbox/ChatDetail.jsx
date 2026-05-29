// src/inbox-c/ChatDetail.jsx
// WhatsApp-stijl chat-detail met:
//  - WA-groene header met avatar + naam + status (tap → lead-sheet)
//  - Chat-area met klant/jij/Surface bubbles op chat-bg pattern
//  - System-banner ("Lead binnengekomen via WhatsApp")
//  - Day-separators
//  - WA-stijl composer: + knop, tekst-input, mic-knop (of send als typing)
//  - Lead-info bottom-sheet die opent bij header-tap

function ChatDetail({ leadId = 'L-2087', dark = false, onBack }) {
  const c = IB_CONVOS.find(x => x.id === leadId) || IB_CONVOS[0];
  const messages = IC_MESSAGES[c.id] || IC_MESSAGES['L-2087'];
  const wa = waColors(dark);

  const [draft, setDraft] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [surfaceOn, setSurfaceOn] = React.useState(true);
  const scrollerRef = React.useRef(null);

  // Scroll to bottom on mount
  React.useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, []);

  // WA-doodle pattern als svg-bg
  const doodleBg = dark
    ? `url("data:image/svg+xml;utf8,${encodeURIComponent(makeDoodleSvg('#FFFFFF06'))}")`
    : `url("data:image/svg+xml;utf8,${encodeURIComponent(makeDoodleSvg('#0000000A'))}")`;

  return (
    <div style={{
      height: '100%', background: wa.chatBg,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      paddingTop: 54,
    }}>
      {/* Header — WA-groen */}
      <div style={{
        background: dark ? '#1F2C33' : WA.headerGreen,
        color: 'white',
        padding: '6px 8px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 1px 1px rgba(0,0,0,.15)',
        flexShrink: 0,
        position: 'relative', zIndex: 2,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, background: 'transparent',
          border: 'none', color: 'white', display: 'grid', placeItems: 'center',
          cursor: 'pointer', flexShrink: 0,
        }} aria-label="Terug">
          <AIcon name="back" size={20} color="white"/>
        </button>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px 2px', minWidth: 0, textAlign: 'left',
          }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AAvatar name={c.naam} size={36} t={{ chipBg: '#FFFFFF20', fgMuted: 'white', dark: true }} tint={c.id.length}/>
            {c.online && (
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 11, height: 11, borderRadius: '50%',
                background: '#25D366',
                border: '2px solid ' + (dark ? '#1F2C33' : WA.headerGreen),
              }}/>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 600, color: 'white',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
            }}>{c.naam}</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,.75)',
              marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {c.online ? 'online · tik voor info' : 'tik voor info · ' + c.plaats}
            </div>
          </div>
        </button>
        <button style={hdrIconBtn} aria-label="Bellen">
          <AIcon name="phone" size={20} color="white"/>
        </button>
        <button style={hdrIconBtn} aria-label="Meer">
          <AIcon name="menu" size={20} color="white" stroke={2.4}/>
        </button>
      </div>

      {/* Surface-toggle strip — onder de header */}
      <SurfaceBanner on={surfaceOn} onToggle={() => setSurfaceOn(v => !v)} dark={dark}/>

      {/* Chat area */}
      <div ref={scrollerRef} style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        backgroundImage: doodleBg,
        backgroundColor: wa.chatBg,
        padding: '8px 0 6px',
      }}>
        {messages.map((m, i) => {
          if (m.system) return <SystemBanner key={i} dark={dark}>{m.body}</SystemBanner>;
          if (m.day)    return <DaySeparator key={i} label={m.day} dark={dark}/>;
          return <MessageBubble key={m.id} m={m} dark={dark}/>;
        })}

        {/* Typing indicator — alleen als Surface aan staat */}
        {surfaceOn && <TypingBubble dark={dark}/>}
      </div>

      {/* Composer */}
      <Composer
        draft={draft} setDraft={setDraft} dark={dark}
      />

      {/* Lead-info bottom sheet */}
      <LeadInfoSheet
        c={c} dark={dark} open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

const hdrIconBtn = {
  width: 40, height: 40, background: 'transparent',
  border: 'none', color: 'white', display: 'grid', placeItems: 'center',
  cursor: 'pointer', flexShrink: 0,
};

// ── Surface aan/uit-banner ─────────────────────
function SurfaceBanner({ on, onToggle, dark }) {
  const BLUE = '#0C7AB8';
  const bg   = on
    ? (dark ? 'rgba(12,122,184,.20)' : '#E1F1FB')
    : (dark ? 'rgba(255,255,255,.05)' : '#F5EDE3');
  const fg   = on ? BLUE : (dark ? '#F0B36B' : '#8B5A2B');
  const accent = on ? BLUE : '#D97706';
  return (
    <div style={{
      flexShrink: 0, padding: '8px 14px',
      background: bg,
      borderBottom: '0.5px solid ' + (dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'),
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 8,
        background: on
          ? `linear-gradient(135deg, ${BLUE}, #074F77)`
          : (dark ? '#3A2F25' : '#FBE4C4'),
        color: on ? 'white' : accent,
        display: 'grid', placeItems: 'center', flexShrink: 0,
        boxShadow: on ? `0 2px 6px ${BLUE}40` : 'none',
      }}>
        {on ? (
          <AIcon name="spark" size={13} stroke={2.4} color="white"/>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill={accent}>
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color: fg,
          letterSpacing: '-0.005em',
        }}>
          {on ? 'Surface beantwoordt automatisch' : 'Jij neemt het gesprek over'}
        </div>
        <div style={{
          fontSize: 11, color: dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)',
          marginTop: 1,
        }}>
          {on ? 'Tik om Surface uit te zetten' : 'Surface gepauzeerd — berichten gaan via jou'}
        </div>
      </div>
      {/* Toggle switch */}
      <button onClick={onToggle} aria-label={on ? 'Surface uit' : 'Surface aan'} style={{
        width: 42, height: 24, borderRadius: 12,
        background: on ? BLUE : (dark ? '#3A4146' : '#C7CBCF'),
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .15s',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
          transition: 'left .15s',
        }}/>
      </button>
    </div>
  );
}

// SVG-doodle achtergrond (subtiele cirkels + driehoekjes — refereert aan WA's pattern)
function makeDoodleSvg(color) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'>
    <g fill='none' stroke='${color}' stroke-width='1.2'>
      <circle cx='20' cy='30' r='8'/>
      <path d='M50 60l8 14h-16z'/>
      <circle cx='100' cy='40' r='6'/>
      <path d='M150 25l6 10-12 0z'/>
      <path d='M30 100l5 9-10 0z'/>
      <circle cx='70' cy='110' r='10'/>
      <path d='M120 100h14v14h-14z'/>
      <circle cx='160' cy='130' r='5'/>
      <path d='M40 160l7 12-14 0z'/>
      <circle cx='95' cy='160' r='7'/>
      <path d='M140 165h10v10h-10z'/>
    </g>
  </svg>`;
}

// ── Typing indicator ──
function TypingBubble({ dark }) {
  const wa = waColors(dark);
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', padding: '4px 8px',
    }}>
      <div style={{
        background: wa.surfaceBg, color: wa.surfaceFg,
        padding: '8px 14px', borderRadius: 12,
        borderTopRightRadius: 0,
        boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 600,
      }}>
        <span style={{
          width: 13, height: 13, borderRadius: 3.5,
          background: 'linear-gradient(135deg,#0C7AB8,#074F77)',
          color: 'white', display: 'inline-grid', placeItems: 'center',
        }}>
          <AIcon name="spark" size={7} stroke={2.6} color="white"/>
        </span>
        Surface aan het typen
        <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
          <Dot color={wa.surfaceFg} delay={0}/>
          <Dot color={wa.surfaceFg} delay={0.16}/>
          <Dot color={wa.surfaceFg} delay={0.32}/>
        </span>
      </div>
      <style>{`
        @keyframes typBlink { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
      `}</style>
    </div>
  );
}
function Dot({ color, delay }) {
  return <span style={{
    width: 4, height: 4, borderRadius: '50%', background: color,
    display: 'inline-block',
    animation: `typBlink 1.2s ${delay}s infinite ease-in-out`,
  }}/>;
}

// ── Composer ──
function Composer({ draft, setDraft, dark }) {
  const hasText = draft.trim().length > 0;
  return (
    <div style={{
      flexShrink: 0,
      background: dark ? '#1F2C33' : '#F0F0F0',
      padding: '6px 6px 8px',
      display: 'flex', alignItems: 'flex-end', gap: 6,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
    }}>
      <div style={{
        flex: 1, minWidth: 0,
        background: dark ? '#2A3942' : '#FFFFFF',
        borderRadius: 22, padding: '4px 4px 4px 6px',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: dark ? 'none' : '0 1px 1px rgba(0,0,0,.06)',
      }}>
        <button style={composerSideBtn(dark)} aria-label="Emoji">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={dark ? '#8696A0' : '#54656F'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Bericht"
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', outline: 'none',
            color: dark ? '#E9EDEF' : '#111B21',
            fontSize: 16, padding: '8px 4px',
          }}
        />
        <button style={composerSideBtn(dark)} aria-label="Bijlage">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={dark ? '#8696A0' : '#54656F'} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.6V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6.4"/>
            <path d="M16 3l5 5-9 9H7v-5z"/>
          </svg>
        </button>
        {!hasText && (
          <button style={composerSideBtn(dark)} aria-label="Camera">
            <AIcon name="cam" size={20} color={dark ? '#8696A0' : '#54656F'} stroke={2}/>
          </button>
        )}
      </div>
      {/* Mic / Send button */}
      <button
        aria-label={hasText ? 'Verstuur' : 'Voice memo'}
        style={{
          width: 46, height: 46, borderRadius: '50%',
          background: WA.headerGreen,
          border: 'none', color: 'white', flexShrink: 0,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,.18)',
        }}>
        {hasText ? (
          // Send (paper plane)
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M2.5 21l19-9-19-9 0 7 14 2-14 2z"/>
          </svg>
        ) : (
          // Mic
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3"/>
            <path d="M5 11a7 7 0 0014 0"/>
            <path d="M12 18v3"/>
          </svg>
        )}
      </button>
    </div>
  );
}
function composerSideBtn(dark) {
  return {
    width: 36, height: 36, background: 'transparent',
    border: 'none', cursor: 'pointer',
    display: 'grid', placeItems: 'center', flexShrink: 0,
    color: dark ? '#8696A0' : '#54656F',
  };
}

// ── Lead-info bottom sheet ──
function LeadInfoSheet({ c, dark, open, onClose }) {
  if (!open) return null;
  const t = makeATheme({ dark });
  const stageMeta = LA_STAGE_META[c.stage];
  const stageColor = laToneColor(stageMeta.tone, t);
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.45)', zIndex: 50,
        animation: 'lisFade .2s ease-out both',
      }}/>
      <style>{`
        @keyframes lisFade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lisSlide { from { transform: translateY(110%); } to { transform: translateY(0); } }
      `}</style>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.surface, color: t.fg,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '8px 0 26px', zIndex: 60,
        boxShadow: '0 -12px 40px rgba(0,0,0,.25)',
        animation: 'lisSlide .3s cubic-bezier(.32,.72,0,1) both',
      }}>
        <div style={{
          width: 38, height: 5, borderRadius: 3,
          background: t.fgMuted + '50',
          margin: '6px auto 14px',
        }}/>

        {/* Identity */}
        <div style={{
          padding: '0 20px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AAvatar name={c.naam} size={56} t={t} tint={c.id.length}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 19, fontWeight: 700, color: t.fg,
              letterSpacing: '-0.015em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{c.naam}</div>
            <div style={{
              fontSize: 13, color: t.fgMuted, marginTop: 2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {c.id} · {c.plaats}
            </div>
          </div>
          <LAStagePill stage={c.stage} t={t} sm={false}/>
        </div>

        {/* Stats */}
        <div style={{
          margin: '0 16px 14px',
          background: t.chipBg, borderRadius: 12, padding: '14px 4px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          <Stat t={t} v={c.m2 + 'm²'} l="Oppervlak"/>
          <Stat t={t} v={c.fotos}     l="Foto's"/>
          <Stat t={t} v={c.prijs ? fmtA(c.prijs) : '—'} l="Offerte" hi={!!c.prijs} c={stageColor}/>
          <Stat t={t} v={c.timestamp} l="Laatste"/>
        </div>

        {/* Dienst */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: t.fgMuted,
            textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4,
          }}>Dienst</div>
          <div style={{ fontSize: 14, color: t.fg, lineHeight: 1.4 }}>{c.dienst}</div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 16px 0' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: t.fgMuted,
            textTransform: 'uppercase', letterSpacing: '.06em',
            padding: '0 4px 8px',
          }}>Acties</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <ActionBtn t={t} icon="doc" l="Stuur offerte" primary/>
            <ActionBtn t={t} icon="cal" l="Plan afspraak"/>
            <ActionBtn t={t} icon="user" l="Surface overnemen"/>
            <ActionBtn t={t} icon="x" l="Archiveer"/>
          </div>
          <button onClick={onClose} style={{
            width: '100%', marginTop: 12, minHeight: 44,
            background: t.chipBg, color: t.fg, border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>Sluit</button>
        </div>
      </div>
    </>
  );
}

function Stat({ t, v, l, hi, c }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 4px' }}>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: hi ? c : t.fg,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>{v}</div>
      <div style={{
        fontSize: 10, color: t.fgMuted, marginTop: 2,
        textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600,
      }}>{l}</div>
    </div>
  );
}
function ActionBtn({ t, icon, l, primary }) {
  return (
    <button style={{
      minHeight: 44, padding: '10px 12px',
      background: primary
        ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})`
        : t.chipBg,
      color: primary ? 'white' : t.fg, border: 'none',
      borderRadius: 11, fontSize: 13, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', gap: 6,
      boxShadow: primary ? `0 4px 12px ${t.accent}40` : 'none',
      cursor: 'pointer',
    }}>
      <AIcon name={icon} size={14} color={primary ? 'white' : t.fg}/>
      {l}
    </button>
  );
}

window.ChatDetail = ChatDetail;
