// src/screens/LeadDetail.jsx
// Lead detail — split view: customer/quote/photos (left) + WhatsApp conversation (right)

const { useState: useStateLDD, useEffect: useEffectLDD, useRef: useRefLDD, useMemo: useMemoLDD } = React;

function LeadDetail({ leadId, navigate }) {
  const lead = LEADS.find(l => l.id === leadId) || LEADS[0];
  const [tab, setTab] = useStateLDD('info');
  const [note, setNote] = useStateLDD('');
  const [archived, setArchived] = useStateLDD(false);
  const [botPaused, setBotPaused] = useStateLDD(false);
  const [toast, setToast] = useStateLDD(null);
  const [sendOpen, setSendOpen] = useStateLDD(false);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="content-inner" style={{ maxWidth: '100%', padding: 'var(--content-pad, 28px)' }}>
      {/* Breadcrumb / back */}
      <div className="row" style={{ marginBottom: 12, gap: 8, fontSize: 13, color: 'var(--fg-muted)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('leads')}>
          ← Terug naar leads
        </button>
        {archived && (
          <span className="row" style={{ marginLeft: 'auto', gap: 6 }}>
            <Pill tone="gray"><Icon name="archive" size={11} /> Gearchiveerd</Pill>
            <button className="btn btn-ghost btn-sm" onClick={() => { setArchived(false); showToast('Lead teruggezet uit archief'); }}>
              Herstellen
            </button>
          </span>
        )}
      </div>

      {/* Lead header */}
      <div className="card" style={{ marginBottom: 16, overflow: 'hidden', opacity: archived ? 0.7 : 1, transition: 'opacity 0.25s' }}>
        <div style={{
          padding: '18px 24px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 18,
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(26,86,255,.04), rgba(0,207,255,.04))',
        }}>
          <Avatar name={lead.naam} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 10, marginBottom: 4 }}>
              <h2 style={{ font: '800 22px var(--font-heading)', letterSpacing: '-0.02em' }}>{lead.naam}</h2>
              <Pill tone={STATUS[lead.status].tone} dot>{STATUS[lead.status].label}</Pill>
              {lead.tag.includes('⚠️ Korting') && <Pill tone="amber">⚠️ Korting gevraagd</Pill>}
              {lead.tag.includes('📍 Buiten radius') && <Pill tone="red">Buiten radius</Pill>}
            </div>
            <div className="row" style={{ gap: 18, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 5, whiteSpace: 'nowrap' }}><Icon name="mappin" size={13} /> {lead.adres}</span>
              <span className="row" style={{ gap: 5, whiteSpace: 'nowrap' }}><Icon name="phone" size={13} /> {lead.telefoon}</span>
              <span className="row" style={{ gap: 5, whiteSpace: 'nowrap' }}><Icon name="mail" size={13} /> {lead.email}</span>
              <span className="row" style={{ gap: 5, whiteSpace: 'nowrap' }}><Icon name="clock" size={13} /> {lead.binnengekomen}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => { setTab('notes'); showToast('Klaar om een notitie toe te voegen', 'info'); }}>
              <Icon name="sticky" size={13} /> Notitie
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (archived) { setArchived(false); showToast('Hersteld'); }
                else { setArchived(true); showToast('Verplaatst naar archief'); }
              }}
            >
              <Icon name="archive" size={13} /> {archived ? 'Herstellen' : 'Archief'}
            </button>
            <button className="btn btn-primary" onClick={() => setSendOpen(true)}>
              <Icon name="send" size={13} /> Offerte versturen
            </button>
          </div>
        </div>

        {/* Bot status strip */}
        <div className="row" style={{
          padding: '10px 24px',
          borderTop: '1px solid var(--border)',
          gap: 14,
          fontSize: 12,
          color: 'var(--fg-muted)',
          background: botPaused ? 'rgba(245,158,11,.05)' : 'transparent',
        }}>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="bot" size={14} style={{ color: botPaused ? '#B45309' : 'var(--primary)' }} />
            <strong style={{ color: 'var(--fg)' }}>Surface:</strong>
            {botPaused ? <span style={{ color: '#B45309' }}>⏸️ Gepauzeerd — handmatige modus</span> : <span>{lead.bot_volgende_actie}</span>}
          </span>
          <span>·</span>
          <span>Fase: <strong style={{ color: 'var(--fg)' }}>{FASES[lead.fase]?.label}</strong></span>
          <span>·</span>
          <span>Lead-ID: <span className="mono">{lead.id}</span></span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setBotPaused(p => !p); showToast(botPaused ? 'Surface bot weer actief' : 'Surface bot gepauzeerd — je antwoordt nu zelf', 'info'); }}
          >
            <Icon name="bot" size={13} /> {botPaused ? 'Bot activeren' : 'Bot pauzeren'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24, right: 24,
          padding: '12px 18px',
          background: toast.tone === 'success' ? 'var(--success)' : 'var(--primary)',
          color: 'white',
          borderRadius: 11,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name={toast.tone === 'success' ? 'check' : 'sparkle'} size={15} />
          {toast.msg}
        </div>
      )}

      {/* Send confirm */}
      {sendOpen && (
        <SendConfirmModal lead={lead} botPaused={botPaused} onClose={() => setSendOpen(false)} onConfirm={(channel) => {
          setSendOpen(false);
          showToast(`Offerte verstuurd via ${channel}`, 'success');
        }} />
      )}

      {/* Split: left (info/quote/photos/notes) + right (conversation) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(380px, 420px)',
        gap: 16,
        alignItems: 'start',
      }}>
        <div className="col">
          <div className="card">
            <div className="tabs" style={{ padding: '0 16px' }}>
              {[
                { k: 'info',   l: 'Info',     i: 'inbox'  },
                { k: 'quote',  l: 'Offerte',  i: 'euro'   },
                { k: 'fotos',  l: `Foto's (${lead.fotos})`,   i: 'image'  },
                { k: 'tijdlijn', l: 'Tijdlijn', i: 'clock' },
                { k: 'notes',  l: 'Notities', i: 'sticky' },
              ].map(t => (
                <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
                  <Icon name={t.i} size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                  {t.l}
                </button>
              ))}
            </div>

            {tab === 'info' && <InfoTab lead={lead} />}
            {tab === 'quote' && <QuoteTab lead={lead} />}
            {tab === 'fotos' && <FotosTab lead={lead} />}
            {tab === 'tijdlijn' && <TimelineTab lead={lead} />}
            {tab === 'notes' && <NotesTab lead={lead} note={note} setNote={setNote} />}
          </div>
        </div>

        {/* Right: WhatsApp conversation */}
        <WhatsAppPanel lead={lead} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function InfoTab({ lead }) {
  const [editMode, setEditMode] = useStateLDD(false);
  const [draft, setDraft] = useStateLDD(() => ({
    naam: lead.naam,
    bedrijf: lead.bedrijf || '',
    telefoon: lead.telefoon,
    email: lead.email,
    adres: lead.adres,
    afstand_km: lead.afstand_km,
    sub: [...lead.sub],
    m2: lead.m2,
    voegzand_type: lead.voegzand_type || 'normaal',
    zand_kleur: lead.zand_kleur || 'naturel',
    groene_aanslag: lead.groene_aanslag,
    korstmos: lead.korstmos,
    planten: lead.planten || 'nee',
    planten_afschermen: lead.planten_afschermen || 'nee',
  }));
  const [savedToast, setSavedToast] = useStateLDD(false);

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const save = () => {
    setEditMode(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  const cancel = () => {
    setDraft({
      naam: lead.naam, bedrijf: lead.bedrijf || '', telefoon: lead.telefoon, email: lead.email,
      adres: lead.adres, afstand_km: lead.afstand_km, sub: [...lead.sub], m2: lead.m2,
      voegzand_type: lead.voegzand_type || 'normaal', zand_kleur: lead.zand_kleur || 'naturel',
      groene_aanslag: lead.groene_aanslag, korstmos: lead.korstmos,
      planten: lead.planten || 'nee', planten_afschermen: lead.planten_afschermen || 'nee',
    });
    setEditMode(false);
  };

  const Row = ({ label, value, hint, field, type = 'text', options, onChange }) => (
    <div style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: editMode ? 'center' : 'baseline' }}>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ textAlign: editMode ? 'left' : 'right', minWidth: 0 }}>
        {editMode && field ? (
          options
            ? <select className="select" value={draft[field]} onChange={e => setField(field, e.target.value)} style={{ width: '100%' }}>
                {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            : <input
                className="input"
                type={type}
                value={draft[field]}
                onChange={e => setField(field, type === 'number' ? +e.target.value : e.target.value)}
                style={{ width: '100%', textAlign: type === 'number' ? 'right' : 'left' }}
              />
        ) : (
          <React.Fragment>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{hint}</div>}
          </React.Fragment>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Edit toolbar */}
      <div className="row between" style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: editMode ? 'rgba(26,86,255,.04)' : 'transparent',
      }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name={editMode ? 'edit' : 'inbox'} size={14} style={{ color: editMode ? 'var(--primary)' : 'var(--fg-muted)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: editMode ? 'var(--primary)' : 'var(--fg)' }}>
            {editMode ? 'Lead bewerken — wijzigingen zijn nog niet opgeslagen' : 'Lead-gegevens'}
          </span>
        </div>
        {editMode ? (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Annuleren</button>
            <button className="btn btn-primary btn-sm" onClick={save}>
              <Icon name="check" size={12} /> Wijzigingen opslaan
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
            <Icon name="edit" size={12} /> Bewerken
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Klant
          </div>
          <Row label="Naam"     field="naam"     value={draft.naam} />
          <Row label="Bedrijf"  field="bedrijf"  value={draft.bedrijf || '—'} />
          <Row label="Telefoon" field="telefoon" value={draft.telefoon} />
          <Row label="E-mail"   field="email"    value={draft.email} type="email" />
          <Row label="Adres"    field="adres"    value={draft.adres} />
          <Row
            label="Afstand"
            field="afstand_km"
            type="number"
            value={`${draft.afstand_km} km`}
            hint={draft.afstand_km > 50 ? 'Reiskosten van toepassing' : 'Binnen gratis radius'}
          />
          <Row label="Bron" value={lead.bron === 'formulier' ? 'Website-formulier' : 'WhatsApp direct'} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Werk
          </div>
          <Row label="Hoofdcategorie" value={lead.hoofd === 'oprit_terras_terrein' ? 'Oprit / terras' : 'Onkruidbeheersing zakelijk'} />
          <Row label="Diensten" value={draft.sub.map(s => DIENST_LABELS[s]).join(' + ')} />
          <Row label="Oppervlakte" field="m2" type="number" value={`${draft.m2} m²`} />
          <Row
            label="Voegzand"
            field="voegzand_type"
            value={draft.voegzand_type === 'normaal' ? 'Normaal' : draft.voegzand_type === 'onkruidwerend' ? 'Onkruidwerend' : 'Beide'}
            options={[{ v: 'normaal', l: 'Normaal' }, { v: 'onkruidwerend', l: 'Onkruidwerend' }, { v: 'beide', l: 'Beide' }]}
          />
          <Row
            label="Kleur"
            field="zand_kleur"
            value={draft.zand_kleur === 'naturel' ? 'Naturel' : 'Antraciet'}
            options={[{ v: 'naturel', l: 'Naturel' }, { v: 'antraciet', l: 'Antraciet' }]}
          />
          <Row
            label="Groene aanslag"
            field="groene_aanslag"
            value={draft.groene_aanslag === 'ja' ? 'Ja' : 'Nee'}
            options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
          />
          <Row
            label="Korstmos"
            field="korstmos"
            value={draft.korstmos === 'ja' ? 'Ja (+10% toeslag)' : 'Nee'}
            options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja (+10% toeslag)' }]}
          />
          <Row
            label="Planten naast"
            field="planten"
            value={draft.planten === 'ja' ? `Ja${draft.planten_afschermen === 'ja' ? ' — afschermen' : ''}` : 'Nee'}
            options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
          />
        </div>
      </div>

      {savedToast && (
        <div style={{
          position: 'fixed',
          bottom: 24, right: 24,
          padding: '12px 18px',
          background: 'var(--success)',
          color: 'white',
          borderRadius: 11,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name="check" size={15} /> Wijzigingen opgeslagen
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function QuoteTab({ lead }) {
  const [discount, setDiscount] = useStateLDD(0);
  const [extra, setExtra] = useStateLDD([]);
  const [pdfOpen, setPdfOpen] = useStateLDD(false);
  const [historyOpen, setHistoryOpen] = useStateLDD(false);

  // Mock offerte history — sent versions
  const history = useMemoLDD(() => {
    const items = [];
    if (lead.offerte_verstuurd_op) {
      items.push({
        v: 'v1',
        bedrag: lead.totaal_prijs,
        verstuurd: lead.offerte_verstuurd_op,
        status: lead.status === 'goedgekeurd' ? 'Akkoord' : lead.status === 'afgewezen' ? 'Afgewezen' : lead.status === 'wacht_bevestiging' ? 'Bevestigd' : 'Verstuurd',
        tone:   lead.status === 'goedgekeurd' ? 'green' : lead.status === 'afgewezen' ? 'red' : 'amber',
        kanaal: 'WhatsApp + PDF',
        wijziging: null,
      });
    }
    if (lead.id === 'L-2083') {
      items.unshift({
        v: 'v2', bedrag: 375, verstuurd: 'vandaag 11:24', status: 'Verstuurd', tone: 'amber',
        kanaal: 'WhatsApp', wijziging: '5% korting — kennismakingskorting',
      });
    }
    if (lead.id === 'L-2086') {
      items.unshift({
        v: 'v2', bedrag: 3950, verstuurd: 'gister 14:18', status: 'In review klant', tone: 'amber',
        kanaal: 'WhatsApp', wijziging: '€230 reductie na onderhandeling',
      });
    }
    return items;
  }, [lead]);

  const rules = useMemoLDD(() => {
    const r = [];
    if (lead.sub.includes('invegen')) {
      r.push({ desc: 'Reiniging straatwerk',          aantal: lead.m2, eenheid: 'm²',  prijs: 3.95, totaal: lead.m2 * 3.95 });
      const arbeidPm2 = lead.voegzand_type === 'onkruidwerend' ? 1.60 : 0.90;
      r.push({ desc: `Invegen — arbeid (${lead.voegzand_type})`, aantal: lead.m2, eenheid: 'm²', prijs: arbeidPm2, totaal: lead.m2 * arbeidPm2 });
      const zakken = Math.ceil(lead.m2 / 5);
      const zakPrice = lead.voegzand_type === 'onkruidwerend' ? 20.90 : 2.90;
      r.push({ desc: `Voegzand ${lead.voegzand_type} (${lead.zand_kleur})`, aantal: zakken, eenheid: 'zak', prijs: zakPrice, totaal: zakken * zakPrice });
    }
    if (lead.sub.includes('beschermlaag')) {
      r.push({ desc: 'Beschermlaag impregneren', aantal: lead.m2, eenheid: 'm²', prijs: 1.60, totaal: lead.m2 * 1.60 });
    }
    if (lead.planten_afschermen === 'ja') {
      r.push({ desc: 'Plantenafscherming folie', aantal: 2, eenheid: 'rol', prijs: 8.50, totaal: 17.00 });
    }
    if (lead.afstand_km && lead.afstand_km > 50) {
      r.push({ desc: `Reiskosten (${lead.afstand_km - 50} km × €0,23)`, aantal: lead.afstand_km - 50, eenheid: 'km', prijs: 0.23, totaal: (lead.afstand_km - 50) * 0.23 });
    }
    return r;
  }, [lead]);

  const subtotal = rules.reduce((s, r) => s + r.totaal, 0);
  const korstmosToeslag = lead.korstmos === 'ja' ? subtotal * 0.10 : 0;
  const subtotal2 = subtotal + korstmosToeslag;
  const kortingBedrag = subtotal2 * (discount / 100);
  const total = subtotal2 - kortingBedrag;
  const btw = total * 0.21;

  return (
    <div style={{ padding: 20 }}>
      {/* Offerte-historie */}
      {history.length > 0 && (
        <div style={{
          marginBottom: 18,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              width: '100%',
              background: 'transparent',
              borderBottom: historyOpen ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Icon name="clock" size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Offerte-historie</span>
            <Pill tone="gray" sm>{history.length} {history.length === 1 ? 'versie' : 'versies'}</Pill>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)' }}>
              Laatste: {history[0].verstuurd}
            </span>
            <Icon name="chevron-down" size={14} style={{ color: 'var(--fg-muted)', transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {historyOpen && (
            <div style={{ padding: '4px 0' }}>
              {history.map((h, i) => (
                <div key={i} className="row" style={{
                  padding: '12px 16px',
                  gap: 14,
                  borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: h.tone === 'green' ? 'rgba(22,163,74,.12)' : h.tone === 'red' ? 'rgba(220,38,38,.10)' : 'rgba(245,158,11,.14)',
                    color: h.tone === 'green' ? 'var(--success)' : h.tone === 'red' ? 'var(--danger)' : '#B45309',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 800,
                    flexShrink: 0,
                  }}>{h.v}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row between" style={{ marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }} className="tabular">{fmtEur(h.bedrag)} <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 500 }}>excl. BTW</span></strong>
                      <Pill tone={h.tone} sm dot>{h.status}</Pill>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      Verstuurd {h.verstuurd} · {h.kanaal}
                    </div>
                    {h.wijziging && (
                      <div style={{
                        marginTop: 6,
                        padding: '6px 10px',
                        background: 'rgba(26,86,255,.05)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: 'var(--fg-soft)',
                        borderLeft: '2px solid var(--primary)',
                      }}>
                        <strong style={{ color: 'var(--primary)' }}>Wijziging:</strong> {h.wijziging}
                      </div>
                    )}
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
                      <Icon name="eye" size={11} /> PDF
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
                      <Icon name="edit" size={11} /> Dupliceer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {history.length > 0 ? `Nieuwe versie (v${history.length + 1}) — concept` : 'Offerte-regels'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Auto-berekend op basis van lead-data · pas aan waar nodig</div>
        </div>
        <button className="btn btn-secondary btn-sm"><Icon name="plus" size={12} /> Regel toevoegen</button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '4px 0', border: '1px solid var(--border)' }}>
        {rules.map((r, i) => (
          <div key={i} className="row" style={{
            padding: '10px 14px',
            gap: 12,
            borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }} className="tabular">
                {r.aantal} {r.eenheid} × {fmtEurDec(r.prijs)}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }} className="tabular">{fmtEurDec(r.totaal)}</div>
            <button className="btn btn-ghost btn-sm" style={{ padding: 4 }}><Icon name="edit" size={13} /></button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label">Korting</label>
            <div className="row" style={{ gap: 8 }}>
              <input type="range" min="0" max="20" value={discount} onChange={e => setDiscount(+e.target.value)} style={{ flex: 1 }} />
              <span className="tabular" style={{ width: 50, textAlign: 'right', fontWeight: 600 }}>{discount}%</span>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Omschrijving korting</label>
            <input className="input" placeholder="Bijv. Kennismakingskorting" />
          </div>
        </div>

        <div style={{ minWidth: 280 }}>
          <div className="row between" style={{ padding: '6px 0' }}>
            <span className="muted" style={{ fontSize: 13 }}>Subtotaal</span>
            <span className="tabular" style={{ fontSize: 13 }}>{fmtEurDec(subtotal)}</span>
          </div>
          {korstmosToeslag > 0 && (
            <div className="row between" style={{ padding: '6px 0' }}>
              <span className="muted" style={{ fontSize: 13 }}>Korstmos toeslag (10%)</span>
              <span className="tabular" style={{ fontSize: 13 }}>{fmtEurDec(korstmosToeslag)}</span>
            </div>
          )}
          {kortingBedrag > 0 && (
            <div className="row between" style={{ padding: '6px 0', color: 'var(--success)' }}>
              <span style={{ fontSize: 13 }}>Korting ({discount}%)</span>
              <span className="tabular" style={{ fontSize: 13 }}>– {fmtEurDec(kortingBedrag)}</span>
            </div>
          )}
          <div className="row between" style={{ padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Excl. BTW</span>
            <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{fmtEurDec(total)}</span>
          </div>
          <div className="row between" style={{ padding: '6px 0' }}>
            <span className="muted" style={{ fontSize: 12 }}>BTW 21%</span>
            <span className="tabular" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fmtEurDec(btw)}</span>
          </div>
          <div className="row between" style={{
            padding: '14px 16px',
            background: 'var(--gradient)',
            color: 'white',
            borderRadius: 12,
            marginTop: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Totaal incl. BTW</span>
            <span className="tabular" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtEurDec(total + btw)}</span>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPdfOpen(true)}><Icon name="eye" size={13} /> Preview PDF</button>
            <button className="btn btn-primary" style={{ flex: 1 }}><Icon name="whatsapp" size={13} /> Versturen</button>
          </div>
        </div>
      </div>

      {pdfOpen && (
        <PDFPreview
          lead={lead}
          rules={rules}
          totals={{ subtotal, korstmosToeslag, kortingBedrag, discount, total, btw }}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function FotosTab({ lead }) {
  const [lightboxIdx, setLightboxIdx] = useStateLDD(null);
  const [showAnnotations, setShowAnnotations] = useStateLDD(true);

  // Make some photo placeholders with subtle blue-gradient pattern as if they were tile/cobble photos
  const colors = [
    ['#8B8680', '#5C5852'],
    ['#A39A8E', '#6B6358'],
    ['#7A7468', '#4A4538'],
    ['#9B9387', '#5F5950'],
    ['#888378', '#52504A'],
    ['#A8A095', '#6B6259'],
    ['#7E7A70', '#4D4940'],
    ['#9A9388', '#5F5A50'],
  ];

  // AI analysis per photo (mock)
  const photoMeta = [
    { label: 'Oprit — overzicht',  m2: '~ 95 m²',  annotations: [{ x: 30, y: 45, w: 28, h: 18, label: 'Groene aanslag (65%)', tone: '#16A34A' }, { x: 65, y: 60, w: 20, h: 15, label: 'Open voeg', tone: '#F59E0B' }] },
    { label: 'Detail voegen',       m2: 'close-up', annotations: [{ x: 20, y: 30, w: 50, h: 35, label: 'Voegen uitgespoeld', tone: '#F59E0B' }] },
    { label: 'Terras achterzijde',  m2: '~ 50 m²',  annotations: [{ x: 50, y: 20, w: 35, h: 25, label: 'Hortensia — afschermen', tone: '#1A56FF' }] },
    { label: 'Aansluiting tuin',    m2: 'detail',   annotations: [{ x: 10, y: 40, w: 45, h: 30, label: 'Lavendel rand', tone: '#1A56FF' }] },
    { label: 'Aansluiting straat',  m2: 'detail',   annotations: [] },
    { label: 'Detail klinker',      m2: 'close-up', annotations: [{ x: 25, y: 25, w: 60, h: 50, label: 'Halfsteens verband naturel grijs', tone: '#16A34A' }] },
    { label: 'Aansluiting gevel',   m2: 'detail',   annotations: [] },
    { label: 'Garage-rand',         m2: 'detail',   annotations: [{ x: 30, y: 50, w: 40, h: 25, label: 'Trottoirband — voorzichtig', tone: '#F59E0B' }] },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Foto's van klant ({lead.fotos})</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Geüpload via WhatsApp · Surface heeft elke foto AI-geanalyseerd</div>
        </div>
        <Pill tone="green"><Icon name="check" size={11} /> Recent gevalideerd</Pill>
      </div>

      <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {Array.from({ length: lead.fotos }).map((_, i) => {
          const meta = photoMeta[i % photoMeta.length];
          return (
            <div
              key={i}
              className="photo"
              onClick={() => setLightboxIdx(i)}
              style={{
                background: `linear-gradient(135deg, ${colors[i % colors.length][0]}, ${colors[i % colors.length][1]})`,
                aspectRatio: '4/3',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
                `,
                backgroundSize: i % 2 === 0 ? '14px 14px' : '20px 20px',
                borderRadius: 8,
              }} />
              {meta.annotations.length > 0 && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px',
                  background: 'rgba(0,0,0,0.65)',
                  borderRadius: 9999,
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 600,
                  backdropFilter: 'blur(8px)',
                }}>
                  <Icon name="sparkle" size={9} />
                  {meta.annotations.length}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '14px 8px 8px',
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
                fontSize: 10, color: 'white', fontWeight: 600,
                borderRadius: '0 0 8px 8px',
              }}>
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 16,
        padding: 14,
        background: 'rgba(26,86,255,.05)',
        border: '1px solid rgba(26,86,255,.2)',
        borderRadius: 10,
      }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
          <strong style={{ fontSize: 13 }}>Surface AI-analyse</strong>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 'auto' }}>klik op een foto voor details</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          Klinkers in halfsteens verband, naturel grijs. <strong>Groene aanslag</strong> zichtbaar in 60-70% van het oppervlak.
          Voegen zijn open en deels uitgespoeld — herinvegen aanbevolen. Geen korstmos waargenomen.
          Hortensia + lavendel direct naast bestrating (zijde noord) → folie nodig.
        </div>
      </div>

      {lightboxIdx !== null && (
        <PhotoLightbox
          lead={lead}
          idx={lightboxIdx}
          total={lead.fotos}
          colors={colors}
          photoMeta={photoMeta}
          showAnnotations={showAnnotations}
          onToggleAnnotations={() => setShowAnnotations(s => !s)}
          onPrev={() => setLightboxIdx(i => (i - 1 + lead.fotos) % lead.fotos)}
          onNext={() => setLightboxIdx(i => (i + 1) % lead.fotos)}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function PhotoLightbox({ lead, idx, total, colors, photoMeta, showAnnotations, onToggleAnnotations, onPrev, onNext, onClose }) {
  useEffectLDD(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = o; document.removeEventListener('keydown', onKey); };
  }, [onClose, onPrev, onNext]);

  const c = colors[idx % colors.length];
  const meta = photoMeta[idx % photoMeta.length];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(0,0,0,0.92)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 320px',
      gap: 0,
    }}>
      {/* Image area */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        overflow: 'hidden',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, left: 18,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            display: 'grid', placeItems: 'center',
            border: 'none',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Icon name="x" size={18} />
        </button>

        {/* Toggle annotations */}
        <button
          onClick={onToggleAnnotations}
          style={{
            position: 'absolute', top: 18, right: 18,
            padding: '8px 14px',
            background: showAnnotations ? 'var(--gradient)' : 'rgba(255,255,255,0.08)',
            color: 'white',
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none',
            borderRadius: 9,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Icon name="sparkle" size={13} />
          {showAnnotations ? 'AI overlay aan' : 'AI overlay uit'}
        </button>

        {/* Prev */}
        {idx > 0 && (
          <button
            onClick={onPrev}
            style={{
              position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)',
              color: 'white',
              display: 'grid', placeItems: 'center',
              border: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Icon name="chevron-right" size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* Next */}
        {idx < total - 1 && (
          <button
            onClick={onNext}
            style={{
              position: 'absolute', right: 18 + 320, top: '50%', transform: 'translateY(-50%)',
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)',
              color: 'white',
              display: 'grid', placeItems: 'center',
              border: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Icon name="chevron-right" size={20} />
          </button>
        )}

        {/* Image */}
        <div style={{
          position: 'relative',
          maxWidth: '100%', maxHeight: '85vh',
          aspectRatio: '4/3',
          width: 'auto',
          height: '100%',
          background: `linear-gradient(135deg, ${c[0]}, ${c[1]})`,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Cobble pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.10) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.10) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }} />

          {/* AI Annotations */}
          {showAnnotations && meta.annotations.map((a, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${a.x}%`, top: `${a.y}%`,
              width: `${a.w}%`, height: `${a.h}%`,
              border: `2px solid ${a.tone}`,
              borderRadius: 6,
              background: `${a.tone}1A`,
              animation: 'fadeUp 0.4s ease both',
            }}>
              <div style={{
                position: 'absolute',
                top: -28, left: -2,
                padding: '3px 9px',
                background: a.tone,
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}>{a.label}</div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{
          position: 'absolute', bottom: 22, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 6,
        }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === idx ? 'white' : 'rgba(255,255,255,0.3)',
              transition: 'background 0.15s',
            }} />
          ))}
        </div>
      </div>

      {/* Side panel */}
      <div style={{
        background: '#0F131A',
        color: 'white',
        padding: 24,
        overflowY: 'auto',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
          Foto {idx + 1} van {total}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{meta.label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
          {meta.m2} · IMG_482{idx + 1}.jpg
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
          AI-detecties ({meta.annotations.length})
        </div>
        {meta.annotations.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', padding: '12px 0' }}>
            Geen specifieke detecties op deze foto.
          </div>
        ) : (
          <div className="col" style={{ gap: 8, marginBottom: 24 }}>
            {meta.annotations.map((a, i) => (
              <div key={i} style={{
                padding: 12,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 9,
                borderLeft: `3px solid ${a.tone}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }} className="tabular">
                  Regio {a.x}%, {a.y}% · {a.w}×{a.h}%
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
          Acties
        </div>
        <div className="col" style={{ gap: 6 }}>
          {[
            { i: 'file',  l: 'Foto downloaden' },
            { i: 'send',  l: 'Doorsturen naar uitvoerder' },
            { i: 'sticky',l: 'Annotatie toevoegen' },
            { i: 'x',     l: 'Foto weigeren', danger: true },
          ].map((a, i) => (
            <button key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9,
              color: a.danger ? '#FCA5A5' : 'white',
              fontSize: 12,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}>
              <Icon name={a.i} size={13} />
              {a.l}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Sneltoetsen</strong><br />
          ← / → navigeren · Esc om te sluiten
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function TimelineTab({ lead }) {
  const [filter, setFilter] = useStateLDD('all');
  const events = [
    { time: 'Vandaag 10:08', actor: 'Klant',   kind: 'media',     icon: 'image',    color: 'var(--primary)', text: 'Stuurde 4 foto\'s via WhatsApp', meta: '2.1 MB · IMG_4821.jpg, IMG_4822.jpg, +2' },
    { time: 'Vandaag 10:08', actor: 'Bot',     kind: 'analysis',  icon: 'sparkle',  color: 'var(--primary)', text: 'Foto-analyse afgerond', meta: 'Groene aanslag 65% · Korstmos 0% · Voegen open · Hortensia 40cm naast' },
    { time: 'Vandaag 09:42', actor: 'Klant',   kind: 'message',   icon: 'whatsapp', color: 'var(--whatsapp)', text: '"Antraciet zou mooi staan denk ik."', meta: null },
    { time: 'Vandaag 09:42', actor: 'Bot',     kind: 'field',     icon: 'edit',     color: 'var(--primary)', text: 'Veld bijgewerkt: zand_kleur',  meta: '∅ → antraciet (via klantbericht)' },
    { time: 'Vandaag 09:28', actor: 'Bot',     kind: 'field',     icon: 'edit',     color: 'var(--primary)', text: 'Veld bijgewerkt: planten_afschermen', meta: 'nee → ja (extra 2 rollen folie)' },
    { time: 'Vandaag 09:21', actor: 'Bot',     kind: 'service',   icon: 'plus',     color: 'var(--success)', text: 'Sub-dienst toegevoegd: Beschermlaag', meta: '€1,60/m² × 145 = €232,00' },
    { time: 'Vandaag 09:16', actor: 'Klant',   kind: 'message',   icon: 'whatsapp', color: 'var(--whatsapp)', text: '"Ja klopt. Het is de hele oprit + een stukje terras."', meta: null },
    { time: 'Vandaag 09:14', actor: 'Bot',     kind: 'start',     icon: 'bot',      color: 'var(--primary)', text: 'Surface startte gesprek', meta: 'Meta-template "lead_intake_v2" · taal: nl' },
    { time: 'Vandaag 09:13', actor: 'Systeem', kind: 'system',    icon: 'sparkle',  color: 'var(--primary)', text: 'Lead binnengekomen', meta: 'Bron: website-formulier · HMAC verified · IP 84.12.x.x' },
    { time: 'Vandaag 09:13', actor: 'Systeem', kind: 'system',    icon: 'check',    color: 'var(--success)', text: 'Akkoord algemene voorwaarden', meta: 'Aangevinkt op formulier · juridisch bewijs bewaard' },
  ];

  const filters = [
    { k: 'all',     l: 'Alles',         c: events.length },
    { k: 'message', l: 'Berichten',     c: events.filter(e => e.kind === 'message').length },
    { k: 'field',   l: 'Veld-wijzigingen', c: events.filter(e => e.kind === 'field').length },
    { k: 'system',  l: 'Systeem',       c: events.filter(e => e.kind === 'system').length },
  ];

  const filtered = filter === 'all' ? events : events.filter(e => e.kind === filter);

  return (
    <div style={{ padding: 20 }}>
      <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Audit-log</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            Alle owner-, bot- en klant-acties chronologisch · juridisch bewijsmateriaal
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {filters.map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`seg-btn ${filter === f.k ? 'active' : ''}`}
              style={{ padding: '5px 10px', fontSize: 11, background: filter === f.k ? 'var(--card-hover-bg)' : 'transparent', color: filter === f.k ? 'var(--primary)' : 'var(--fg-muted)', borderRadius: 8 }}
            >
              {f.l} <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>{f.c}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="col" style={{ gap: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 14, top: 14, bottom: 14,
          width: 2, background: 'var(--border)',
        }} />
        {filtered.map((e, i) => (
          <div key={i} className="row" style={{ gap: 14, padding: '10px 0', alignItems: 'flex-start' }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: '50%',
              background: 'var(--bg)',
              border: '2px solid var(--border)',
              display: 'grid', placeItems: 'center',
              color: e.color,
              flexShrink: 0,
              zIndex: 1,
            }}>
              <Icon name={e.icon} size={14} />
            </div>
            <div style={{ flex: 1, padding: '2px 0', minWidth: 0 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{e.text}</span>
                <Pill tone={e.actor === 'Bot' ? 'blue' : e.actor === 'Klant' ? 'wa' : 'gray'} sm>{e.actor}</Pill>
              </div>
              {e.meta && (
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, lineHeight: 1.5, fontFamily: e.kind === 'field' || e.kind === 'system' ? 'ui-monospace, monospace' : 'inherit' }}>
                  {e.meta}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>{e.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: 12,
        background: 'rgba(22,163,74,0.06)',
        borderRadius: 10,
        border: '1px solid rgba(22,163,74,0.2)',
        fontSize: 12,
        color: 'var(--fg-soft)',
      }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="check" size={14} style={{ color: 'var(--success)' }} />
          <strong style={{ color: 'var(--fg)' }}>Compleet auditspoor</strong>
        </div>
        <div style={{ marginTop: 6, lineHeight: 1.5 }}>
          Onveranderbaar · bewaard tot 7 jaar na akkoord · exporteerbaar als JSON voor geschillen.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function NotesTab({ lead, note, setNote }) {
  const [notes, setNotes] = useStateLDD([
    { id: 1, author: 'Christiaan', avatar: 'CT', tint: 1, time: '8 min geleden', text: 'Klant lijkt enthousiast — antwoordt snel. Wel even letten op de planten, hortensia is gevoelig.' },
  ]);
  const submit = () => {
    if (!note.trim()) return;
    setNotes([{ id: Date.now(), author: 'Jij', avatar: 'GT', tint: 2, time: 'net', text: note }, ...notes]);
    setNote('');
  };
  return (
    <div style={{ padding: 20 }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
        <Avatar name="Georg Tromp" tint={2} />
        <div style={{ flex: 1 }}>
          <textarea
            className="textarea"
            placeholder="Voeg een interne notitie toe — alleen jij en je team zien dit"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="row" style={{ gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm"><Icon name="paperclip" size={13} /></button>
            <button className="btn btn-primary btn-sm" onClick={submit}>Toevoegen</button>
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        {notes.map(n => (
          <div key={n.id} className="row" style={{
            gap: 10, alignItems: 'flex-start',
            padding: 12,
            background: 'var(--surface)',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            <Avatar name={n.author} tint={n.tint} size="sm" />
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{n.author}</strong>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{n.time}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.5 }}>{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// WhatsApp transcript panel
// ─────────────────────────────────────────────────────────────────
function WhatsAppPanel({ lead }) {
  const [showTyping, setShowTyping] = useStateLDD(false);
  const [messages, setMessages] = useStateLDD(() => {
    return lead.id === 'L-2087' ? CONVERSATION_2087.slice(0, -1) : buildGenericConv(lead);
  });
  const endRef = useRefLDD(null);

  // Animate typing indicator for L-2087
  useEffectLDD(() => {
    if (lead.id !== 'L-2087') return;
    const t1 = setTimeout(() => setShowTyping(true), 1500);
    const t2 = setTimeout(() => {
      setShowTyping(false);
      setMessages(m => [...m, { from: 'bot', time: '10:10', text: 'Helder Jeroen, dank! Ik analyseer je foto\'s nu — eventjes 30 seconden. Wil je dat we ook de plantenafscherming meenemen in de offerte?' }]);
    }, 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lead.id]);

  useEffectLDD(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [messages, showTyping]);

  return (
    <div className="card" style={{
      height: 'calc(100vh - 220px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'sticky',
      top: 16,
    }}>
      {/* WA header */}
      <div className="wa-header">
        <Avatar name={lead.naam} size="sm" tint={2} />
        <div className="wa-header-info">
          <div className="wa-header-name">{lead.naam}</div>
          <div className="wa-header-status">
            {showTyping ? <em>aan het typen…</em> : 'online · via Surface bot'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ color: 'white' }}><Icon name="phone" size={15} /></button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'white' }}><Icon name="bot" size={15} /></button>
      </div>

      {/* Transcript */}
      <div className="wa-frame" ref={endRef}>
        {messages.map((m, i) => {
          if (m.day) return <div className="wa-day" key={i}>{m.day}</div>;
          if (m.typing) return <div className="wa-typing" key={i}><span /><span /><span /></div>;
          return (
            <div key={i} className={`wa-msg ${m.from}`}>
              {m.isPhoto && (
                <div style={{
                  width: 180, height: 130, borderRadius: 6,
                  background: 'linear-gradient(135deg, #888378, #52504A)',
                  marginBottom: 6,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                    borderRadius: 6,
                  }} />
                </div>
              )}
              {m.text}
              <span className="wa-msg-time">
                {m.time}
                {m.from === 'bot' && <span className="check2">✓✓</span>}
              </span>
            </div>
          );
        })}
        {showTyping && <div className="wa-typing"><span /><span /><span /></div>}
      </div>

      {/* Bot-take-over bar */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(26,86,255,.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Icon name="bot" size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 12, color: 'var(--fg-soft)', flex: 1 }}>
          <strong>Surface antwoordt automatisch.</strong> Wil je zelf overnemen?
        </span>
        <button className="btn btn-secondary btn-sm">Pauzeren</button>
      </div>

      {/* Compose */}
      <div className="wa-input">
        <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Icon name="paperclip" size={16} /></button>
        <div className="wa-input-box">Typ een bericht (overschrijft bot)…</div>
        <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Icon name="send" size={16} /></button>
      </div>
    </div>
  );
}

function buildGenericConv(lead) {
  return [
    { day: 'Eerder deze week' },
    { from: 'bot', time: '14:22', text: `Hoi ${lead.naam.split(' ')[0]}, bedankt voor je aanvraag! Ik help je in een paar berichten aan een offerte. Klopt het dat het om ${lead.m2}m² gaat?` },
    { from: 'customer', time: '14:35', text: lead.laatste_bericht || 'Ja klopt!' },
    { day: 'Vandaag' },
    { from: 'bot', time: '09:00', text: 'Goedemorgen! Ik wilde je even informeren over de status.' },
    { from: 'customer', time: '10:42', text: lead.laatste_bericht },
  ];
}

// ─────────────────────────────────────────────────────────────────
// Send confirm modal — quick channel picker for "Offerte versturen"
// ─────────────────────────────────────────────────────────────────
function SendConfirmModal({ lead, botPaused, onClose, onConfirm }) {
  const [channel, setChannel] = useStateLDD('wa');
  const [sending, setSending] = useStateLDD(false);

  useEffectLDD(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, []);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      const label = channel === 'wa' ? 'WhatsApp' : channel === 'mail' ? 'e-mail' : 'WhatsApp + e-mail';
      onConfirm(label);
    }, 700);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(10,14,20,0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg)',
        borderRadius: 16,
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        <div className="row between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ font: '700 16px var(--font-heading)', letterSpacing: '-0.01em' }}>Offerte versturen</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>naar {lead.naam}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Lead summary */}
          <div style={{
            padding: 14,
            background: 'rgba(26,86,255,.04)',
            border: '1px solid rgba(26,86,255,.15)',
            borderRadius: 10,
            marginBottom: 18,
          }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Totaal incl. BTW</span>
              <strong style={{ fontSize: 18, color: 'var(--primary)' }} className="tabular">
                {lead.totaal_prijs ? fmtEur(lead.totaal_prijs * 1.21) : '€ —'}
              </strong>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {lead.sub.map(s => DIENST_LABELS[s]).join(' + ')} · {lead.m2}m²
            </div>
          </div>

          {/* Channel picker */}
          <div className="field-label" style={{ marginBottom: 8 }}>Versturen via</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            {[
              { k: 'wa',   l: 'WhatsApp', i: 'whatsapp', sub: '+ PDF' },
              { k: 'mail', l: 'E-mail',   i: 'mail',     sub: 'met PDF' },
              { k: 'both', l: 'Beide',    i: 'send',     sub: 'WA + mail' },
            ].map(c => {
              const active = channel === c.k;
              return (
                <button
                  key={c.k}
                  onClick={() => setChannel(c.k)}
                  style={{
                    padding: '12px 10px',
                    background: active ? 'rgba(26,86,255,.08)' : 'var(--surface)',
                    border: '1px solid',
                    borderColor: active ? 'rgba(26,86,255,.5)' : 'var(--border)',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={c.i} size={18} style={{ color: active ? 'var(--primary)' : 'var(--fg-soft)' }} />
                  <strong style={{ fontSize: 12, color: active ? 'var(--primary)' : 'var(--fg)' }}>{c.l}</strong>
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{c.sub}</span>
                </button>
              );
            })}
          </div>

          {botPaused && (
            <div style={{
              padding: 10,
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 9,
              fontSize: 12,
              color: '#B45309',
              marginBottom: 14,
            }}>
              ⚠️ Surface is gepauzeerd voor deze lead. Wil je 'm na verzenden weer activeren?
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending}
            style={{ width: '100%', padding: '12px 16px', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}
          >
            {sending
              ? 'Versturen...'
              : <><Icon name="send" size={14} /> Offerte nu versturen</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

window.LeadDetail = LeadDetail;
