// src/leads-a/LeadsFilterSheet.jsx
// Werkende filter-sheet — controlled component voor LeadsScreen.
// Houdt eigen "draft" state, past pas toe bij Toon-knop click.

function LeadsFilterSheet({ t, open, onClose, current, onApply }) {
  const [stages,   setStages]   = React.useState(current.stages);
  const [bronnen,  setBronnen]  = React.useState(current.bronnen);
  const [urgentOnly, setUrgentOnly] = React.useState(current.urgentOnly);
  const [sort,     setSort]     = React.useState(current.sort);

  // Re-sync when sheet re-opens with new "current"
  React.useEffect(() => {
    if (open) {
      setStages(current.stages);
      setBronnen(current.bronnen);
      setUrgentOnly(current.urgentOnly);
      setSort(current.sort);
    }
  }, [open]);

  if (!open) return null;

  const toggle = (set, setSet, k) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSet(next);
  };
  const activeCount =
    (stages.size  < ML_STAGES.length ? 1 : 0) +
    (bronnen.size < 2 ? 1 : 0) +
    (urgentOnly ? 1 : 0) +
    (sort !== 'binnen' ? 1 : 0);
  const matchCount = ML_LEADS.filter(l =>
    stages.has(l.stage) &&
    bronnen.has(l.bron) &&
    (!urgentOnly || l.urgent)
  ).length;

  const wipe = () => {
    setStages(new Set(ML_STAGES.map(s => s.key)));
    setBronnen(new Set(['wa', 'form']));
    setUrgentOnly(false);
    setSort('binnen');
  };
  const apply = () => {
    onApply({ stages, bronnen, urgentOnly, sort });
    onClose?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.36)',
          zIndex: 50,
          animation: 'lasFade .2s ease-out both',
        }}
      />
      <style>{`
        @keyframes lasFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lasSlide { from { transform: translateY(110%); } to { transform: translateY(0); } }
      `}</style>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.surface,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '8px 0 26px',
        zIndex: 60,
        boxShadow: '0 -12px 40px rgba(0,0,0,.25)',
        maxHeight: '88%',
        overflowY: 'auto',
        animation: 'lasSlide .3s cubic-bezier(.32,.72,0,1) both',
      }}>
        <div style={{
          width: 38, height: 5, borderRadius: 3,
          background: t.fgMuted + '50',
          margin: '6px auto 14px',
        }}/>

        <div style={{
          padding: '0 20px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: 19, fontWeight: 800, color: t.fg,
            letterSpacing: '-0.02em',
          }}>
            Filters
            {activeCount > 0 && <span style={{
              fontSize: 11, fontWeight: 700, color: 'white',
              background: t.accent, padding: '2px 7px', borderRadius: 9999,
              marginLeft: 8, verticalAlign: 'middle',
            }}>{activeCount}</span>}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: t.accent,
            fontSize: 14, fontWeight: 600, padding: 4, cursor: 'pointer',
          }}>Sluit</button>
        </div>

        <LFSSection t={t} title="Fase" sub="Tik om in/uit te schakelen — meerdere mogelijk">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ML_STAGES.map(s => {
              const on = stages.has(s.key);
              const tone = (LA_STAGE_META[s.key]?.tone) || s.tone;
              const c = laToneColor(tone, t);
              return (
                <button key={s.key}
                  onClick={() => toggle(stages, setStages, s.key)}
                  style={{
                    padding: '8px 12px', minHeight: 36,
                    background: on ? c + '20' : t.chipBg,
                    color: on ? c : t.fgSoft,
                    border: '1px solid ' + (on ? c + '50' : 'transparent'),
                    borderRadius: 9999,
                    fontSize: 13, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer',
                  }}>
                  {on && <AIcon name="check" size={12} stroke={3} color={c}/>}
                  {s.label}
                  <span style={{ opacity: 0.6, fontWeight: 500, fontSize: 12 }}>
                    {ML_COUNTS[s.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </LFSSection>

        <LFSSection t={t} title="Bron">
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { k: 'wa',   l: 'WhatsApp',  c: t.wa,     icon: 'wa' },
              { k: 'form', l: 'Formulier', c: t.accent, icon: 'doc' },
            ].map(b => {
              const on = bronnen.has(b.k);
              return (
                <button key={b.k}
                  onClick={() => toggle(bronnen, setBronnen, b.k)}
                  style={{
                    flex: 1, padding: '10px 12px', minHeight: 42,
                    background: on ? b.c + '14' : t.chipBg,
                    color: on ? b.c : t.fgSoft,
                    border: '1px solid ' + (on ? b.c + '50' : 'transparent'),
                    borderRadius: 12,
                    fontSize: 13, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', gap: 7,
                    cursor: 'pointer',
                  }}>
                  <AIcon name={b.icon} size={14} color={on ? b.c : t.fgSoft}/>
                  {b.l}
                </button>
              );
            })}
          </div>
        </LFSSection>

        <LFSSection t={t} title="Snel filter">
          <button
            onClick={() => setUrgentOnly(v => !v)}
            style={{
              width: '100%',
              padding: '12px 14px', minHeight: 48,
              background: urgentOnly ? t.danger + '14' : t.chipBg,
              border: '1px solid ' + (urgentOnly ? t.danger + '50' : 'transparent'),
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              fontSize: 14, fontWeight: 600, color: urgentOnly ? t.danger : t.fg,
            }}>
              <AIcon name="bolt" size={15} color={urgentOnly ? t.danger : t.fgSoft}/>
              Alleen urgent
            </span>
            <span style={{
              width: 40, height: 24, borderRadius: 12,
              background: urgentOnly ? t.danger : t.fgMuted + '40',
              position: 'relative', transition: 'background .15s',
            }}>
              <span style={{
                position: 'absolute', top: 2,
                left: urgentOnly ? 18 : 2,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                transition: 'left .15s',
              }}/>
            </span>
          </button>
        </LFSSection>

        <LFSSection t={t} title="Sorteer op">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { k: 'binnen', l: 'Binnen­gekomen', icon: 'clock' },
              { k: 'prijs',  l: 'Offerteprijs',   icon: 'euro' },
              { k: 'naam',   l: 'Naam (A–Z)',     icon: 'user' },
              { k: 'fase',   l: 'Fase',           icon: 'list' },
            ].map(s => {
              const on = sort === s.k;
              return (
                <button key={s.k}
                  onClick={() => setSort(s.k)}
                  style={{
                    padding: '10px 12px', minHeight: 44,
                    background: on ? t.accent + '14' : t.chipBg,
                    color: on ? t.accent : t.fgSoft,
                    border: '1px solid ' + (on ? t.accent + '40' : 'transparent'),
                    borderRadius: 11,
                    fontSize: 13, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    cursor: 'pointer',
                  }}>
                  <AIcon name={s.icon} size={13} color={on ? t.accent : t.fgSoft}/>
                  {s.l}
                </button>
              );
            })}
          </div>
        </LFSSection>

        <div style={{
          padding: '8px 20px 0',
          display: 'flex', gap: 8,
        }}>
          <button onClick={wipe} style={{
            padding: '12px 16px', minHeight: 48,
            background: t.chipBg, color: t.fg, border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>Wis</button>
          <button onClick={apply} style={{
            flex: 1, padding: '12px 16px', minHeight: 48,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            color: 'white', border: 'none',
            borderRadius: 12, fontSize: 14, fontWeight: 700,
            boxShadow: `0 4px 14px ${t.accent}40`,
            cursor: 'pointer',
          }}>
            Toon {matchCount} {matchCount === 1 ? 'lead' : 'leads'}
          </button>
        </div>
      </div>
    </>
  );
}

function LFSSection({ t, title, sub, children }) {
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: t.fgMuted,
        textTransform: 'uppercase', letterSpacing: '.06em',
        margin: '0 0 8px',
      }}>{title}</div>
      {sub && <div style={{
        fontSize: 11.5, color: t.fgMuted, margin: '-4px 0 8px',
        lineHeight: 1.4,
      }}>{sub}</div>}
      {children}
    </div>
  );
}

window.LeadsFilterSheet = LeadsFilterSheet;
