// src/mobile-inbox/IBShared.jsx
// Inbox shared — mock conversations + small atoms.
// Depends on: AShared (AIcon, AAvatar, makeATheme), MLShared (ML_LEADS, ML_STAGES),
//             LAShared (LAStagePill, laToneColor, LA_STAGE_META).

// Speaker types — wie heeft als laatste iets gezegd in de chat
const IB_SPEAKER = {
  klant:   { label: 'Klant',   color: null /* uses accent */ },
  surface: { label: 'Surface', color: '#7C3AED' },
  owner:   { label: 'Jij',     color: null },
};

// Build inbox-convos from ML_LEADS by adding chat-specific fields
const IB_CONVOS = (() => {
  const meta = {
    'L-2087': { lastMsg: 'Hier zijn de foto\'s van mijn oprit, alvast bedankt!',
                speaker: 'klant',   unread: 2, online: true,  pinned: true,
                typing: 'surface',  voice: false },
    'L-2078': { lastMsg: 'Geen probleem, ik kijk er morgen naar 👍',
                speaker: 'klant',   unread: 0, online: false, pinned: false },
    'L-2081': { lastMsg: 'Surface stelt 3 vervolgvragen voor begroting',
                speaker: 'surface', unread: 1, online: false, pinned: false },
    'L-2084': { lastMsg: 'Korstmos-toeslag toegevoegd — wacht op jouw akkoord',
                speaker: 'surface', unread: 3, online: true,  pinned: true,
                escalated: true },
    'L-2080': { lastMsg: 'Buiten serviceradius — wil je dat ik 86km rijd?',
                speaker: 'surface', unread: 1, online: false, pinned: false,
                escalated: true },
    'L-2086': { lastMsg: 'Ik denk er over na, kom dinsdag terug.',
                speaker: 'klant',   unread: 0, online: false, pinned: false,
                voice: true,        voiceLen: 14 },
    'L-2083': { lastMsg: 'Is er nog ruimte voor 10% korting?',
                speaker: 'klant',   unread: 2, online: true,  pinned: false,
                escalated: true },
    'L-2085': { lastMsg: 'Top, ik zie jullie dinsdag 19 mei om 9 uur 👋',
                speaker: 'klant',   unread: 0, online: false, pinned: false },
    'L-2082': { lastMsg: 'Bevestigd voor vrijdag 8:30 — Surface heeft jullie route­plan klaar',
                speaker: 'surface', unread: 0, online: false, pinned: false },
    'L-2079': { lastMsg: '⭐⭐⭐⭐⭐ Tip-top werk, mensen!',
                speaker: 'klant',   unread: 0, online: false, pinned: false },
    'L-2077': { lastMsg: 'Factuur betaald, dossier gesloten',
                speaker: 'surface', unread: 0, online: false, pinned: false },
  };
  // Timestamps in stable order matching the leads' "binnen" field for realism
  const stamps = ['nu', '2m', '12m', '24m', '1u', '2u', '4u', '6u', '12u', 'gist', '3d'];
  return ML_LEADS.map((l, i) => ({
    ...l,
    ...(meta[l.id] || { lastMsg: '—', speaker: 'klant', unread: 0, online: false }),
    timestamp: stamps[i] || l.binnen,
    order: i, // for sort fallback
  }));
})();

// Sorted convos: pinned first, then unread, then chronological (already in order)
const IB_CONVOS_SORTED = (() => {
  return [...IB_CONVOS].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    // unread first within each group
    if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
    return a.order - b.order;
  });
})();

// Stats
const IB_STATS = {
  total: IB_CONVOS.length,
  unread: IB_CONVOS.filter(c => c.unread > 0).length,
  escalated: IB_CONVOS.filter(c => c.escalated).length,
};

// ── Atoms ──────────────────────────────────────────────────

// Sparkle gradient badge for Surface
function IBSurfaceDot({ size = 18, t }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 6,
      background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
      color: 'white',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    }}>
      <AIcon name="spark" size={size * 0.6} stroke={2.4} color="white"/>
    </span>
  );
}

// Last-speaker chevron — kleine indicator "wie sprak het laatst"
function IBLastSpeaker({ speaker, t, sm = false }) {
  if (speaker === 'surface') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: sm ? 10 : 11, fontWeight: 700,
        color: '#7C3AED',
      }}>
        <span style={{
          width: 11, height: 11, borderRadius: 3,
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          color: 'white',
          display: 'inline-grid', placeItems: 'center',
        }}>
          <AIcon name="spark" size={6} stroke={2.6} color="white"/>
        </span>
        Surface
      </span>
    );
  }
  if (speaker === 'owner') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: sm ? 10 : 11, fontWeight: 700, color: t.fgSoft,
      }}>
        <AIcon name="check" size={11} stroke={2.6} color={t.fgSoft}/>
        Jij
      </span>
    );
  }
  return null; // klant → niet labelen, dat is default
}

// Unread bullet / count
function IBUnread({ count, t }) {
  if (!count) return null;
  return (
    <span style={{
      minWidth: 20, height: 20, padding: '0 6px',
      background: t.accent, color: 'white',
      borderRadius: 10, fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1, fontVariantNumeric: 'tabular-nums',
    }}>{count}</span>
  );
}

// Online indicator op avatar
function IBAvatarWithStatus({ name, size = 44, t, tint, online }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <AAvatar name={name} size={size} t={t} tint={tint}/>
      {online && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 12, height: 12, borderRadius: '50%',
          background: t.success,
          border: '2.5px solid ' + t.surface,
        }}/>
      )}
    </div>
  );
}

// Source-icon mini (zelfde stijl als in leads — kleinere badge)
function IBSource({ bron, t, size = 14 }) {
  if (bron === 'wa') {
    return <span style={{
      width: size, height: size, borderRadius: '50%',
      background: t.wa, color: 'white',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z"/>
      </svg>
    </span>;
  }
  return <span style={{
    width: size, height: size, borderRadius: 4,
    background: t.fgMuted + '40', color: t.fgSoft,
    display: 'inline-grid', placeItems: 'center', flexShrink: 0,
  }}>
    <AIcon name="doc" size={size * 0.55} stroke={2.4} color={t.fgSoft}/>
  </span>;
}

// Header voor inbox-screens
function IBHeader({ t, title = 'Inbox', sub, right }) {
  return (
    <div style={{ padding: '8px 20px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 28, fontWeight: 800, color: t.fg,
            letterSpacing: '-0.025em', lineHeight: 1.05,
          }}>
            {title}
          </div>
          {sub && (
            <div style={{
              fontSize: 13, color: t.fgMuted, marginTop: 5,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>{sub}</div>
          )}
        </div>
        {right || (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={{
              width: 40, height: 40, borderRadius: 20,
              background: t.chipBg, border: 'none', color: t.fg,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }} aria-label="Zoek">
              <AIcon name="search" size={18}/>
            </button>
            <button style={{
              width: 40, height: 40, borderRadius: 20,
              background: t.chipBg, border: 'none', color: t.fg,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }} aria-label="Filters">
              <AIcon name="filter" size={18}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  IB_SPEAKER, IB_CONVOS, IB_CONVOS_SORTED, IB_STATS,
  IBSurfaceDot, IBLastSpeaker, IBUnread,
  IBAvatarWithStatus, IBSource, IBHeader,
});
