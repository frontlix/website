// src/inbox-c/InboxSearch.jsx
// Search-scherm — zoek in alle berichten (niet alleen op naam).
// Toont resultaten: match-tekst gehighlight, naam + tijd erboven.

function InboxSearch({ t, onBack, onOpenChat, dark }) {
  const [q, setQ] = React.useState('');

  // Index across all messages
  const allMessages = React.useMemo(() => {
    const out = [];
    Object.entries(IC_MESSAGES).forEach(([leadId, msgs]) => {
      msgs.forEach(m => {
        if (m.system || m.day) return;
        out.push({ ...m, leadId });
      });
    });
    return out;
  }, []);

  const ql = q.trim().toLowerCase();
  const results = ql.length < 2 ? [] : allMessages.filter(m =>
    (m.body || '').toLowerCase().includes(ql)
  ).slice(0, 40);

  // Group by lead
  const grouped = React.useMemo(() => {
    const out = {};
    results.forEach(m => {
      if (!out[m.leadId]) out[m.leadId] = [];
      out[m.leadId].push(m);
    });
    return out;
  }, [results]);

  return (
    <div style={{
      height: '100%', background: t.bg, color: t.fg,
      paddingTop: 54, paddingBottom: 0,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      position: 'relative',
    }}>
      {/* Header met zoek-input */}
      <div style={{
        padding: '4px 12px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 20,
          background: 'transparent', border: 'none', color: t.fg,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
        }} aria-label="Terug">
          <AIcon name="back" size={20}/>
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 12,
          background: t.chipBg,
        }}>
          <AIcon name="search" size={16} color={t.fgMuted}/>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Zoek in berichten…"
            style={{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: t.fg, fontSize: 14,
            }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              background: 'transparent', border: 'none', padding: 2,
              cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}>
              <AIcon name="x" size={14} color={t.fgMuted}/>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {ql.length < 2 ? (
        <SearchEmptyState t={t}/>
      ) : results.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          color: t.fgMuted, fontSize: 13,
        }}>
          Geen berichten met "{q}".
        </div>
      ) : (
        <div style={{ padding: '0 16px 18px' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: t.fgMuted,
            textTransform: 'uppercase', letterSpacing: '.06em',
            margin: '4px 4px 10px',
          }}>
            {results.length} resultaten · {Object.keys(grouped).length} gesprekken
          </div>
          <div style={{
            background: t.surface, borderRadius: 14, overflow: 'hidden',
            boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
          }}>
            {Object.entries(grouped).map(([leadId, msgs], gi, arr) => {
              const c = IB_CONVOS.find(x => x.id === leadId);
              return (
                <div key={leadId} style={{
                  borderBottom: gi < arr.length - 1 ? '0.5px solid ' + t.borderSoft : 'none',
                }}>
                  <button onClick={() => onOpenChat?.(leadId)} style={{
                    width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none',
                    padding: '12px 14px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    cursor: 'pointer',
                  }}>
                    <AAvatar name={c.naam} size={36} t={t} tint={c.id.length}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'baseline',
                        justifyContent: 'space-between', gap: 8,
                      }}>
                        <div style={{
                          fontSize: 14.5, fontWeight: 700, color: t.fg,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          minWidth: 0, flex: 1,
                        }}>{c.naam}</div>
                        <span style={{
                          fontSize: 11, color: t.fgMuted, flexShrink: 0,
                          fontWeight: 600,
                        }}>{msgs.length} match{msgs.length === 1 ? '' : 'es'}</span>
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        marginTop: 8,
                      }}>
                        {msgs.slice(0, 3).map(m => (
                          <SearchHit key={m.id} m={m} q={ql} t={t}/>
                        ))}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchHit({ m, q, t }) {
  // Highlight de match
  const body = m.body || '';
  const idx = body.toLowerCase().indexOf(q);
  const isSurface = m.from === 'surface';
  let before, hit, after;
  if (idx >= 0) {
    // Trim context to 60 chars around match
    const start = Math.max(0, idx - 30);
    const end = Math.min(body.length, idx + q.length + 60);
    before = (start > 0 ? '…' : '') + body.slice(start, idx);
    hit = body.slice(idx, idx + q.length);
    after = body.slice(idx + q.length, end) + (end < body.length ? '…' : '');
  } else {
    before = body; hit = ''; after = '';
  }
  return (
    <div style={{
      padding: '7px 10px',
      background: t.dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.025)',
      borderRadius: 8,
      fontSize: 12.5, color: t.fgSoft, lineHeight: 1.4,
      display: 'flex', gap: 7, alignItems: 'flex-start',
    }}>
      {isSurface ? (
        <span style={{
          width: 14, height: 14, borderRadius: 4,
          background: 'linear-gradient(135deg,#0C7AB8,#074F77)',
          color: 'white', display: 'inline-grid', placeItems: 'center', flexShrink: 0,
          marginTop: 1,
        }}>
          <AIcon name="spark" size={7} stroke={2.6} color="white"/>
        </span>
      ) : (
        <span style={{
          fontSize: 10, fontWeight: 700, color: t.fgMuted,
          flexShrink: 0, marginTop: 2,
        }}>{m.time}</span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        {before}
        <mark style={{
          background: t.accent + '40', color: t.fg,
          padding: '0 2px', borderRadius: 3,
        }}>{hit}</mark>
        {after}
      </span>
    </div>
  );
}

function SearchEmptyState({ t }) {
  const tips = [
    'Zoek door alle berichten — niet alleen op naam.',
    'Probeer: "factuur", "korting", "maandag".',
    'Resultaten worden gegroepeerd per gesprek.',
  ];
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <div style={{
        background: t.surface, borderRadius: 14, padding: 16,
        boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: t.fgMuted,
          textTransform: 'uppercase', letterSpacing: '.06em',
          marginBottom: 10,
        }}>Tips</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{
              fontSize: 13, color: t.fgSoft, lineHeight: 1.4,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: t.accent, marginTop: 6, flexShrink: 0,
              }}/>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.InboxSearch = InboxSearch;
