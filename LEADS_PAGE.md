# Leads page — code & spec

Self-contained handoff voor **alleen de Leads-overzichtspagina** (route `/leads`) van het Frontlix-dashboard. Bevat: screenshot, design tokens, data-shapes, alle React-code en alle CSS-classes die de pagina gebruikt.

> Geef dit bestand aan Claude Code samen met de instructie: "Bouw de Leads-pagina na in onze codebase volgens deze spec. Gebruik onze bestaande UI-library/design-system; de inline-styles en classnames hier zijn alleen referentie."

![Leads pipeline view](./design_handoff_frontlix_dashboard/screenshots/03-leads-pipeline.png)

---

## 1. Wat de pagina doet

Eén pagina, **3 schakelbare views** (`view` prop, gestuurd door een segmented control elders in de topbar):

- **`pipeline`** (default) — 5 horizontale fase-kolommen, lead-cards per kolom. Visueel triage-overzicht.
- **`table`** — compacte tabel met sorteerbare kolommen.
- **`kanban`** — auto-fill grid met grote, rijke lead-cards.

Boven elke view:
- **Section header** met `Leads` titel + `X actief · Y totaal` subtitel + actie-knoppen (`Export`, `Filters`, `+ Nieuwe offerte`).
- **Filter-tabs** (Alles / In gesprek / Owner-review / Offerte uit / Ingepland / Afgerond) met count-badges.
- **Zoekveld** rechts naast de tabs (zoekt in naam + adres).

Een **lege staat** wordt getoond wanneer er geen leads zijn (via een `empty` prop).
Een **live-feed simulatie** voegt elke ~18 sec een nieuw "ghost-lead" toe (met `plop`/`flash` entry-animatie) — in productie vervangen door een websocket of polling.

Klik op een lead → `navigate('leads/' + lead.id)` (lead-detail pagina).

---

## 2. Design tokens (CSS custom properties)

```css
:root {
  /* Surfaces */
  --bg:           #FFFFFF;
  --surface:      #F9F9F9;
  --surface-2:    #F0F0F0;
  --card-bg:      #F5F7FA;

  /* Foreground */
  --fg:           #1A1A1A;
  --fg-muted:     #555555;
  --fg-soft:      #444444;

  /* Brand */
  --primary:      #1A56FF;
  --accent:       #00CFFF;
  --gradient:     linear-gradient(135deg, #1A56FF, #00CFFF);

  /* Borders */
  --border:        rgba(0, 0, 0, 0.10);
  --border-strong: rgba(0, 0, 0, 0.16);
  --card-hover-border: rgba(26, 86, 255, 0.30);
  --card-hover-bg:     rgba(26, 86, 255, 0.06);

  /* Semantic */
  --success:      #16A34A;
  --danger:       #DC2626;
  --whatsapp:     #25D366;

  /* Shadows */
  --shadow-card:     0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
  --shadow-primary:  0 4px 24px rgba(26,86,255,0.30);

  /* Type */
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
}
```

Inter weights: 400/500/600/700/800/900. Headings: 700-800 met letter-spacing -0.02em.

---

## 3. Data model

```ts
// Pipeline-fase enum (5 kolommen)
type StageKey = 'info' | 'review' | 'verstuurd' | 'gepland' | 'klaar';

// Lead-status enum (gebruikt voor status-pill en filtering)
type Status =
  | 'nieuw' | 'in_gesprek' | 'wacht_bevestiging'
  | 'info_compleet' | 'offerte_verstuurd'
  | 'goedgekeurd' | 'afgewezen' | 'handoff';

// Gespreksfase enum (waar de bot nu mee bezig is)
type Fase =
  | 'info_verzamelen' | 'offerte_besproken' | 'onderhandelen'
  | 'datum_kiezen' | 'afspraak_bevestigd' | 'afspraak_geannuleerd';

interface Lead {
  id: string;                 // 'L-2087'
  naam: string;               // 'Jeroen de Vries' of bedrijfsnaam
  bedrijf?: string | null;
  telefoon: string;
  email: string;
  adres: string;              // 'Lindenlaan 14, 2611 GH Delft'
  afstand_km: number;
  hoofd: string;              // bv. 'oprit_terras_terrein'
  sub: string[];              // diensten, bv. ['invegen', 'beschermlaag']
  m2: number;
  fotos: number;
  status: Status;
  fase: Fase;
  dashboard_status: 'open' | 'opgevolgd' | 'afgehandeld' | 'geen_interesse';
  totaal_prijs: number | null;
  binnengekomen: string;      // human-readable, '8 min geleden'
  laatste_bericht?: string;
  tag: string[];              // ['Particulier'] | ['Zakelijk', 'Repeat']
  bron: 'formulier' | 'whatsapp';
  afspraak_datum?: string;    // '2026-05-19'
  afspraak_starttijd?: string;// '09:00'
  isNew?: boolean;            // triggert plop+flash animatie
}
```

### Pipeline-staging logica

```js
const PIPELINE_STAGES = [
  { key: 'info',      label: 'In gesprek',     match: l => ['nieuw','in_gesprek'].includes(l.status) },
  { key: 'review',    label: 'Offerte review', match: l => ['info_compleet','wacht_bevestiging'].includes(l.status) },
  { key: 'verstuurd', label: 'Offerte uit',    match: l => l.status === 'offerte_verstuurd' },
  { key: 'gepland',   label: 'Ingepland',      match: l => l.status === 'goedgekeurd' && l.afspraak_datum },
  { key: 'klaar',     label: 'Afgerond',       match: l => l.dashboard_status === 'afgehandeld' },
];
```

### Status & fase label-maps

```js
const STATUS = {
  nieuw:              { label: 'Nieuw',              tone: 'blue'  },
  in_gesprek:         { label: 'In gesprek',         tone: 'blue'  },
  wacht_bevestiging:  { label: 'Wacht op bevestig.', tone: 'amber' },
  info_compleet:      { label: 'Klaar voor offerte', tone: 'amber' },
  offerte_verstuurd:  { label: 'Offerte verstuurd',  tone: 'amber' },
  goedgekeurd:        { label: 'Goedgekeurd',        tone: 'green' },
  afgewezen:          { label: 'Afgewezen',          tone: 'red'   },
  handoff:            { label: 'Handover',           tone: 'red'   },
};

const FASES = {
  info_verzamelen:      { label: 'Info verzamelen',   tone: 'blue'  },
  offerte_besproken:    { label: 'Offerte besproken', tone: 'amber' },
  onderhandelen:        { label: 'Onderhandelen',     tone: 'amber' },
  datum_kiezen:         { label: 'Datum kiezen',      tone: 'blue'  },
  afspraak_bevestigd:   { label: 'Afspraak vast',     tone: 'green' },
  afspraak_geannuleerd: { label: 'Geannuleerd',       tone: 'red'   },
};

const DIENST_LABELS = {
  invegen:                       'Voegen invegen',
  preventieve_onkruid:           'Preventieve onkruidbehandeling',
  preventieve_onkruidbeheersing: 'Preventieve onkruidbeheersing',
  beschermlaag:                  'Nieuwe beschermlaag',
  onderhoud:                     'Onderhoudsplan',
  plan_4_weken:                  'Onderhoud — elke 4 weken',
  plan_8_weken:                  'Onderhoud — elke 8 weken',
  plan_12_weken:                 'Onderhoud — elke 12 weken',
  plan_16_weken:                 'Onderhoud — elke 16 weken',
  reinigen:                      'Reiniging straatwerk',
};
```

---

## 4. Helpers / shared components

### Avatar (initials)

```jsx
function Avatar({ name, size = 'md', tint }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(s => s[0].toUpperCase()).join('');
  const t = tint || (1 + (name.charCodeAt(0) % 5));
  return <div className={`avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''} tint-${t}`}>{initials}</div>;
}
```

### Pill (status badge)

```jsx
function Pill({ tone = 'gray', children, dot = false, sm = false }) {
  return (
    <span className={`pill pill-${tone}`} style={sm ? { fontSize: 10, padding: '2px 7px' } : null}>
      {dot ? <span className="pill-dot" /> : null}
      {children}
    </span>
  );
}
```

Tones: `blue | green | amber | red | gray | wa` (=WhatsApp green).

### Icon (lucide-style)

Gebruik **`lucide-react`** in productie. De Leads-pagina gebruikt deze namen:
`plus`, `file`, `filter`, `search`, `inbox`, `square`, `image`, `mappin`, `whatsapp` (= `MessageCircle` of custom), `chevron-right`.

### Format helper

```js
const fmtEur = n => '€' + Math.round(n).toLocaleString('nl-NL');
```

---

## 5. Leads page — full React code

```jsx
function Leads({ view, density, navigate, empty }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [extraLeads, setExtraLeads] = useState([]);

  // Simulate a new lead plopping in every ~18s (replace with websocket in prod)
  useEffect(() => {
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

  const all = useMemo(() => empty ? [] : [...extraLeads, ...LEADS], [extraLeads, empty]);

  const filtered = useMemo(() => {
    let f = all;
    if (filter !== 'all') {
      f = f.filter(l => {
        if (filter === 'nieuw')     return ['nieuw', 'in_gesprek'].includes(l.status);
        if (filter === 'review')    return ['info_compleet', 'wacht_bevestiging'].includes(l.status);
        if (filter === 'verstuurd') return l.status === 'offerte_verstuurd';
        if (filter === 'gepland')   return l.status === 'goedgekeurd';
        if (filter === 'archief')   return ['afgewezen'].includes(l.status) || l.dashboard_status === 'afgehandeld';
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
      {/* Section header */}
      <div className="section-head">
        <div>
          <div className="section-title">Leads</div>
          <div className="section-sub">{filtered.length} actief · {all.length} totaal</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={onExport}><Icon name="file" size={14} /> Export</button>
          <button className="btn btn-secondary"><Icon name="filter" size={14} /> Filters</button>
          <button className="btn btn-primary" onClick={onNewQuote}><Icon name="plus" size={14} /> Nieuwe offerte</button>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="row between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs" style={{ borderBottom: 'none' }}>
          {[
            { k: 'all',       l: 'Alles',         c: all.length },
            { k: 'nieuw',     l: 'In gesprek',    c: all.filter(l => ['nieuw','in_gesprek'].includes(l.status)).length },
            { k: 'review',    l: 'Owner-review',  c: all.filter(l => ['info_compleet','wacht_bevestiging'].includes(l.status)).length },
            { k: 'verstuurd', l: 'Offerte uit',   c: all.filter(l => l.status === 'offerte_verstuurd').length },
            { k: 'gepland',   l: 'Ingepland',     c: all.filter(l => l.status === 'goedgekeurd').length },
            { k: 'archief',   l: 'Afgerond',      c: all.filter(l => ['afgewezen'].includes(l.status) || l.dashboard_status === 'afgehandeld').length },
          ].map(t => (
            <button key={t.k} className={`tab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
              {t.l} <span className="muted tabular" style={{ marginLeft: 4 }}>{t.c}</span>
            </button>
          ))}
        </div>

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

      {/* Body */}
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

// ─────────── Pipeline view ───────────
function PipelineView({ leads, navigate }) {
  const cols = PIPELINE_STAGES.map(stage => ({ ...stage, items: leads.filter(stage.match) }));
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
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">
              {lead.adres.split(',')[1]}
            </div>
          </div>
        </div>
        {lead.totaal_prijs ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }} className="tabular">
            {fmtEur(lead.totaal_prijs)}
          </div>
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

// ─────────── Table view ───────────
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
                  <div style={{ fontSize: 13 }}>{l.sub.map(s => DIENST_LABELS[s]).join(' + ')}</div>
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
                <td style={{ padding: rowPad, textAlign: 'right' }}><Icon name="chevron-right" size={14} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────── Kanban view ───────────
function KanbanView({ leads, navigate }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 14,
    }}>
      {leads.map(l => <KanbanCard key={l.id} lead={l} onClick={() => navigate(`leads/${l.id}`)} />)}
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
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }} className="tabular">
              {fmtEur(lead.totaal_prijs)}
            </span>
          ) : (
            <Pill tone="blue">In gesprek</Pill>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 6. CSS — alleen wat de Leads page nodig heeft

```css
/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s;
  cursor: pointer;
  border: none;
}
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary {
  background: var(--gradient);
  color: white;
  box-shadow: var(--shadow-primary);
}
.btn-primary:hover { opacity: 0.94; box-shadow: 0 6px 24px rgba(26,86,255,.45); }
.btn-secondary {
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
}
.btn-secondary:hover { border-color: var(--card-hover-border); background: var(--card-hover-bg); }
.btn-ghost { color: var(--fg-soft); background: none; }
.btn-ghost:hover { background: var(--card-hover-bg); color: var(--fg); }
.btn-sm { padding: 6px 10px; font-size: 12px; }

/* ── Card ── */
.card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
}

/* ── Pill ── */
.pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.pill-dot   { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pill-blue  { background: rgba(26,86,255,.10);  color: var(--primary); }
.pill-green { background: rgba(22,163,74,.12);  color: var(--success); }
.pill-amber { background: rgba(245,158,11,.14); color: #B45309; }
.pill-red   { background: rgba(220,38,38,.10);  color: var(--danger); }
.pill-gray  { background: var(--surface-2);     color: var(--fg-muted); }
.pill-wa    { background: rgba(37,211,102,.12); color: var(--whatsapp); }

/* ── Avatar (initials with color-coded tint) ── */
.avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: grid; place-items: center;
  font-weight: 700; font-size: 12px;
  flex-shrink: 0;
}
.avatar.sm { width: 24px; height: 24px; font-size: 10px; }
.avatar.lg { width: 44px; height: 44px; font-size: 16px; }
.avatar.tint-1 { background: rgba(26,86,255,.14);  color: var(--primary); }
.avatar.tint-2 { background: rgba(0,207,255,.18);  color: #0891B2; }
.avatar.tint-3 { background: rgba(22,163,74,.14);  color: var(--success); }
.avatar.tint-4 { background: rgba(245,158,11,.16); color: #B45309; }
.avatar.tint-5 { background: rgba(168,85,247,.16); color: #7E22CE; }

/* ── Section header ── */
.section-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.section-title { font: 800 22px/1.2 var(--font-heading); letter-spacing: -0.02em; }
.section-sub   { font-size: 13px; color: var(--fg-muted); margin-top: 4px; white-space: nowrap; }

/* ── Filter tabs ── */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); }
.tab {
  padding: 10px 14px;
  font-size: 13px;
  background: none;
  border: none;
  color: var(--fg-muted);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--fg); }
.tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

/* ── Search input (reused from topbar) ── */
.topbar-search {
  flex: 1; max-width: 360px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--fg-muted);
  transition: border-color 0.15s;
}
.topbar-search:focus-within { border-color: var(--primary); background: var(--bg); }
.topbar-search input {
  flex: 1; background: transparent; border: none; outline: none; font-size: 13px;
}

/* ── Empty state ── */
.empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon {
  width: 56px; height: 56px;
  display: grid; place-items: center;
  border-radius: 16px;
  background: var(--card-hover-bg);
  color: var(--primary);
}
.empty-title { font: 700 16px var(--font-heading); }
.empty-sub   { font-size: 13px; color: var(--fg-muted); max-width: 320px; line-height: 1.5; }

/* ── Pipeline view ── */
.pipeline-track {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 2px;
}
.pipe-col {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex; flex-direction: column;
  min-height: 400px;
  max-height: calc(100vh - 220px);
}
.pipe-col-head {
  padding: 12px 14px 10px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
}
.pipe-col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-soft); }
.pipe-col-count {
  font-size: 11px; font-weight: 700;
  padding: 2px 7px;
  background: var(--surface-2);
  color: var(--fg-muted);
  border-radius: 9999px;
}
.pipe-col-body { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }

/* ── Pipeline card ── */
.pipe-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.pipe-card:hover { border-color: var(--card-hover-border); box-shadow: var(--shadow-card); transform: translateY(-1px); }
.pipe-card-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
.pipe-card-name { font-weight: 600; font-size: 13px; line-height: 1.2; }
.pipe-card-meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px;
  color: var(--fg-soft);
  margin-top: 6px;
}
.pipe-card-meta > span { white-space: nowrap; min-width: 0; }
.pipe-card-meta > span.truncate { overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; }

.pipe-card-bot {
  margin-top: 8px;
  padding: 7px 9px;
  background: var(--card-hover-bg);
  border-radius: 8px;
  font-size: 11px;
  color: var(--fg-soft);
  display: flex; align-items: flex-start; gap: 6px;
}
.pipe-card-bot .bot-dot {
  flex-shrink: 0; width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--primary);
  margin-top: 4px;
}

/* ── Table view ── */
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl thead th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  padding: 12px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0;
  z-index: 1;
}
.tbl tbody td { padding: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tbl tbody tr { transition: background 0.12s; cursor: pointer; }
.tbl tbody tr:hover { background: var(--card-hover-bg); }
.tbl tbody tr:last-child td { border-bottom: none; }

/* ── Layout helpers ── */
.content-inner { padding: 28px; max-width: 1600px; margin: 0 auto; }
.row { display: flex; align-items: center; gap: 10px; }
.row.between { justify-content: space-between; }
.tabular { font-variant-numeric: tabular-nums; }
.muted   { color: var(--fg-muted); }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Entry animations ── */
@keyframes plopIn {
  from { transform: scale(0.94) translateY(-4px); opacity: 0; }
  to   { transform: scale(1) translateY(0);       opacity: 1; }
}
@keyframes flash {
  0%   { box-shadow: 0 0 0 0 rgba(26,86,255,0.4); }
  50%  { box-shadow: 0 0 0 6px rgba(26,86,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(26,86,255,0); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.plop    { animation: plopIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.flash   { animation: flash 1.6s ease-out 1; }
.fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
```

---

## 7. Interactie-details / acceptance criteria

- **Klik op lead-card/-row** → navigeer naar `/leads/:id`.
- **Klik op filter-tab** → filtert lijst, alle 3 de views respecteren de filter.
- **Zoekveld** → debounce niet strikt nodig; filtert live op `naam + adres` (case-insensitive, substring).
- **View-switcher** zit in de topbar (segmented control: Pipeline / Tabel / Kaarten); de Leads-component ontvangt `view` als prop.
- **Density** (compact/cozy/roomy) wijzigt alleen tabel-row-padding; pipeline en kanban negeren density.
- **Lege staat:** als `empty` prop true is OF na filter geen results → toon `<EmptyState>` (icon + title + sub).
- **Live-feed:** ghost-leads verschijnen elke ~18s met `.plop` + `.flash` animaties. Replace by websocket/SSE in productie.
- **Hover-states:**
  - `pipe-card` → border kleurt naar primary-tint, lichte translate-y(-1px), `--shadow-card`.
  - `tbl tbody tr` → background `--card-hover-bg`.
- **Status-pills** gebruiken `tone` van de status-map (blue/amber/green/red); pill heeft een dot-indicator wanneer `dot` prop.

---

## 8. Wat je in productie waarschijnlijk anders doet

- **Routing**: vervang `navigate('leads/' + id)` door je router (React Router `useNavigate`, Next `useRouter`, etc.).
- **Data**: vervang de hardcoded `LEADS` import door een React Query / SWR / RTK Query fetch.
- **Real-time updates**: vervang de `setInterval`-ghost-lead-simulatie door je echte realtime stack (Pusher / Ably / Supabase Realtime / WebSocket).
- **Icon-library**: gebruik `lucide-react` of een eigen kit i.p.v. de inline SVG-icons.
- **UI-library**: als jullie shadcn/Mantine/etc. hebben, vervang `.btn`, `.pill`, `.tabs`, `.card`, `.tbl` door die equivalenten — de visuele tokens (kleuren/spacing/radii) blijven gelden.
- **TypeScript**: typeer met de interface uit sectie 3 en de string-unions voor `Status`/`Fase`.
- **Toegankelijkheid**: voeg `aria-label` toe aan icon-only buttons, gebruik `<button>` (geen `<div onclick>`), zorg dat tabel-rows keyboard-navigeerbaar zijn (`tabIndex={0}` + `onKeyDown`).
- **Performance**: bij >200 leads in de tabel-view → virtualiseren met `@tanstack/react-virtual`.
