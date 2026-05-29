// src/inbox-c/ICShared.jsx
// Variant C uitgewerkt — WhatsApp-palette + bubble-atoms + message mock data.

// ── Authentieke WhatsApp kleuren ─────────────────────────
const WA = {
  // Outgoing (jij)
  outBg:        '#DCF8C6',    // light mode
  outBgDark:    '#005C4B',    // dark mode
  // Incoming (klant) — WhatsApp gebruikt puur wit
  inBg:         '#FFFFFF',
  inBgDark:     '#1F2C33',
  // Chat background
  chatBg:       '#ECE5DD',
  chatBgDark:   '#0B141A',
  // Header / brand
  headerGreen:  '#075E54',
  brandGreen:   '#25D366',
  teal:         '#128C7E',    // klassieke WA-teal
  // Surface (bot) — WhatsApp blauw-bubble, afgeleid van WA's link/read-receipt
  // blue, op bubble-brightness gebracht. Duidelijk anders dan klant en jij,
  // maar nog steeds in WA-vibes.
  surfaceBg:        '#D7EEFB', // light WA-blue
  surfaceBgDark:    '#103E5C',
  surfaceText:      '#0B3F5C',
  surfaceTextDark:  '#A9D6F5',
  surfaceAccent:    '#0C7AB8',
  // Misc
  link:         '#34B7F1',
  tickBlue:     '#53BDEB',     // read-receipts
  meta:         '#667781',     // timestamps grijs
  metaDark:     '#8696A0',
};

function waColors(dark) {
  return dark ? {
    chatBg: WA.chatBgDark,
    inBg: WA.inBgDark, inFg: '#E9EDEF',
    outBg: WA.outBgDark, outFg: '#E9EDEF',
    surfaceBg: WA.surfaceBgDark, surfaceFg: WA.surfaceTextDark, surfaceBorder: WA.surfaceAccent,
    meta: WA.metaDark,
    sep: 'rgba(255,255,255,.06)',
  } : {
    chatBg: WA.chatBg,
    inBg: WA.inBg, inFg: '#111B21',
    outBg: WA.outBg, outFg: '#111B21',
    surfaceBg: WA.surfaceBg, surfaceFg: WA.surfaceText, surfaceBorder: WA.surfaceAccent,
    meta: WA.meta,
    sep: 'rgba(0,0,0,.06)',
  };
}

// ── Message bubble ───────────────────────────────────────
function MessageBubble({ m, dark }) {
  const wa = waColors(dark);
  const isOut = m.from === 'owner';
  const isSurface = m.from === 'surface';
  // Surface speaks on behalf of you — align right, same side as owner.
  const onRight = isOut || isSurface;

  const bg = isSurface ? wa.surfaceBg : isOut ? wa.outBg : wa.inBg;
  const fg = isSurface ? wa.surfaceFg : isOut ? wa.outFg : wa.inFg;
  const align = onRight ? 'flex-end' : 'flex-start';

  return (
    <div style={{
      display: 'flex', justifyContent: align,
      padding: '1px 8px',
    }}>
      <div style={{
        maxWidth: '78%',
        background: bg, color: fg,
        padding: m.voice ? '6px 10px 6px 6px' : '6px 9px 7px',
        borderRadius: 7.5,
        borderTopLeftRadius:  onRight ? 7.5 : (m.continued ? 7.5 : 0),
        borderTopRightRadius: onRight ? (m.continued ? 7.5 : 0) : 7.5,
        boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
        position: 'relative',
        fontSize: 14.5, lineHeight: 1.34,
        wordBreak: 'break-word',
      }}>
        {/* Surface-label boven de bubble */}
        {isSurface && !m.continued && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: wa.surfaceBorder,
            marginBottom: 3,
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: `linear-gradient(135deg, ${wa.surfaceBorder}, #074F77)`,
              color: 'white', display: 'inline-grid', placeItems: 'center',
            }}>
              <AIcon name="spark" size={7} stroke={2.6} color="white"/>
            </span>
            Surface
          </div>
        )}

        {/* Voice */}
        {m.voice ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            minWidth: 180, padding: '2px 0',
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%',
              background: isOut ? '#FFFFFF40' : '#00000010',
              display: 'inline-grid', placeItems: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill={fg}>
                <path d="M6 4l14 8-14 8z"/>
              </svg>
            </span>
            {/* Waveform */}
            <span style={{
              flex: 1, height: 22, display: 'flex',
              alignItems: 'center', gap: 2,
            }}>
              {Array.from({ length: 22 }).map((_, i) => {
                const h = 4 + Math.abs(Math.sin(i * 1.7 + 1)) * 14;
                return <span key={i} style={{
                  width: 2.5, height: h, borderRadius: 2,
                  background: fg, opacity: 0.55,
                }}/>;
              })}
            </span>
            <span style={{ fontSize: 11, color: fg, opacity: 0.7,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              0:{String(m.voiceLen).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{m.body}</span>
        )}

        {/* Time + ticks (only for owner) */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          float: 'right', marginLeft: 8,
          marginTop: 1, marginBottom: -2,
          fontSize: 11, color: wa.meta, opacity: 0.85,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {m.time}
          {isOut && (
            <svg width="14" height="11" viewBox="0 0 16 11" fill="none">
              <path d="M11 1L5 9 2 6" stroke={m.read ? WA.tickBlue : wa.meta}
                strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.5 1L8 9.5" stroke={m.read ? WA.tickBlue : wa.meta}
                strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// Day separator pill
function DaySeparator({ label, dark }) {
  const wa = waColors(dark);
  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: '14px 8px 8px',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 500,
        color: dark ? '#8696A0' : '#54656F',
        background: dark ? 'rgba(11,20,26,.4)' : 'rgba(255,255,255,.7)',
        padding: '5px 13px', borderRadius: 9999,
        boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
        textTransform: 'uppercase', letterSpacing: '.04em',
      }}>{label}</span>
    </div>
  );
}

// System/timeline banner
function SystemBanner({ children, dark }) {
  const wa = waColors(dark);
  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: '6px 16px',
    }}>
      <span style={{
        fontSize: 11.5, fontWeight: 500,
        color: dark ? '#8696A0' : '#54656F',
        background: dark ? 'rgba(11,20,26,.4)' : 'rgba(255,255,255,.7)',
        padding: '6px 11px', borderRadius: 8,
        boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
        textAlign: 'center', lineHeight: 1.4,
      }}>{children}</span>
    </div>
  );
}

// ── Message mock — voor 1 conversatie (Jeroen de Vries, L-2087) ──
const IC_MESSAGES = {
  'L-2087': [
    { id: 'sys1', system: true, body: 'Lead binnengekomen via WhatsApp · 1 dag geleden' },
    { day: 'gisteren' },
    { id: 'm1', from: 'klant',   time: '08:42', body: 'Hoi! Mijn oprit is groen aan het worden door mos. Kunnen jullie hier iets aan doen?' },
    { id: 'm2', from: 'surface', time: '08:42', body: 'Hallo Jeroen, dank voor je bericht! 👋\n\nJa, dat kunnen wij zeker oplossen. Om je een goede prijs te geven heb ik 2 dingen nodig:\n\n1. Wat is ongeveer de oppervlakte van de oprit?\n2. Kun je 1-2 foto\'s sturen?' },
    { id: 'm3', from: 'klant',   time: '08:51', body: 'Hij is ongeveer 145m². Ik stuur zo even een paar foto\'s' },
    { id: 'm4', from: 'surface', time: '08:51', body: 'Top, ik wacht 🙌' },
    { day: 'vandaag' },
    { id: 'm5', from: 'klant',   time: '07:14', voice: true, voiceLen: 12 },
    { id: 'm6', from: 'klant',   time: '07:15', body: 'Hier zijn de foto\'s' },
    { id: 'm7', from: 'klant',   time: '07:15', body: '📷 4 foto\'s' },
    { id: 'm8', from: 'surface', time: '07:16', body: 'Dank! Op basis van wat ik zie schat ik:\n\n• Reinigen + invegen: €580\n• Beschermlaag (5 jaar): +€220\n\nTotaal: €800 incl. BTW · klaar in 1 werkdag.\n\nWil je dat ik een offerte stuur?' },
    { id: 'm9', from: 'klant',   time: '07:22', body: 'Hier zijn de foto\'s van mijn oprit, alvast bedankt!' },
  ],
};

Object.assign(window, {
  WA, waColors, MessageBubble, DaySeparator, SystemBanner, IC_MESSAGES,
});
