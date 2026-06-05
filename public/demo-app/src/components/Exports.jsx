// src/components/Exports.jsx — Export modal voor leads/offertes/reviews

const { useState: useStateEx, useEffect: useEffectEx } = React;

function ExportsModal({ onClose }) {
  const [type, setType] = useStateEx('leads');
  const [format, setFormat] = useStateEx('csv');
  const [period, setPeriod] = useStateEx('30d');
  const [columns, setColumns] = useStateEx({
    naam: true, telefoon: true, email: true, adres: true,
    m2: true, dienst: true, status: true, totaal: true,
    binnengekomen: true, fase: false, notitie: false, tag: false,
  });
  const [downloading, setDownloading] = useStateEx(false);

  useEffectEx(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => { setDownloading(false); onClose(); }, 1200);
  };

  const counts = { leads: 47, offertes: 28, reviews: 12, financien: 24 };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(10,14,20,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, maxHeight: '92vh',
        background: 'var(--bg)', borderRadius: 16,
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div className="row between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--gradient)', display: 'grid', placeItems: 'center', color: 'white' }}><Icon name="file" size={16} /></div>
            <div>
              <div style={{ font: '700 16px var(--font-heading)' }}>Exporteer data</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Download als CSV, PDF of plan een rapport in</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Wat wil je exporteren?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
            {[
              { k: 'leads',     l: 'Leads',     i: 'inbox', sub: `${counts.leads} stuks` },
              { k: 'offertes',  l: 'Offertes',  i: 'euro',  sub: `${counts.offertes} verstuurd` },
              { k: 'reviews',   l: 'Reviews',   i: 'star',  sub: `${counts.reviews} ontvangen` },
              { k: 'financien', l: 'Omzet',     i: 'chart', sub: `${counts.financien} regels` },
            ].map(t => {
              const a = type === t.k;
              return (
                <button key={t.k} onClick={() => setType(t.k)} style={{
                  padding: '14px 10px',
                  background: a ? 'rgba(26,86,255,.06)' : 'var(--surface)',
                  border: '1px solid', borderColor: a ? 'rgba(26,86,255,.5)' : 'var(--border)',
                  borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer',
                }}>
                  <Icon name={t.i} size={20} style={{ color: a ? 'var(--primary)' : 'var(--fg-soft)' }} />
                  <strong style={{ fontSize: 13, color: a ? 'var(--primary)' : 'var(--fg)' }}>{t.l}</strong>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.sub}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>Formaat</div>
              <div className="seg" style={{ width: '100%' }}>
                {['csv', 'xlsx', 'pdf'].map(f => (
                  <button key={f} className={`seg-btn ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)} style={{ flex: 1, justifyContent: 'center', textTransform: 'uppercase' }}>{f}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
                {format === 'csv'  && 'Voor Excel, Google Sheets, boekhoudpakketten'}
                {format === 'xlsx' && 'Met formattering, formules en kleuren'}
                {format === 'pdf'  && 'Voor printen of versturen — incl. logo'}
              </div>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>Periode</div>
              <div className="seg" style={{ width: '100%' }}>
                {[
                  { k: '7d',    l: '7d' },
                  { k: '30d',   l: '30d' },
                  { k: '90d',   l: '90d' },
                  { k: 'jaar',  l: 'YTD' },
                  { k: 'alles', l: 'Alles' },
                ].map(p => (
                  <button key={p.k} className={`seg-btn ${period === p.k ? 'active' : ''}`} onClick={() => setPeriod(p.k)} style={{ flex: 1, justifyContent: 'center' }}>{p.l}</button>
                ))}
              </div>
            </div>
          </div>

          {type === 'leads' && (
            <div style={{ marginBottom: 22 }}>
              <div className="field-label" style={{ marginBottom: 8 }}>Kolommen om te includeren</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 12, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                {Object.entries({
                  naam: 'Naam', telefoon: 'Telefoon', email: 'E-mail', adres: 'Adres',
                  m2: 'Oppervlakte', dienst: 'Diensten', status: 'Status', totaal: 'Offertebedrag',
                  binnengekomen: 'Datum binnen', fase: 'Gespreksfase', notitie: 'Notities', tag: 'Tags',
                }).map(([k, l]) => (
                  <label key={k} className="row" style={{ gap: 6, padding: '5px 8px', cursor: 'pointer', borderRadius: 6 }}>
                    <input type="checkbox" checked={columns[k]} onChange={e => setColumns(c => ({ ...c, [k]: e.target.checked }))} style={{ width: 13, height: 13 }} />
                    <span style={{ fontSize: 12 }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: 14, background: 'rgba(26,86,255,.05)', border: '1px solid rgba(26,86,255,.15)', borderRadius: 10, marginBottom: 18 }}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: 12 }}>Geplande exports</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5, marginBottom: 8 }}>
              Stuur deze export automatisch elke maand naar je boekhouder.
            </div>
            <button className="btn btn-secondary btn-sm">
              <Icon name="calendar" size={11} /> Maandelijks plannen →
            </button>
          </div>
        </div>

        <div className="row between" style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>{counts[type]} {type === 'financien' ? 'omzet-regels' : type}</strong> in {period === 'alles' ? 'alle data' : 'periode'} · {format.toUpperCase()}
          </div>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading} style={{ opacity: downloading ? 0.7 : 1 }}>
            {downloading ? 'Genereren...' : <><Icon name="file" size={13} /> Download {format.toUpperCase()}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ExportsModal = ExportsModal;
