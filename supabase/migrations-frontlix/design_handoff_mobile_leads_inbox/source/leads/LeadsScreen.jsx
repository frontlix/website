// src/leads-a/LeadsScreen.jsx
// Werkend hoofdscherm — combineert alle approved patterns:
//  - Segmented fase-chips (sticky)
//  - LACard (medium density)
//  - Tap card → ExpandedPanel inline
//  - Swipe links/rechts → action lade
//  - Filter-knop → LeadsFilterSheet
//  - Search-knop → search input slide-in in header
//  - Live filter + sort op de geselecteerde criteria

function LeadsScreen({ t, showBottomNav = true, onTab, onOpenLead }) {
  // Top-level filter (segmented chip)
  const [filter, setFilter] = React.useState('all');

  // Search
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [search,     setSearch]     = React.useState('');

  // Tap-expand state
  const [expandedId, setExpandedId] = React.useState(null);

  // Filter-sheet (drawer)
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [advFilter, setAdvFilter] = React.useState({
    stages:     new Set(ML_STAGES.map(s => s.key)),
    bronnen:    new Set(['wa', 'form']),
    urgentOnly: false,
    sort:       'binnen',
  });

  // ── Computed: filtered & sorted lead-list ──
  const visible = React.useMemo(() => {
    let list = ML_LEADS;
    if (filter !== 'all') list = list.filter(l => l.stage === filter);
    list = list.filter(l => advFilter.stages.has(l.stage));
    list = list.filter(l => advFilter.bronnen.has(l.bron));
    if (advFilter.urgentOnly) list = list.filter(l => l.urgent);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.naam.toLowerCase().includes(q) ||
        l.plaats.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q));
    }
    // Sort
    const stageOrder = ML_STAGES.reduce((acc, s, i) => (acc[s.key] = i, acc), {});
    list = [...list].sort((a, b) => {
      switch (advFilter.sort) {
        case 'prijs': return (b.prijs || 0) - (a.prijs || 0);
        case 'naam':  return a.naam.localeCompare(b.naam, 'nl');
        case 'fase':  return stageOrder[a.stage] - stageOrder[b.stage];
        case 'binnen':
        default:      return 0; // already in arrival order
      }
    });
    return list;
  }, [filter, search, advFilter]);

  const tabs = [
    { k: 'all', l: 'Alles', c: ML_LEADS.length },
    ...ML_STAGES.map(s => ({
      k: s.key, l: s.short, c: ML_COUNTS[s.key],
      tone: (LA_STAGE_META[s.key]?.tone) || s.tone,
    })),
  ];

  // Active advanced-filter count (for badge on filter button)
  const advCount =
    (advFilter.stages.size  < ML_STAGES.length ? 1 : 0) +
    (advFilter.bronnen.size < 2 ? 1 : 0) +
    (advFilter.urgentOnly ? 1 : 0) +
    (advFilter.sort !== 'binnen' ? 1 : 0);

  // Collapse expanded card when anything changes the visible set
  React.useEffect(() => { setExpandedId(null); }, [filter, search, sheetOpen]);

  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54, paddingBottom: showBottomNav ? 86 : 0,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Header */}
      <LeadsHeader
        t={t}
        searchOpen={searchOpen}
        search={search}
        setSearch={setSearch}
        onToggleSearch={() => {
          setSearchOpen(v => {
            if (v) setSearch('');
            return !v;
          });
        }}
        onOpenFilter={() => setSheetOpen(true)}
        advCount={advCount}
        leadCount={visible.length}
        totalCount={ML_LEADS.length}
      />

      {/* Segmented chips — sticky */}
      <div style={{
        padding: '2px 16px 10px',
        position: 'sticky', top: 0, zIndex: 5,
        background: t.bg,
      }}>
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const on = tab.k === filter;
            const dotC = laToneColor(tab.tone, t);
            return (
              <button key={tab.k} onClick={() => setFilter(tab.k)} style={{
                padding: '8px 13px', minHeight: 34,
                background: on ? t.fg : t.chipBg, color: on ? t.bg : t.fg,
                border: 'none', borderRadius: 9999,
                fontSize: 13, fontWeight: 600,
                flexShrink: 0, whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                cursor: 'pointer',
              }}>
                {tab.tone && !on && <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: dotC,
                }}/>}
                {tab.l}
                <span style={{
                  opacity: on ? 0.6 : 0.55, fontWeight: 500, fontSize: 12,
                }}>{tab.c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active-filter strip — alleen zichtbaar als geavanceerd filter aan staat */}
      {advCount > 0 && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            background: t.accent + '10',
            border: '1px solid ' + t.accent + '24',
            fontSize: 12, color: t.accent, fontWeight: 600,
          }}>
            <AIcon name="filter" size={13} color={t.accent}/>
            <span style={{ flex: 1 }}>
              {advCount} actief filter{advCount === 1 ? '' : 's'} · {visible.length} resultaten
            </span>
            <button onClick={() => setAdvFilter({
              stages: new Set(ML_STAGES.map(s => s.key)),
              bronnen: new Set(['wa', 'form']),
              urgentOnly: false, sort: 'binnen',
            })} style={{
              background: 'transparent', border: 'none', color: t.accent,
              fontSize: 12, fontWeight: 700, padding: 2, cursor: 'pointer',
            }}>Wis</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{
        padding: '4px 16px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {visible.map(l => (
          <SwipeableCard
            key={l.id}
            l={l}
            t={t}
            expanded={expandedId === l.id}
            onExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
            onClose={() => setExpandedId(null)}
            onOpenLead={onOpenLead}
          />
        ))}
        {visible.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            background: t.surface, borderRadius: 14,
            color: t.fgMuted, fontSize: 13,
            marginTop: 8,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.6 }}>🔎</div>
            Geen leads die matchen — wis filters of zoekterm.
          </div>
        )}
      </div>

      {/* Filter sheet */}
      <LeadsFilterSheet
        t={t}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        current={advFilter}
        onApply={setAdvFilter}
      />

      {showBottomNav && <ABottomNav active="leads" t={t} onTab={onTab}/>}
    </div>
  );
}

// ── Header with optional inline search-bar ──
function LeadsHeader({ t, searchOpen, search, setSearch, onToggleSearch,
                      onOpenFilter, advCount, leadCount, totalCount }) {
  return (
    <div style={{ padding: '8px 16px 14px' }}>
      {searchOpen ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'lhFade .2s ease-out both',
        }}>
          <style>{`@keyframes lhFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 12,
            background: t.chipBg,
            border: '1px solid ' + t.border,
          }}>
            <AIcon name="search" size={16} color={t.fgMuted}/>
            <input
              autoFocus
              type="text"
              placeholder="Zoek naam, plaats, lead-id…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: t.fg, fontSize: 14,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                background: 'transparent', border: 'none',
                padding: 2, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
                <AIcon name="x" size={14} color={t.fgMuted}/>
              </button>
            )}
          </div>
          <button onClick={onToggleSearch} style={{
            background: 'transparent', border: 'none',
            color: t.accent, fontSize: 14, fontWeight: 600,
            padding: '8px 4px', cursor: 'pointer',
          }}>Sluit</button>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: t.fg,
              letterSpacing: '-0.025em', lineHeight: 1.05,
            }}>
              Leads
            </div>
            <div style={{
              fontSize: 13, color: t.fgMuted, marginTop: 5,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <ALiveDot/> {leadCount} van {totalCount} zichtbaar
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onToggleSearch} style={{
              width: 40, height: 40, borderRadius: 20,
              background: t.chipBg, border: 'none', color: t.fg,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }} aria-label="Zoek">
              <AIcon name="search" size={18}/>
            </button>
            <button onClick={onOpenFilter} style={{
              width: 40, height: 40, borderRadius: 20,
              background: t.chipBg, border: 'none', color: t.fg,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              position: 'relative',
            }} aria-label="Filters">
              <AIcon name="filter" size={18}/>
              {advCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  minWidth: 16, height: 16, padding: '0 4px',
                  background: t.accent, color: 'white',
                  fontSize: 10, fontWeight: 700,
                  borderRadius: 8, lineHeight: '16px', textAlign: 'center',
                  border: '2px solid ' + t.bg,
                }}>{advCount}</span>
              )}
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
      )}
    </div>
  );
}

window.LeadsScreen = LeadsScreen;
