// src/screens/Leads.jsx
// Leads overview — switchable between pipeline (course), table, and card-kanban

const { useState: useStateLD, useMemo: useMemoLD, useEffect: useEffectLD } = React;

function Leads({ view, density, navigate, empty }) {
  const [filter, setFilter] = useStateLD('all');
  const [search, setSearch] = useStateLD('');
  const [extraLeads, setExtraLeads] = useStateLD([]);

  // Simulate a new lead plopping in every ~18s when in pipeline view
  useEffectLD(() => {
    if (empty) return;
    const t = setInterval(() => {
      setExtraLeads(prev => {
        if (prev.length > 1) return prev;
        const ghosts = [
          {
            id: 'L-209' + (prev.length + 1),
            naam: prev.length === 0 ? 'Lisa Rietveld' : 'Frank de Wit',
            adres: prev.length === 0 ? 'Spuistraat 12, Den Haag' : 'Brouwerstraat 4, Delft',
            hoofd: 'oprit_terras_terrein',
            sub: ['invegen'],
            m2: 70 + Math.floor(Math.random() * 60),
            status: 'nieuw',
            fase: 'info_verzamelen',
            dashboard_status: 'open',
            binnengekomen: 'net',
            laatste_bericht: '(net binnengekomen via formulier)',
            tag: ['Particulier'],
            bron: 'formulier',
            isNew: true,
          },
        ];
        return [...prev, ghosts[prev.length]];
      });
    }, 18000);
    return () => clearInterval(t);
  }, [empty]);

  const all = useMemoLD(() => empty ? [] : [...extraLeads, ...LEADS], [extraLeads, empty]);
  const filtered = useMemoLD(() => {
    let f = all;
    if (filter !== 'all') {
      f = f.filter(l => {
        if (filter === 'nieuw')      return ['nieuw', 'in_gesprek'].includes(l.status);
        if (filter === 'review')     return ['info_compleet', 'wacht_bevestiging'].includes(l.status);
        if (filter === 'verstuurd')  return l.status === 'offerte_verstuurd';
        if (filter === 'gepland')    return l.status === 'goedgekeurd';
        if (filter === 'archief')    return ['afgewezen'].includes(l.status) || l.dashboard_status === 'afgehandeld';
        return true;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(l => l.naam.toLowerCase().includes(q) || l.adres.toLowerCase().includes(q));
    }
    return f;
  }, [all, filter, search]);

  return (
    <div className="content-inner">
      {/* Header + tabs */}
      <div className="section-head">
        <div>
          <div className="section-title">Leads</div>
          <div className="section-sub">{filtered.length} actief · {all.length} totaal</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => window.__openExport?.()}><Icon name="file" size={14} /> Export</button>
          <button className="btn btn-secondary"><Icon name="filter" size={14} /> Filters</button>
          <button className="btn btn-primary" onClick={() => window.__openManualQuote?.()}><Icon name="plus" size={14} /> Nieuwe offerte</button>
        </div>
      </div>

      {/* Filter row */}
      <div className="row between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs" style={{ borderBottom: 'none' }}>
          {[
            { k: 'all',       l: 'Alles',          c: all.length },
            { k: 'nieuw',     l: 'In gesprek',     c: all.filter(l => ['nieuw','in_gesprek'].includes(l.status)).length },
            { k: 'review',    l: 'Owner-review',   c: all.filter(l => ['info_compleet','wacht_bevestiging'].includes(l.status)).length },
            { k: 'verstuurd', l: 'Offerte uit',    c: all.filter(l => l.status === 'offerte_verstuurd').length },
            { k: 'gepland',   l: 'Ingepland',      c: all.filter(l => l.status === 'goedgekeurd').length },
            { k: 'archief',   l: 'Afgerond',       c: all.filter(l => ['afgewezen'].includes(l.status) || l.dashboard_status === 'afgehandeld').length },
          ].map(t => (
            <button key={t.k} className={`tab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
              {t.l} <span className="muted tabular" style={{ marginLeft: 4 }}>{t.c}</span>
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="topbar-search" style={{ margin: 0, maxWidth: 220 }}>
            <Icon name="search" size={14} />
            <input
              type="text"
              placeholder="Zoek naam, adres…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {empty ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty">
            <div className="empty-icon"><Icon name="inbox" size={28} /></div>
            <div className="empty-title">Geen leads om te tonen</div>
            <div className="empty-sub">Zodra een aanvraag binnenkomt verschijnt 'ie hier in de pipeline.</div>
          </div>
        </div>
      ) : view === 'pipeline' ? (
        <PipelineView leads={filtered} navigate={navigate} />
      ) : view === 'table' ? (
        <TableView leads={filtered} navigate={navigate} density={density} />
      ) : (
        <KanbanView leads={filtered} navigate={navigate} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pipeline view — horizontal track grouped by gesprek-fase
// ─────────────────────────────────────────────────────────────────
function PipelineView({ leads, navigate }) {
  const cols = PIPELINE_STAGES.map(stage => ({
    ...stage,
    items: leads.filter(stage.match),
  }));
  return (
    <div className="pipeline-track">
      {cols.map(col => (
        <div className="pipe-col" key={col.key}>
          <div className="pipe-col-head">
            <span className="pipe-col-title">{col.label}</span>
            <span className="pipe-col-count">{col.items.length}</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '4px 6px' }}>
              <Icon name="plus" size={13} />
            </button>
          </div>
          <div className="pipe-col-body">
            {col.items.map(l => <PipelineCard key={l.id} lead={l} onClick={() => navigate(`leads/${l.id}`)} />)}
            {col.items.length === 0 && (
              <div style={{
                padding: '24px 12px', textAlign: 'center', color: 'var(--fg-muted)',
                fontSize: 12, border: '1px dashed var(--border)', borderRadius: 10,
              }}>
                Leeg
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineCard({ lead, onClick }) {
  const dienstLabels = lead.sub.map(s => DIENST_LABELS[s]).filter(Boolean);
  return (
    <div className={`pipe-card ${lead.isNew ? 'plop flash' : ''}`} onClick={onClick}>
      <div className="pipe-card-head">
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <Avatar name={lead.naam} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="pipe-card-name truncate">{lead.naam}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">{lead.adres.split(',')[1]}</div>
          </div>
        </div>
        {lead.totaal_prijs ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }} className="tabular">{fmtEur(lead.totaal_prijs)}</div>
        ) : (
          <Pill tone="gray" sm>{lead.m2}m²</Pill>
        )}
      </div>

      <div className="pipe-card-meta">
        <span><Icon name="square" size={11} /> {lead.m2}m²</span>
        <span className="truncate">{dienstLabels[0]}</span>
        {lead.sub.length > 1 && <span style={{ color: 'var(--fg-muted)' }}>+{lead.sub.length - 1}</span>}
      </div>

      {lead.laatste_bericht && (
        <div className="pipe-card-bot">
          <span className="bot-dot" />
          <span style={{ flex: 1 }} className="truncate">{lead.laatste_bericht}</span>
        </div>
      )}

      <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {lead.tag.slice(0, 2).map((t, i) => <Pill key={i} tone="gray" sm>{t}</Pill>)}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)' }}>{lead.binnengekomen}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Table view
// ─────────────────────────────────────────────────────────────────
function TableView({ leads, navigate, density }) {
  const rowPad = density === 'compact' ? '6px 12px' : density === 'roomy' ? '16px 12px' : '12px 12px';
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Dienst</th>
              <th style={{ textAlign: 'right' }}>m²</th>
              <th>Status</th>
              <th>Gespreksfase</th>
              <th style={{ textAlign: 'right' }}>Offerte</th>
              <th>Laatste actie</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} onClick={() => navigate(`leads/${l.id}`)}>
                <td style={{ padding: rowPad }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={l.naam} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }} className="truncate">{l.naam}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">
                        {l.id} · {l.adres.split(',')[1]?.trim()}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: rowPad }}>
                  <div style={{ fontSize: 13 }}>
                    {l.sub.map(s => DIENST_LABELS[s]).join(' + ')}
                  </div>
                </td>
                <td style={{ padding: rowPad, textAlign: 'right' }} className="tabular">{l.m2}</td>
                <td style={{ padding: rowPad }}>
                  <Pill tone={STATUS[l.status].tone} dot>{STATUS[l.status].label}</Pill>
                </td>
                <td style={{ padding: rowPad }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{FASES[l.fase]?.label}</span>
                </td>
                <td style={{ padding: rowPad, textAlign: 'right' }} className="tabular">
                  {l.totaal_prijs
                    ? <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fmtEur(l.totaal_prijs)}</span>
                    : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                </td>
                <td style={{ padding: rowPad, fontSize: 12, color: 'var(--fg-muted)' }}>{l.binnengekomen}</td>
                <td style={{ padding: rowPad, textAlign: 'right' }}>
                  <Icon name="chevron-right" size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Kanban (status-grouped tiles, larger and richer)
// ─────────────────────────────────────────────────────────────────
function KanbanView({ leads, navigate }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 14,
    }}>
      {leads.map(l => (
        <KanbanCard key={l.id} lead={l} onClick={() => navigate(`leads/${l.id}`)} />
      ))}
    </div>
  );
}

function KanbanCard({ lead, onClick }) {
  return (
    <div className="card fade-up" onClick={onClick} style={{ cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(26,86,255,.05), rgba(0,207,255,.05))',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <Pill tone={STATUS[lead.status].tone} dot>{STATUS[lead.status].label}</Pill>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{lead.id}</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={lead.naam} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }} className="truncate">{lead.naam}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">{lead.adres}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div className="row" style={{ gap: 14, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
          <span><Icon name="square" size={12} /> {lead.m2}m²</span>
          <span><Icon name="image" size={12} /> {lead.fotos}</span>
          {lead.afstand_km && <span><Icon name="mappin" size={12} /> {lead.afstand_km}km</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.4, marginBottom: 10 }}>
          <span style={{ color: 'var(--fg-muted)' }}>Diensten:</span>{' '}
          {lead.sub.map(s => DIENST_LABELS[s]).join(' · ')}
        </div>
        <div className="row between">
          <span className="row" style={{ gap: 4, fontSize: 11, color: 'var(--fg-muted)' }}>
            <Icon name="whatsapp" size={12} /> {lead.binnengekomen}
          </span>
          {lead.totaal_prijs ? (
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }} className="tabular">{fmtEur(lead.totaal_prijs)}</span>
          ) : (
            <Pill tone="blue">In gesprek</Pill>
          )}
        </div>
      </div>
    </div>
  );
}

window.Leads = Leads;
