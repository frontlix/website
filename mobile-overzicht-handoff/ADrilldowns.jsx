// src/optie-a/ADrilldowns.jsx
// Wat-nu, Vandaag, Activiteit — drilldown screens reached from Overzicht

// ── WAT NU — full urgent list ──────────────────────────────
function AWatNu({ t, onBack, showBottomNav = true, onTab }) {
  const filters = ['Alle', 'Urgent', 'Wachtend', 'Buiten radius'];
  const counts  = { 'Alle': 5, 'Urgent': 2, 'Wachtend': 3, 'Buiten radius': 1 };
  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54 + 52, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      <ANavBar t={t} title="Wat nu" sub="5 acties wachten op jou" onBack={onBack}/>

      {/* Filter chips */}
      <div style={{
        position: 'absolute', top: 54 + 52, left: 0, right: 0, zIndex: 8,
        padding: '10px 16px',
        background: t.bg,
        borderBottom: '0.5px solid ' + t.borderSoft,
      }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {filters.map((f, i) => {
            const on = i === 0;
            return (
              <button key={f} style={{
                padding: '7px 12px', minHeight: 32,
                background: on ? t.fg : t.chipBg, color: on ? t.bg : t.fg,
                border: 'none', borderRadius: 9999,
                fontSize: 13, fontWeight: 600,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {f} <span style={{ opacity: 0.55, marginLeft: 4, fontWeight: 500 }}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 56 }}/>

      {/* Group: urgent */}
      <SectionLbl t={t} text="Vandaag eerst" tone={t.danger}/>
      <CardList t={t}>
        {A_URGENT.slice(0,2).map((u, i, arr) => (
          <UrgentDetailRow key={u.id} u={u} t={t} last={i === arr.length - 1}/>
        ))}
      </CardList>

      {/* Group: wachtend */}
      <SectionLbl t={t} text="Wachtend op opvolgen"/>
      <CardList t={t}>
        {A_URGENT.slice(2).map((u, i, arr) => (
          <UrgentDetailRow key={u.id} u={u} t={t} last={i === arr.length - 1}/>
        ))}
      </CardList>

      {showBottomNav && <ABottomNav active="home" t={t} onTab={onTab}/>}
    </div>
  );
}

function UrgentDetailRow({ u, t, last }) {
  const tone = u.tone === 'red' ? t.danger : u.tone === 'amber' ? t.warning : t.accent;
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid ' + t.borderSoft,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <AAvatar name={u.name} size={40} t={t} tint={u.id.length}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.fg,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.name}
          </div>
          <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 1 }}>{u.meta}</div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: tone + '14', color: tone,
          padding: '4px 9px', borderRadius: 9,
          fontSize: 11, fontWeight: 700,
        }}>
          <AIcon name="clock" size={11} color={tone}/> {u.age}
        </div>
      </div>
      <div style={{ fontSize: 13, color: t.fgSoft, lineHeight: 1.4, marginBottom: 12 }}>
        {u.why}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '10px 12px', minHeight: 40, border: 'none',
          background: t.accent, color: 'white',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
        }}>Open offerte</button>
        <button style={{
          padding: '10px 14px', minHeight: 40,
          background: t.chipBg, color: t.fg, border: 'none',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <AIcon name="wa" size={14} color={t.wa}/> Chat
        </button>
      </div>
    </div>
  );
}


// ── VANDAAG — appointments with route preview ─────────────
function AVandaag({ t, onBack, showBottomNav = true, onTab }) {
  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54 + 52, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      <ANavBar t={t} title="Vandaag · 3 stops"
        sub="don 28 nov · 10:30 – 17:30"
        onBack={onBack}
        right={
          <button style={{
            background: 'transparent', color: t.accent, border: 'none',
            fontSize: 14, fontWeight: 500, padding: 8,
          }}>Kaart</button>
        }
      />

      {/* Day summary */}
      <div style={{ padding: '8px 16px 14px' }}>
        <div style={{
          background: t.surface, borderRadius: 16, padding: 14,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
        }}>
          <RouteMini t={t}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: t.fgMuted }}>Totaal vandaag</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.fg,
                letterSpacing: '-0.02em', marginTop: 2 }}>62 km · 7u 25m</div>
            <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 4 }}>
              Bilthoven → Zeist → Utrecht
            </div>
          </div>
        </div>
      </div>

      <SectionLbl t={t} text="Stops"/>

      {/* Timeline of appointments */}
      <div style={{ padding: '0 16px 18px', position: 'relative' }}>
        {A_TODAY.map((a, i) => (
          <AppointmentCard key={i} a={a} t={t}
            kind={i === 0 ? 'huidig' : i === 1 ? 'volgende' : 'later'}
            isFirst={i === 0} isLast={i === A_TODAY.length - 1}/>
        ))}
      </div>

      {showBottomNav && <ABottomNav active="cal" t={t} onTab={onTab}/>}
    </div>
  );
}

function AppointmentCard({ a, t, kind, isFirst, isLast }) {
  const tone = kind === 'huidig' ? t.success : kind === 'volgende' ? t.accent : t.fgMuted;
  const lbl  = kind === 'huidig' ? 'Nu' : kind === 'volgende' ? 'Volgende' : 'Later';
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      {/* Timeline rail */}
      <div style={{ width: 16, position: 'relative', flexShrink: 0 }}>
        {!isFirst && <div style={{ position: 'absolute', left: 7, top: 0, height: 18, width: 2, background: t.borderSoft }}/>}
        <div style={{
          position: 'absolute', left: 0, top: 16,
          width: 16, height: 16, borderRadius: '50%',
          background: t.bg, border: '3px solid ' + tone,
        }}/>
        {!isLast && <div style={{ position: 'absolute', left: 7, top: 32, bottom: 0, width: 2, background: t.borderSoft }}/>}
      </div>
      <div style={{
        flex: 1, background: t.surface, borderRadius: 14, padding: 14,
        marginBottom: 12, boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: tone,
              background: tone + '14', padding: '3px 8px', borderRadius: 8,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{lbl}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.fg }}>{a.tijd}</span>
            <span style={{ fontSize: 12, color: t.fgMuted }}>· {a.dur}</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, color: t.fgMuted,
            background: t.chipBg, padding: '3px 8px', borderRadius: 8,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>{a.kind}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.fg, marginTop: 8 }}>{a.name}</div>
        <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 2,
            display: 'flex', alignItems: 'center', gap: 4 }}>
          <AIcon name="pin" size={11} color={t.fgMuted}/> {a.adres}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button style={{
            flex: 1, padding: '8px', minHeight: 36, border: 'none',
            background: t.chipBg, color: t.fg,
            borderRadius: 9, fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <AIcon name="pin" size={12}/> Navigatie
          </button>
          <button style={{
            flex: 1, padding: '8px', minHeight: 36, border: 'none',
            background: t.chipBg, color: t.fg,
            borderRadius: 9, fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <AIcon name="phone" size={12}/> Bellen
          </button>
          <button style={{
            flex: 1, padding: '8px', minHeight: 36, border: 'none',
            background: t.chipBg, color: t.fg,
            borderRadius: 9, fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <AIcon name="doc" size={12}/> Lead
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteMini({ t }) {
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" style={{ flexShrink: 0 }}>
      <rect width="58" height="58" rx="12" fill={t.accent + '14'}/>
      <path d="M10 42 Q 20 30 30 30 T 48 14"
        fill="none" stroke={t.accent} strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="2 4"/>
      <circle cx="10" cy="42" r="4" fill={t.success}/>
      <circle cx="30" cy="30" r="3.5" fill={t.accent}/>
      <circle cx="48" cy="14" r="4" fill={t.warning}/>
    </svg>
  );
}


// ── ACTIVITEIT — full feed with filters & day grouping ───
function AActiviteit({ t, onBack, showBottomNav = true, onTab }) {
  const filters = ['Alles', 'Leads', 'Offertes', 'WhatsApp', 'Afspraken'];
  // Group by 'ago'
  const groups = {};
  A_FEED.forEach(f => { (groups[f.ago] ||= []).push(f); });
  const groupOrder = ['nu', 'vandaag', 'gisteren'];
  const groupLbl = { nu: 'Net binnen', vandaag: 'Eerder vandaag', gisteren: 'Gisteren' };

  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54 + 52, paddingBottom: 86,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      <ANavBar t={t} title="Activiteit" onBack={onBack}
        sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <ALiveDot/> live · 9 events
        </span>}
        right={<button style={{
          background: 'transparent', border: 'none', color: t.accent,
          padding: 8, display: 'grid', placeItems: 'center',
        }}><AIcon name="filter" size={20} color={t.accent}/></button>}
      />

      {/* Filter chips */}
      <div style={{
        position: 'absolute', top: 54 + 52, left: 0, right: 0, zIndex: 8,
        padding: '10px 16px',
        background: t.bg,
        borderBottom: '0.5px solid ' + t.borderSoft,
      }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {filters.map((f, i) => {
            const on = i === 0;
            return (
              <button key={f} style={{
                padding: '7px 12px', minHeight: 32,
                background: on ? t.fg : t.chipBg, color: on ? t.bg : t.fg,
                border: 'none', borderRadius: 9999,
                fontSize: 13, fontWeight: 600,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>{f}</button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 56 }}/>

      {groupOrder.filter(g => groups[g]).map(g => (
        <React.Fragment key={g}>
          <SectionLbl t={t} text={groupLbl[g]}/>
          <CardList t={t}>
            {groups[g].map((f, i, arr) => (
              <BigFeedRow key={i} f={f} t={t} last={i === arr.length - 1}/>
            ))}
          </CardList>
        </React.Fragment>
      ))}

      {showBottomNav && <ABottomNav active="home" t={t} onTab={onTab}/>}
    </div>
  );
}

function BigFeedRow({ f, t, last }) {
  const tone = f.kind === 'wa' ? t.wa :
               f.kind === 'new' ? t.accent :
               f.kind === 'appt' ? t.success : t.warning;
  const ic = f.kind === 'wa' ? 'wa' :
             f.kind === 'new' ? 'user' :
             f.kind === 'appt' ? 'cal' : 'doc';
  const kindLbl = f.kind === 'wa' ? 'WhatsApp' :
                  f.kind === 'new' ? 'Nieuwe lead' :
                  f.kind === 'appt' ? 'Afspraak' : 'Offerte';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', minHeight: 64,
      borderBottom: last ? 'none' : '0.5px solid ' + t.borderSoft,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10,
        background: tone + '20', color: tone,
        display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <AIcon name={ic} size={17}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.fg,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.name}
          </div>
          <div style={{ fontSize: 11, color: t.fgMuted, flexShrink: 0 }}>{f.time}</div>
        </div>
        <div style={{ fontSize: 13, color: t.fgSoft, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {f.text}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: tone,
          textTransform: 'uppercase', letterSpacing: '.05em' }}>{kindLbl}</div>
      </div>
    </div>
  );
}


// ── Common subparts ──
function SectionLbl({ t, text, tone }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: tone || t.fg,
      padding: '14px 22px 8px',
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>{text}</div>
  );
}

function CardList({ t, children }) {
  return (
    <div style={{ padding: '0 16px 6px' }}>
      <div style={{
        background: t.surface, borderRadius: 14, overflow: 'hidden',
        boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      }}>{children}</div>
    </div>
  );
}

Object.assign(window, { AWatNu, AVandaag, AActiviteit });
