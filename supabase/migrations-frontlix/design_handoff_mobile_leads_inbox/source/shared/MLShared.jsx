// src/mobile-leads/MLShared.jsx
// Shared data + helpers for the mobile Leads-page mockups.
// Re-uses AIcon / AAvatar / makeATheme / fmtA from AShared.jsx.

// ── Stage / fase metadata ──────────────────────────────
const ML_STAGES = [
  { key: 'gesprek', label: 'In gesprek',     short: 'Gesprek',  tone: 'blue'  },
  { key: 'review',  label: 'Owner-review',   short: 'Review',   tone: 'amber' },
  { key: 'uit',     label: 'Offerte uit',    short: 'Offerte',  tone: 'amber' },
  { key: 'gepland', label: 'Ingepland',      short: 'Gepland',  tone: 'green' },
  { key: 'klaar',   label: 'Afgerond',       short: 'Klaar',    tone: 'gray'  },
];

// ── Lead mock data — mirrors src/data.jsx but slimmed for mobile screens ──
const ML_LEADS = [
  {
    id: 'L-2087', naam: 'Jeroen de Vries', plaats: 'Delft',
    stage: 'gesprek', dienst: 'Oprit · invegen + beschermlaag',
    m2: 145, fotos: 4, prijs: null,
    bot: 'Surface stelt 2 vervolgvragen', binnen: '2 min', tone: 'blue',
    actie: 'Stuur offerte', actieIcon: 'doc',
    why: 'Foto\'s ontvangen — offerte klaar voor review',
    bron: 'wa',
  },
  {
    id: 'L-2078', naam: 'David Klein', plaats: 'Den Haag',
    stage: 'gesprek', dienst: 'Terras · reiniging',
    m2: 62, fotos: 0, prijs: null,
    bot: 'Nog geen reactie — Surface vraagt foto\'s', binnen: '1u 4m', tone: 'amber',
    actie: 'Stuur reminder', actieIcon: 'wa',
    why: 'Geen contact sinds binnenkomst formulier',
    bron: 'form',
  },
  {
    id: 'L-2081', naam: 'VVE Stadshof', plaats: 'Rotterdam',
    stage: 'gesprek', dienst: 'Intake plaatsbezoek',
    m2: 480, fotos: 8, prijs: null,
    bot: 'Wacht op datum-voorstel klant', binnen: '3u', tone: 'blue',
    actie: 'Plan plaatsbezoek', actieIcon: 'cal',
    why: 'Zakelijk · 480m² · vraagt aparte begroting',
    bron: 'form', tag: 'Zakelijk',
  },

  {
    id: 'L-2084', naam: 'Familie Bakker', plaats: 'Bilthoven',
    stage: 'review', dienst: 'Oprit · invegen + korstmos',
    m2: 88, fotos: 6, prijs: 736,
    bot: 'Korstmos-toeslag toegevoegd — review nodig', binnen: '4u 12m', tone: 'red',
    actie: 'Goedkeuren', actieIcon: 'check',
    why: 'Korstmos toeslag · jij moet goedkeuren',
    bron: 'wa', urgent: true,
  },
  {
    id: 'L-2080', naam: 'Peter Hofstra', plaats: 'Utrecht',
    stage: 'review', dienst: 'Tuinpad · invegen',
    m2: 42, fotos: 3, prijs: 998,
    bot: 'Buiten radius — handmatig beslissen', binnen: '6u', tone: 'red',
    actie: 'Beslis radius', actieIcon: 'pin',
    why: '86 km buiten serviceradius',
    bron: 'wa', urgent: true,
  },

  {
    id: 'L-2086', naam: 'Bouwbedrijf Korstmos', plaats: 'Pijnacker',
    stage: 'uit', dienst: 'Bedrijfsterrein · jaar­onderhoud',
    m2: 380, fotos: 12, prijs: 4180,
    bot: 'Offerte verstuurd · wacht op akkoord', binnen: '2u', tone: 'blue',
    actie: 'WhatsApp opvolgen', actieIcon: 'wa',
    why: 'Verstuurd 2u geleden · open',
    bron: 'wa', tag: 'Zakelijk',
  },
  {
    id: 'L-2083', naam: 'Thomas Wilms', plaats: 'Zoetermeer',
    stage: 'uit', dienst: 'Terras · reiniging',
    m2: 35, fotos: 5, prijs: 395,
    bot: 'Vroeg om 10% korting — Surface stelt voor', binnen: '12m', tone: 'amber',
    actie: 'Reageer op korting', actieIcon: 'pct',
    why: 'Klant vraagt korting · jij moet beslissen',
    bron: 'wa', urgent: true,
  },

  {
    id: 'L-2085', naam: 'Marieke v.d. Heijden', plaats: 'Rotterdam',
    stage: 'gepland', dienst: 'Oprit · invegen',
    m2: 62, fotos: 4, prijs: 540,
    bot: 'Bevestigde di 19 mei 09:00', binnen: '24m', tone: 'green',
    actie: 'Open afspraak', actieIcon: 'cal',
    why: 'Di 19 mei · 09:00 – 12:00',
    bron: 'wa', datum: 'di 19 mei',
  },
  {
    id: 'L-2082', naam: 'Sandra Janssen', plaats: 'Pijnacker',
    stage: 'gepland', dienst: 'Oprit · invegen + beschermlaag',
    m2: 156, fotos: 9, prijs: 1340,
    bot: 'Ingepland vr 15 mei 08:30', binnen: '4u', tone: 'green',
    actie: 'Open afspraak', actieIcon: 'cal',
    why: 'Vr 15 mei · 08:30 – 14:30',
    bron: 'wa', datum: 'vr 15 mei',
  },

  {
    id: 'L-2079', naam: 'Anna Smit', plaats: 'Den Haag',
    stage: 'klaar', dienst: 'Terras · invegen',
    m2: 45, fotos: 6, prijs: 410,
    bot: 'Klus afgerond · review verstuurd', binnen: 'gist', tone: 'gray',
    actie: 'Vraag review', actieIcon: 'star',
    why: 'Klaar 13 mei · 5★ ontvangen',
    bron: 'wa', datum: 'ma 13 mei',
  },
  {
    id: 'L-2077', naam: 'Familie Mol', plaats: 'Voorburg',
    stage: 'klaar', dienst: 'Oprit · reiniging',
    m2: 78, fotos: 5, prijs: 615,
    bot: 'Factuur betaald · afgesloten', binnen: '3d', tone: 'gray',
    actie: 'Bekijk factuur', actieIcon: 'doc',
    why: 'Betaald · afgesloten 9 mei',
    bron: 'form', datum: 'do 9 mei',
  },
];

// Group by stage
function MLByStage(leads = ML_LEADS) {
  const out = {};
  ML_STAGES.forEach(s => out[s.key] = []);
  leads.forEach(l => { if (out[l.stage]) out[l.stage].push(l); });
  return out;
}

// Stage counts
const ML_COUNTS = (() => {
  const c = {};
  ML_STAGES.forEach(s => c[s.key] = ML_LEADS.filter(l => l.stage === s.key).length);
  return c;
})();

// ── Tiny shared UI atoms ───────────────────────────────
function MLStatusDot({ tone, t }) {
  const c = tone === 'red'   ? t.danger
         : tone === 'amber' ? t.warning
         : tone === 'green' ? t.success
         : tone === 'gray'  ? t.fgMuted
         : t.accent;
  return <span style={{
    width: 7, height: 7, borderRadius: '50%',
    background: c, flexShrink: 0,
    boxShadow: '0 0 0 3px ' + c + '24',
  }}/>;
}

function MLPill({ tone, t, children, sm, dot }) {
  const c = tone === 'red'   ? t.danger
         : tone === 'amber' ? t.warning
         : tone === 'green' ? t.success
         : tone === 'gray'  ? t.fgMuted
         : t.accent;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: sm ? '2px 7px' : '3px 9px',
      borderRadius: 9999,
      background: c + '14',
      color: c,
      fontSize: sm ? 10 : 11,
      fontWeight: 700, lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{
        width: 5, height: 5, borderRadius: '50%', background: c,
      }}/>}
      {children}
    </span>
  );
}

// "Mobiel header" used by all 4 options — big title + actions row
function MLHeader({ t, title, sub, onSearch, onFilter }) {
  return (
    <div style={{ padding: '8px 20px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.fg,
              letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            {title}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: t.fgMuted, marginTop: 5,
                display: 'flex', alignItems: 'center', gap: 7 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onSearch} style={{
            width: 40, height: 40, borderRadius: 20,
            background: t.chipBg, border: 'none', color: t.fg,
            display: 'grid', placeItems: 'center',
          }}>
            <AIcon name="search" size={18}/>
          </button>
          <button
            onClick={() => window.__openManualQuote?.()}
            aria-label="Nieuwe offerte"
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              border: 'none', color: 'white',
              display: 'grid', placeItems: 'center',
              boxShadow: `0 4px 14px ${t.accent}40`,
              cursor: 'pointer',
            }}>
            <AIcon name="plus" size={20} stroke={2.6} color="white"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// Source-icon (whatsapp / formulier) badge — small dot
function MLSourceDot({ bron, t }) {
  if (bron === 'wa') {
    return <span style={{
      width: 14, height: 14, borderRadius: '50%',
      background: t.wa, color: 'white',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z"/></svg>
    </span>;
  }
  return <span style={{
    width: 14, height: 14, borderRadius: 4,
    background: t.chipBg, color: t.fgSoft,
    display: 'inline-grid', placeItems: 'center', flexShrink: 0,
  }}>
    <AIcon name="doc" size={9} stroke={2.4} color={t.fgSoft}/>
  </span>;
}

Object.assign(window, {
  ML_STAGES, ML_LEADS, ML_COUNTS, MLByStage,
  MLStatusDot, MLPill, MLHeader, MLSourceDot,
});
