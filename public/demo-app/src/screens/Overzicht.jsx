// src/screens/Overzicht.jsx
// Dashboard home — live KPI's, lead-trend, activity feed, today's appointments

const { useState: useStateOZ, useEffect: useEffectOZ } = React;

function Overzicht({ leads, navigate, empty }) {
  const [activity, setActivity] = useStateOZ(() => empty ? [] : [...ACTIVITY]);
  const [tick, setTick] = useStateOZ(0);

  // Simulate live activity — new event every ~12s
  useEffectOZ(() => {
    if (empty) return;
    const pool = [
      { kind: 'wa',   name: 'Jeroen de Vries', text: 'typt een antwoord…',           time: 'nu',  leadId: 'L-2087' },
      { kind: 'new',  name: 'Lisa Rietveld',   text: 'kwam binnen via formulier',     time: 'nu',  leadId: 'L-2090' },
      { kind: 'quote',name: 'Familie Bakker',  text: 'wacht op owner-review',         time: 'nu',  leadId: 'L-2084' },
      { kind: 'appt', name: 'Peter Hofstra',   text: 'bevestigde plaatsbezoek do 14:00', time: 'nu', leadId: 'L-2080' },
    ];
    const t = setInterval(() => {
      setActivity(prev => [pool[Math.floor(Math.random() * pool.length)], ...prev].slice(0, 9));
      setTick(n => n + 1);
    }, 9000);
    return () => clearInterval(t);
  }, [empty]);

  const todayAppts = APPOINTMENTS.slice(0, 4);
  const k = KPIS;

  if (empty) {
    return (
      <div className="content-inner">
        <div className="section-head">
          <div>
            <div className="section-title">Goedemorgen 👋</div>
            <div className="section-sub">Frontlix is aangesloten en wacht op je eerste lead.</div>
          </div>
        </div>
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="empty">
            <div className="empty-icon"><Icon name="inbox" size={28} /></div>
            <div className="empty-title">Nog geen leads binnen</div>
            <div className="empty-sub">Zodra je formulier een aanvraag krijgt, plopt 'ie hier binnen en stuurt Surface binnen 60 seconden een WhatsApp-bericht.</div>
            <button className="btn btn-secondary" style={{ marginTop: 8 }}>
              <Icon name="sparkle" size={14} /> Webhook-status checken
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-inner">
      {/* Header */}
      <div className="section-head">
        <div>
          <div className="section-title">Goedemorgen, Christiaan</div>
          <div className="section-sub">
            <span className="live-dot" style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
            Surface is live · 2 actieve gesprekken · laatste lead 2 min geleden
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => window.__openExport?.()}><Icon name="file" size={13} /> Export</button>
          <button className="btn btn-primary" onClick={() => window.__openManualQuote?.()}><Icon name="plus" size={14} /> Nieuwe offerte</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Nieuwe leads (week)"   value={k.nieuwe_leads.value}  delta={k.nieuwe_leads.delta} trend={k.nieuwe_leads.trend} />
        <KpiCard label="Conversie offerte→klant" value={k.conversie.value}   suffix="%" delta={k.conversie.delta} trend={k.conversie.trend} />
        <KpiCard label="Reactietijd (gem.)"    value={k.reactietijd.value}   suffix="s" delta={k.reactietijd.delta} trend={k.reactietijd.trend} invertDelta />
        <KpiCard label="Omzet deze maand"      value={k.omzet_maand.value}   prefix="€" delta={k.omzet_maand.delta} trend={k.omzet_maand.trend} />
      </div>

      {/* Main grid: trend chart + agenda + activity feed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
        gap: 20,
        alignItems: 'start',
      }}>
        {/* Left: trend + bot performance */}
        <div className="col">
          {/* Lead trend chart */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Lead-instroom — laatste 28 dagen</div>
                <div className="card-sub">Aantal nieuwe leads per dag</div>
              </div>
              <div className="seg">
                <button className="seg-btn">7d</button>
                <button className="seg-btn active">28d</button>
                <button className="seg-btn">90d</button>
              </div>
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <AreaChart data={TREND_28D} height={170} />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              borderTop: '1px solid var(--border)',
            }}>
              {[
                { label: 'Totaal leads',   value: '232',   sub: 'in 28d'   },
                { label: 'Auto-afgehandeld', value: '89%', sub: 'zonder hulp' },
                { label: 'Owner-handover',  value: '11%', sub: '26 stuks'   },
                { label: 'Gem. ticket',     value: '€ 847', sub: 'per offerte' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '14px 18px',
                  borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bot performance + Sources */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Trechter deze week</div>
                <Pill tone="blue" dot>Live</Pill>
              </div>
              <div style={{ padding: '14px 20px 18px' }}>
                {[
                  { label: 'Lead binnen',         count: 14, pct: 100 },
                  { label: 'Bot startte gesprek', count: 14, pct: 100 },
                  { label: 'Info compleet',       count: 11, pct: 78  },
                  { label: 'Offerte verstuurd',   count: 9,  pct: 64  },
                  { label: 'Akkoord',             count: 6,  pct: 43  },
                ].map((row, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div className="row between" style={{ marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }} className="tabular">
                        {row.count} · {row.pct}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 9999 }}>
                      <div style={{
                        width: row.pct + '%',
                        height: '100%',
                        background: 'var(--gradient)',
                        borderRadius: 9999,
                        transition: 'width 0.6s cubic-bezier(.16,1,.3,1)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Owner-acties open</div>
                <span className="pill pill-amber">3</span>
              </div>
              <div className="col" style={{ padding: 14, gap: 6 }}>
                {[
                  { lead: 'Familie Bakker',    reason: 'Korstmos-toeslag goedkeuren', tone: 'amber' },
                  { lead: 'Thomas Wilms',      reason: 'Klant vraagt korting',         tone: 'amber' },
                  { lead: 'Peter Hofstra',     reason: 'Buiten radius (86 km)',        tone: 'red'   },
                ].map((r, i) => (
                  <div key={i} className="row between" style={{
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.lead}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{r.reason}</div>
                    </div>
                    <Pill tone={r.tone}>Review</Pill>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: activity feed + appts */}
        <div className="col">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <div>
                <div className="card-title">Live activiteit</div>
                <div className="card-sub">Wat Surface op dit moment doet</div>
              </div>
              <span className="live-dot" />
            </div>
            <div className="feed" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {activity.map((a, i) => (
                <div
                  key={`${i}-${a.leadId}-${a.text}`}
                  className={`feed-row ${i === 0 && tick > 0 ? 'plop flash' : ''}`}
                  onClick={() => navigate('leads/L-2087')}
                >
                  <div className={`feed-icon ${a.kind}`}>
                    <Icon name={a.kind === 'new' ? 'sparkle' : a.kind === 'wa' ? 'whatsapp' : a.kind === 'appt' ? 'calendar' : 'file'} size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="feed-name truncate">{a.name}</div>
                    <div className="feed-meta truncate">{a.text}</div>
                  </div>
                  <div className="feed-time">{a.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Vandaag & komende dagen</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('agenda')}>
                Agenda <Icon name="arrow-right" size={12} />
              </button>
            </div>
            <div className="col" style={{ padding: 14, gap: 8 }}>
              {todayAppts.map((a, i) => (
                <div key={i} className="row" style={{
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  gap: 12,
                }}>
                  <div style={{
                    width: 44,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
                      {new Date(a.date).toLocaleDateString('nl-NL', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                      {new Date(a.date).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      {a.start}–{a.end} · {a.adres} · {a.m2}m²
                    </div>
                  </div>
                  <Pill tone={a.tone}>{a.dienst.split(' ')[0]}</Pill>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Overzicht = Overzicht;
