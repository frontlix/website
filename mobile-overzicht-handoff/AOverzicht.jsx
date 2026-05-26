// src/optie-a/AOverzicht.jsx
// Main mobile dashboard screen — polished version of Option A

function AOverzicht({ t, onOpen, showBottomNav = true, onTab }) {
  const k = A_KPIS;
  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Large-title header (iOS style) */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800,
                color: t.fg, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
              Goedemiddag
            </div>
            <div style={{ fontSize: 13, color: t.fgMuted, marginTop: 5,
                display: 'flex', alignItems: 'center', gap: 7 }}>
              <ALiveDot/> 14 leads vandaag · 4 morgen
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onOpen?.('search')} style={{
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
            <button style={{
              width: 40, height: 40, borderRadius: 20,
              background: t.chipBg, border: 'none', color: t.fg,
              display: 'grid', placeItems: 'center', position: 'relative',
            }}>
              <AIcon name="bell" size={18}/>
              <span style={{
                position: 'absolute', top: 6, right: 8,
                width: 8, height: 8, borderRadius: '50%',
                background: t.danger, border: '2px solid ' + t.bg,
              }}/>
            </button>
          </div>
        </div>
      </div>

      {/* AI Brief — compact, dismissible */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          background: t.dark ? 'rgba(26,86,255,.10)' : 'linear-gradient(135deg, rgba(26,86,255,.06), rgba(0,207,255,.06))',
          border: '1px solid ' + (t.dark ? 'rgba(26,86,255,.30)' : 'rgba(26,86,255,.16)'),
          borderRadius: 16, padding: 14,
          display: 'flex', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
            boxShadow: `0 4px 12px ${t.accent}40`,
          }}>
            <AIcon name="spark" size={18}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Surface · samenvatting
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.fg,
                marginTop: 3, letterSpacing: '-0.01em' }}>
              Drie dingen voor de koffie
            </div>
            <div style={{ fontSize: 13, color: t.fgSoft, lineHeight: 1.45, marginTop: 5 }}>
              +14 leads sinds gisteren. 2 offertes wachten op je akkoord. Bakker wacht al 4u.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
              <button onClick={() => onOpen?.('watnu')} style={{
                padding: '8px 14px', minHeight: 36, border: 'none',
                background: t.accent, color: 'white',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                Open de 2 wachtenden <AIcon name="arrow" size={12} stroke={2.4}/>
              </button>
              <button style={{
                padding: '8px 12px', minHeight: 36,
                background: 'transparent', color: t.fgSoft,
                border: 'none', fontSize: 13, fontWeight: 500,
              }}>
                Verberg
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* HERO KPI — omzet with goal ring + sparkline */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{
          background: t.surface, borderRadius: 20, padding: 18,
          boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: t.fgMuted, fontWeight: 500 }}>Omzet deze maand</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: t.fg,
                  letterSpacing: '-0.025em', lineHeight: 1.02, marginTop: 6 }}>
                {fmtA(k.omzet.v)}
              </div>
              <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, color: t.success,
                  background: t.success + '14', padding: '4px 10px', borderRadius: 9 }}>
                <span style={{ transform: 'rotate(-45deg)', display: 'inline-block' }}>
                  <AIcon name="arrow" size={11} stroke={2.6} color={t.success}/>
                </span>
                {k.omzet.delta} vs week
              </div>
            </div>
            <AGoalRing pct={74} t={t} size={88}/>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12,
              borderTop: '0.5px solid ' + t.borderSoft }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 12, color: t.fgMuted }}>Doel: <span style={{ color: t.fg, fontWeight: 600 }}>€25.000</span></div>
              <div style={{ fontSize: 12, color: t.fgMuted }}>nog 5 werkdagen</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 mini KPIs */}
      <div style={{ padding: '0 16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { k: k.leads,     i: 'inbox', tone: t.accent  },
            { k: k.conversie, i: 'pct',   tone: '#0891B2' },
            { k: k.reactie,   i: 'clock', tone: t.warning },
            { k: k.open,      i: 'doc',   tone: '#7C3AED' },
          ].map((m, i) => (
            <div key={i} style={{
              background: t.surface, borderRadius: 14, padding: 14,
              boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: m.tone + '18', color: m.tone,
                  display: 'grid', placeItems: 'center',
                }}>
                  <AIcon name={m.i} size={14}/>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.success }}>{m.k.delta}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: t.fg,
                  letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1 }}>
                {m.k.v}
                <span style={{ fontSize: 14, fontWeight: 600, color: t.fgMuted, marginLeft: 2 }}>
                  {m.k.suffix || ''}
                </span>
              </div>
              <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 5 }}>{m.k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WAT NU */}
      <SectionHeader t={t}
        title="Wat nu"
        right={
          <button onClick={() => onOpen?.('watnu')} style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 13, fontWeight: 600, padding: 4,
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            Alle {A_URGENT.length} <AIcon name="chev" size={14} color={t.accent}/>
          </button>
        }
      />
      <div style={{ padding: '0 16px 18px' }}>
        <div style={{ background: t.surface, borderRadius: 14, overflow: 'hidden',
            boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)' }}>
          {A_URGENT.slice(0,2).map((u, i, arr) => (
            <UrgentRow key={u.id} u={u} t={t} last={i === arr.length - 1}/>
          ))}
        </div>
      </div>

      {/* Vandaag — next appointment */}
      <SectionHeader t={t}
        title="Vandaag"
        right={
          <button onClick={() => onOpen?.('vandaag')} style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 13, fontWeight: 600, padding: 4,
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            3 afspraken <AIcon name="chev" size={14} color={t.accent}/>
          </button>
        }
      />
      <div style={{ padding: '0 16px 18px' }}>
        <NextAppt appt={A_TODAY[0]} t={t}/>
      </div>

      {/* Activity */}
      <SectionHeader t={t}
        title="Recent"
        sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.fgMuted }}>
          <ALiveDot/> live
        </span>}
        right={
          <button onClick={() => onOpen?.('feed')} style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 13, fontWeight: 600, padding: 4,
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            Alles <AIcon name="chev" size={14} color={t.accent}/>
          </button>
        }
      />
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ background: t.surface, borderRadius: 14, overflow: 'hidden',
            boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)' }}>
          {A_FEED.slice(0, 4).map((f, i, arr) => (
            <FeedRow key={i} f={f} t={t} last={i === arr.length - 1}/>
          ))}
        </div>
      </div>

      {showBottomNav && <ABottomNav active="home" t={t} onTab={onTab}/>}
    </div>
  );
}

// ── Subparts ──
function SectionHeader({ title, sub, right, t }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', padding: '0 22px 10px',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.fg,
            textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
        {sub && <span style={{ fontSize: 11 }}>{sub}</span>}
      </div>
      {right}
    </div>
  );
}

function UrgentRow({ u, t, last }) {
  const tone = u.tone === 'red' ? t.danger : u.tone === 'amber' ? t.warning : t.accent;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', minHeight: 56,
      borderBottom: last ? 'none' : '0.5px solid ' + t.borderSoft,
    }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: tone, marginRight: -4 }}/>
      <AAvatar name={u.name} size={36} t={t} tint={u.id.length}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.name}
        </div>
        <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.why}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: tone, fontWeight: 700 }}>{u.age}</div>
        <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 2 }}>{u.meta.split('·')[0].trim()}</div>
      </div>
      <AIcon name="chev" size={16} color={t.fgMuted}/>
    </div>
  );
}

function FeedRow({ f, t, last }) {
  const tone = f.kind === 'wa' ? t.wa :
               f.kind === 'new' ? t.accent :
               f.kind === 'appt' ? t.success : t.warning;
  const ic = f.kind === 'wa' ? 'wa' :
             f.kind === 'new' ? 'user' :
             f.kind === 'appt' ? 'cal' : 'doc';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 16px', minHeight: 52,
      borderBottom: last ? 'none' : '0.5px solid ' + t.borderSoft,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9,
        background: tone + '20', color: tone,
        display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <AIcon name={ic} size={15}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: t.fg, lineHeight: 1.35 }}>
          <span style={{ fontWeight: 600 }}>{f.name}</span>{' '}
          <span style={{ color: t.fgSoft }}>{f.text}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: t.fgMuted, flexShrink: 0 }}>{f.time}</div>
    </div>
  );
}

function AGoalRing({ pct, t, size = 80 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="aring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={t.accent}/>
            <stop offset="1" stopColor={t.accent2}/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={t.borderSoft} strokeWidth="6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#aring)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontSize: 18, fontWeight: 800, color: t.fg, letterSpacing: '-0.01em' }}>
        {pct}%
      </div>
    </div>
  );
}

function NextAppt({ appt, t }) {
  return (
    <div style={{
      background: t.surface, borderRadius: 14, padding: 14,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <div style={{
        background: t.accent + '14', color: t.accent,
        borderRadius: 10, padding: '6px 8px',
        minWidth: 52, textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>nu</div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 1 }}>{appt.tijd}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {appt.name}
        </div>
        <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 1,
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <AIcon name="pin" size={11} color={t.fgMuted}/>
          {appt.adres}
        </div>
      </div>
      <button style={{
        padding: '8px 12px', background: t.accent, color: 'white',
        border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      }}>
        <AIcon name="pin" size={12} color="white"/> Route
      </button>
    </div>
  );
}

window.AOverzicht = AOverzicht;
