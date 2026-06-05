// src/screens/Reviews.jsx
// Review & NPS verzameling — voor klanttevredenheid na afgeronde klussen

const { useState: useStateRv } = React;

function Reviews({ navigate }) {
  const [filter, setFilter] = useStateRv('all');

  const reviews = [
    { id: 1, lead: 'L-2079', naam: 'Anna Smit',    plaats: 'Den Haag',   datum: '2 dagen geleden', score: 10, nps: 'promoter', text: 'Geweldig werk. Op tijd, schoon werk, perfecte communicatie via WhatsApp tijdens en na de klus. Aanrader!', published: true },
    { id: 2, lead: 'L-2082', naam: 'Sandra Janssen', plaats: 'Pijnacker',  datum: '1 week geleden', score: 9,  nps: 'promoter', text: 'Heel netjes gewerkt en eerlijk advies gekregen over de beschermlaag. Resultaat is super.', published: true },
    { id: 3, lead: 'L-2077', naam: 'Erik van der Velde', plaats: 'Rotterdam', datum: '2 weken geleden', score: 8, nps: 'passive',  text: 'Goed werk geleverd. Aankomsttijd was ietsje later dan afgesproken maar verder prima.', published: true },
    { id: 4, lead: 'L-2075', naam: 'Familie Kuiper', plaats: 'Delft',     datum: '3 weken geleden', score: 10, nps: 'promoter', text: 'Vakwerk! De terras ziet er weer als nieuw uit, dankzij de antraciet voegen prachtige uitstraling.', published: true },
    { id: 5, lead: 'L-2070', naam: 'Bert Koning',    plaats: 'Utrecht',    datum: '1 maand geleden', score: 6, nps: 'detractor', text: 'Werk goed gedaan maar prijs viel iets hoger uit dan in de offerte was aangegeven.', published: false, responded: false },
  ];

  // Pending = leads waarbij werk klaar maar nog geen review verzoek/ontvangen
  const pending = [
    { id: 'p1', lead: 'L-2083', naam: 'Thomas Wilms', plaats: 'Delft',  klusDatum: 'vrijdag 8 mei',    sent: false, days: 2 },
    { id: 'p2', lead: 'L-2069', naam: 'Petra de Boer', plaats: 'Gouda', klusDatum: 'dinsdag 28 april', sent: true, days: 8 },
  ];

  const stats = {
    nps: 67,                    // promoters % - detractors %
    totalReviews: 47,
    avgScore: 9.1,
    responseRate: 68,           // % of asked customers that responded
    promoters: 32,
    passives: 12,
    detractors: 3,
  };

  const list = filter === 'pending' ? pending : filter === 'detractor' ? reviews.filter(r => r.nps === 'detractor') : reviews;

  return (
    <div className="content-inner">
      <div className="section-head">
        <div>
          <div className="section-title">Reviews & klanttevredenheid</div>
          <div className="section-sub">NPS-score: <strong style={{ color: 'var(--success)' }}>+{stats.nps}</strong> · {stats.totalReviews} reviews · {stats.responseRate}% response rate</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary"><Icon name="file" size={13} /> Exporteer rapport</button>
          <button className="btn btn-primary"><Icon name="send" size={13} /> Stuur reviewverzoek</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="NPS-score"         value={stats.nps} prefix="+" delta="+8 pt"  trend={[42,48,52,58,60,63,67]} />
        <KpiCard label="Gemiddelde score"  value={stats.avgScore} suffix="/10" delta="+0.4" trend={[8.2,8.4,8.5,8.7,8.8,9.0,9.1]} />
        <KpiCard label="Response rate"     value={stats.responseRate} suffix="%" delta="+5 pt" trend={[55,58,60,62,64,66,68]} />
        <KpiCard label="Reviews dit jaar"  value={stats.totalReviews}            delta="+12" trend={[20,25,30,35,40,44,47]} />
      </div>

      {/* NPS breakdown bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">NPS-verdeling</div>
            <div className="card-sub">{stats.promoters + stats.passives + stats.detractors} respondenten</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{
            display: 'flex',
            height: 36,
            borderRadius: 9,
            overflow: 'hidden',
            marginBottom: 14,
          }}>
            <div style={{ flex: stats.promoters, background: 'linear-gradient(90deg, #16A34A, #22C55E)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
              {stats.promoters} promoters
            </div>
            <div style={{ flex: stats.passives, background: 'linear-gradient(90deg, #94A3B8, #CBD5E1)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
              {stats.passives}
            </div>
            <div style={{ flex: stats.detractors, background: 'linear-gradient(90deg, #DC2626, #EF4444)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
              {stats.detractors}
            </div>
          </div>
          <div className="row" style={{ gap: 24, fontSize: 12, color: 'var(--fg-muted)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#16A34A', verticalAlign: '-1px', marginRight: 6 }} /> Promoters (9-10): geven actief aanbevelingen</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#CBD5E1', verticalAlign: '-1px', marginRight: 6 }} /> Passives (7-8): tevreden maar niet enthousiast</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#DC2626', verticalAlign: '-1px', marginRight: 6 }} /> Detractors (0-6): risico op negatieve mond-tot-mond</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ borderBottom: 'none' }}>
          {[
            { k: 'all',       l: 'Alle reviews',  c: reviews.length },
            { k: 'pending',   l: 'In afwachting', c: pending.length },
            { k: 'detractor', l: 'Aandacht nodig', c: reviews.filter(r => r.nps === 'detractor').length },
          ].map(t => (
            <button key={t.k} className={`tab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
              {t.l} <span className="muted tabular" style={{ marginLeft: 4 }}>{t.c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filter === 'pending' ? (
        <div className="col" style={{ gap: 10 }}>
          {pending.map(p => (
            <PendingRow key={p.id} item={p} onOpen={() => navigate(`leads/${p.lead}`)} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {list.map(r => <ReviewCard key={r.id} review={r} navigate={navigate} />)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, navigate }) {
  const toneBg = review.nps === 'promoter' ? 'rgba(22,163,74,.10)' : review.nps === 'detractor' ? 'rgba(220,38,38,.10)' : 'var(--surface-2)';
  const toneFg = review.nps === 'promoter' ? 'var(--success)' : review.nps === 'detractor' ? 'var(--danger)' : 'var(--fg-muted)';
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 18 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 10, minWidth: 0 }}>
            <Avatar name={review.naam} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{review.naam}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{review.plaats} · {review.datum}</div>
            </div>
          </div>
          <div style={{
            padding: '6px 12px',
            background: toneBg,
            color: toneFg,
            borderRadius: 9999,
            display: 'flex', alignItems: 'center', gap: 4,
            fontWeight: 800,
            fontSize: 16,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            <Icon name="star" size={14} />
            {review.score}
          </div>
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.55,
          color: 'var(--fg-soft)',
          fontStyle: 'italic',
          marginBottom: 14,
          paddingLeft: 12,
          borderLeft: `3px solid ${toneFg}`,
        }}>
          "{review.text}"
        </div>
        <div className="row between">
          <div className="row" style={{ gap: 6 }}>
            {review.published && <Pill tone="green" sm>Gepubliceerd</Pill>}
            {!review.published && <Pill tone="amber" sm>Privé</Pill>}
            <Pill tone={review.nps === 'promoter' ? 'green' : review.nps === 'detractor' ? 'red' : 'gray'} sm>
              {review.nps === 'promoter' ? 'Promoter' : review.nps === 'detractor' ? 'Detractor' : 'Passive'}
            </Pill>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`leads/${review.lead}`)}>
            Open lead →
          </button>
        </div>
        {review.nps === 'detractor' && !review.responded && (
          <div style={{
            marginTop: 12,
            padding: 10,
            background: 'rgba(220,38,38,.05)',
            border: '1px solid rgba(220,38,38,.2)',
            borderRadius: 9,
            fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="flame" size={14} style={{ color: 'var(--danger)' }} />
            <span style={{ flex: 1, color: 'var(--fg-soft)' }}>Reageer binnen 24u om relatie te herstellen</span>
            <button className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: 11 }}>Reageer</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ item, onOpen }) {
  return (
    <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <Avatar name={item.naam} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.naam}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {item.plaats} · klus afgerond {item.klusDatum} ({item.days}d geleden)
        </div>
      </div>
      {item.sent ? (
        <Pill tone="amber"><Icon name="clock" size={11} /> Verzoek verstuurd · wacht op klant</Pill>
      ) : (
        <Pill tone="gray">Nog geen verzoek</Pill>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onOpen}>Lead →</button>
      {!item.sent && (
        <button className="btn btn-primary btn-sm">
          <Icon name="send" size={12} /> Stuur verzoek
        </button>
      )}
    </div>
  );
}

window.Reviews = Reviews;
