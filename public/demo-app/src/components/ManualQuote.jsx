// src/components/ManualQuote.jsx
// Manual offerte builder — modal where owner builds a quote from scratch
// Wizard-style: klant → dienst → regels → preview → versturen

const { useState: useStateMQ, useMemo: useMemoMQ, useEffect: useEffectMQ } = React;

function ManualQuoteModal({ onClose }) {
  const [step, setStep] = useStateMQ(1);
  const [data, setData] = useStateMQ({
    // klant
    naam: '',
    bedrijf: '',
    telefoon: '',
    email: '',
    straat: '',
    huisnummer: '',
    postcode: '',
    plaats: '',
    // factuur (default: zelfde als werkadres)
    factuur_zelfde: true,
    factuur_straat: '',
    factuur_huisnummer: '',
    factuur_postcode: '',
    factuur_plaats: '',
    // werk
    hoofdcategorie: 'oprit_terras_terrein',  // 'oprit_terras_terrein' | 'onkruidbeheersing'
    sub: ['invegen'],
    onderhoud_weken: 8,                       // 4 | 8 | 12 | 16 (alleen relevant als sub bevat 'onderhoud')
    m2: 100,
    // voegzand — multi-select met aanpasbare zakken + prijzen
    voegzand_normaal_actief: true,
    voegzand_normaal_zakken: 20,           // override default; auto-suggest = ceil(m2/5)
    voegzand_normaal_prijs: 2.90,
    voegzand_onkruidwerend_actief: false,
    voegzand_onkruidwerend_zakken: 0,
    voegzand_onkruidwerend_prijs: 20.90,
    // kleur — multi-select
    kleur_naturel: true,
    kleur_antraciet: false,
    // overige flags
    groene_aanslag: 'nee',
    korstmos: 'nee',
    afstand_km: 25,
    // plantenafscherming
    planten_afschermen_actief: false,
    planten_afschermen_rollen: 2,
    planten_afschermen_prijs: 8.50,
    // offerte
    extra_arbeid_minuten: 0,
    extra_arbeid_personen: 0,
    extra_arbeid_omschrijving: '',
    korting_percentage: 0,
    korting_omschrijving: '',
    // verzending
    notitie: '',
  });

  useEffectMQ(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, []);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  // Auto-suggest zakken based on m² (1 zak per 5m²)
  useEffectMQ(() => {
    const suggested = Math.ceil((+data.m2 || 0) / 5);
    if (data.voegzand_normaal_actief && !data.voegzand_onkruidwerend_actief) {
      set('voegzand_normaal_zakken', suggested);
      set('voegzand_onkruidwerend_zakken', 0);
    } else if (!data.voegzand_normaal_actief && data.voegzand_onkruidwerend_actief) {
      set('voegzand_normaal_zakken', 0);
      set('voegzand_onkruidwerend_zakken', suggested);
    } else if (data.voegzand_normaal_actief && data.voegzand_onkruidwerend_actief) {
      const half = Math.ceil(suggested / 2);
      set('voegzand_normaal_zakken', half);
      set('voegzand_onkruidwerend_zakken', suggested - half);
    }
  }, [data.m2, data.voegzand_normaal_actief, data.voegzand_onkruidwerend_actief]);

  // ── Compute rules ─────────────────────────────────────────────
  const rules = useMemoMQ(() => {
    const r = [];
    const m2 = +data.m2 || 0;

    const kleuren = [];
    if (data.kleur_naturel)   kleuren.push('naturel');
    if (data.kleur_antraciet) kleuren.push('antraciet');
    const kleurLabel = kleuren.length === 0 ? 'kleur n.t.b.' : kleuren.join(' + ');

    if (data.sub.includes('invegen')) {
      r.push({ desc: 'Reiniging straatwerk', aantal: m2, eenheid: 'm²', prijs: 3.95, totaal: m2 * 3.95 });

      // Arbeid invegen — per type
      if (data.voegzand_normaal_actief) {
        const ratio = data.voegzand_onkruidwerend_actief
          ? (+data.voegzand_normaal_zakken / Math.max(1, (+data.voegzand_normaal_zakken + +data.voegzand_onkruidwerend_zakken)))
          : 1;
        const am2 = m2 * ratio;
        if (am2 > 0) r.push({ desc: 'Invegen — arbeid normaal voegzand', aantal: am2.toFixed(0), eenheid: 'm²', prijs: 0.90, totaal: am2 * 0.90 });
      }
      if (data.voegzand_onkruidwerend_actief) {
        const ratio = data.voegzand_normaal_actief
          ? (+data.voegzand_onkruidwerend_zakken / Math.max(1, (+data.voegzand_normaal_zakken + +data.voegzand_onkruidwerend_zakken)))
          : 1;
        const am2 = m2 * ratio;
        if (am2 > 0) r.push({ desc: 'Invegen — arbeid onkruidwerend voegzand', aantal: am2.toFixed(0), eenheid: 'm²', prijs: 1.60, totaal: am2 * 1.60 });
      }

      // Voegzand zakken
      if (data.voegzand_normaal_actief && +data.voegzand_normaal_zakken > 0) {
        const zakken = +data.voegzand_normaal_zakken;
        const prijs = +data.voegzand_normaal_prijs;
        r.push({ desc: `Voegzand normaal (${kleurLabel})`, aantal: zakken, eenheid: 'zak', prijs, totaal: zakken * prijs });
      }
      if (data.voegzand_onkruidwerend_actief && +data.voegzand_onkruidwerend_zakken > 0) {
        const zakken = +data.voegzand_onkruidwerend_zakken;
        const prijs = +data.voegzand_onkruidwerend_prijs;
        r.push({ desc: `Voegzand onkruidwerend (${kleurLabel})`, aantal: zakken, eenheid: 'zak', prijs, totaal: zakken * prijs });
      }
    }
    if (data.sub.includes('preventieve_onkruid')) {
      r.push({ desc: 'Preventieve onkruidbehandeling', aantal: m2, eenheid: 'm²', prijs: 1.10, totaal: m2 * 1.10 });
    }
    if (data.sub.includes('beschermlaag')) {
      r.push({ desc: 'Nieuwe beschermlaag toepassen', aantal: m2, eenheid: 'm²', prijs: 1.60, totaal: m2 * 1.60 });
    }
    if (data.sub.includes('onderhoud')) {
      const w = +data.onderhoud_weken || 8;
      // Pricing: 4w=€1,25, 8w=€1,75, 12w=€2,90, 16w=€4,50
      const plPrice = w === 4 ? 1.25 : w === 8 ? 1.75 : w === 12 ? 2.90 : 4.50;
      r.push({
        desc: `Onderhoudsplan — elke ${w} weken`,
        aantal: m2,
        eenheid: 'm²/beurt',
        prijs: plPrice,
        totaal: m2 * plPrice,
      });
    }
    if (data.planten_afschermen_actief && +data.planten_afschermen_rollen > 0) {
      const rollen = +data.planten_afschermen_rollen;
      const prijs = +data.planten_afschermen_prijs;
      r.push({ desc: 'Plantenafscherming folie', aantal: rollen, eenheid: 'rol', prijs, totaal: rollen * prijs });
    }
    if (+data.extra_arbeid_minuten > 0 && +data.extra_arbeid_personen > 0) {
      const totaal = +data.extra_arbeid_minuten * +data.extra_arbeid_personen * 1.20;
      r.push({
        desc: `Extra arbeid${data.extra_arbeid_omschrijving ? ` — ${data.extra_arbeid_omschrijving}` : ''} (${data.extra_arbeid_minuten}min × ${data.extra_arbeid_personen} pers.)`,
        aantal: +data.extra_arbeid_minuten,
        eenheid: 'min',
        prijs: 1.20,
        totaal,
      });
    }
    if (+data.afstand_km > 50) {
      r.push({ desc: `Reiskosten (${+data.afstand_km - 50} km × €0,23)`, aantal: +data.afstand_km - 50, eenheid: 'km', prijs: 0.23, totaal: (+data.afstand_km - 50) * 0.23 });
    }
    return r;
  }, [data]);

  const totals = useMemoMQ(() => {
    const subtotal = rules.reduce((s, r) => s + r.totaal, 0);
    const korstmosToeslag = data.korstmos === 'ja' ? subtotal * 0.10 : 0;
    const subtotal2 = subtotal + korstmosToeslag;
    const kortingBedrag = subtotal2 * (+data.korting_percentage / 100);
    const total = subtotal2 - kortingBedrag;
    const btw = total * 0.21;
    return { subtotal, korstmosToeslag, kortingBedrag, discount: +data.korting_percentage, total, btw };
  }, [rules, data]);

  const valid = {
    1: data.naam.trim() && data.telefoon.trim() && (data.email.trim() || data.telefoon.trim()),
    2: data.sub.length > 0 && +data.m2 > 0,
    3: rules.length > 0 && totals.total > 0,
  };
  const canNext = valid[step];

  const steps = [
    { n: 1, l: 'Klant',     i: 'inbox'  },
    { n: 2, l: 'Werk',      i: 'square' },
    { n: 3, l: 'Offerte',   i: 'euro'   },
    { n: 4, l: 'Versturen', i: 'send'   },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(10, 14, 20, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          background: 'var(--bg)',
          borderRadius: 16,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header + steps */}
        <div style={{ padding: '18px 24px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'var(--gradient)', color: 'white',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="edit" size={16} />
              </div>
              <div>
                <div style={{ font: '700 16px var(--font-heading)', letterSpacing: '-0.01em' }}>
                  Handmatige offerte opstellen
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Bv. voor een klant die je telefonisch hebt gesproken — Surface stuurt 'm daarna direct via WhatsApp of mail
                </div>
              </div>
            </div>
            <button onClick={onClose} className="icon-btn"><Icon name="x" size={16} /></button>
          </div>

          {/* Stepper */}
          <div className="row" style={{ gap: 0, marginBottom: 0 }}>
            {steps.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <React.Fragment key={s.n}>
                  <button
                    onClick={() => (done || s.n === step) && setStep(s.n)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 14px',
                      borderBottom: '2px solid',
                      borderColor: active ? 'var(--primary)' : 'transparent',
                      color: active ? 'var(--primary)' : done ? 'var(--fg-soft)' : 'var(--fg-muted)',
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      cursor: done || active ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: active ? 'var(--gradient)' : done ? 'rgba(22,163,74,.15)' : 'var(--surface-2)',
                      color: active ? 'white' : done ? 'var(--success)' : 'var(--fg-muted)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {done ? <Icon name="check" size={12} stroke={3} /> : s.n}
                    </div>
                    {s.l}
                  </button>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 0, color: 'var(--fg-muted)', alignSelf: 'center', padding: '0 4px' }}>
                      <Icon name="chevron-right" size={14} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {step === 1 && <StepKlant data={data} set={set} />}
          {step === 2 && <StepWerk  data={data} set={set} />}
          {step === 3 && <StepOfferte data={data} set={set} rules={rules} totals={totals} />}
          {step === 4 && <StepVersturen data={data} set={set} rules={rules} totals={totals} />}
        </div>

        {/* Footer */}
        <div className="row between" style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuleren</button>
          <div className="row" style={{ gap: 8 }}>
            {step >= 3 && (
              <button
                className="btn btn-secondary"
                onClick={() => alert('PDF zou nu gedownload worden (offerte-' + (data.naam || 'concept').toLowerCase().replace(/\s+/g, '-') + '.pdf)')}
              >
                <Icon name="file" size={13} /> Download PDF
              </button>
            )}
            {step > 1 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                ← Vorige
              </button>
            )}
            {step < 4 && (
              <button
                className="btn btn-primary"
                disabled={!canNext}
                style={{ opacity: canNext ? 1 : 0.5, cursor: canNext ? 'pointer' : 'not-allowed' }}
                onClick={() => canNext && setStep(s => s + 1)}
              >
                Volgende <Icon name="arrow-right" size={13} />
              </button>
            )}
            {step === 4 && (
              <button className="btn btn-primary" onClick={onClose}>
                <Icon name="whatsapp" size={13} /> Offerte versturen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STEP 1: Klant ─────────────────────────────────────────────────
function StepKlant({ data, set }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Klantgegevens</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          Telefoon is verplicht (om de offerte via WhatsApp te versturen). E-mail mag erbij voor de PDF.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Naam *</label>
          <input className="input" value={data.naam} onChange={e => set('naam', e.target.value)} placeholder="Bv. Jan de Jong" />
        </div>
        <div className="field">
          <label className="field-label">Bedrijf (optioneel)</label>
          <input className="input" value={data.bedrijf || ''} onChange={e => set('bedrijf', e.target.value)} placeholder="Bv. VVE Schoonhof" />
        </div>
        <div className="field">
          <label className="field-label">Telefoon *</label>
          <input className="input" value={data.telefoon} onChange={e => set('telefoon', e.target.value)} placeholder="06 - 12 34 56 78" />
        </div>
        <div className="field">
          <label className="field-label">E-mail</label>
          <input className="input" value={data.email} onChange={e => set('email', e.target.value)} placeholder="jan@voorbeeld.nl" />
        </div>
      </div>

      {/* Werk-adres */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Werk-adres
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label className="field-label">Straat</label>
            <input className="input" value={data.straat} onChange={e => set('straat', e.target.value)} placeholder="Bv. Beeklaan" />
          </div>
          <div className="field">
            <label className="field-label">Huisnummer</label>
            <input className="input" value={data.huisnummer} onChange={e => set('huisnummer', e.target.value)} placeholder="14" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 12 }}>
          <div className="field">
            <label className="field-label">Postcode</label>
            <input className="input" value={data.postcode} onChange={e => set('postcode', e.target.value)} placeholder="2611 GH" />
          </div>
          <div className="field">
            <label className="field-label">Plaats</label>
            <input className="input" value={data.plaats} onChange={e => set('plaats', e.target.value)} placeholder="Delft" />
          </div>
          <div className="field">
            <label className="field-label">Afstand (km)</label>
            <input className="input tabular" type="number" value={data.afstand_km} onChange={e => set('afstand_km', e.target.value)} style={{ textAlign: 'right' }} />
          </div>
        </div>
      </div>

      {/* Factuur-adres */}
      <div>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Factuur-adres
          </div>
        </div>
        <button
          onClick={() => set('factuur_zelfde', !data.factuur_zelfde)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            background: data.factuur_zelfde ? 'rgba(26,86,255,.05)' : 'var(--surface)',
            border: '1px solid',
            borderColor: data.factuur_zelfde ? 'rgba(26,86,255,.3)' : 'var(--border)',
            borderRadius: 10,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            marginBottom: data.factuur_zelfde ? 0 : 12,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: data.factuur_zelfde ? 'var(--gradient)' : 'var(--bg)',
            border: '1px solid',
            borderColor: data.factuur_zelfde ? 'transparent' : 'var(--border)',
            display: 'grid', placeItems: 'center',
            color: 'white',
            flexShrink: 0,
          }}>
            {data.factuur_zelfde && <Icon name="check" size={12} stroke={3} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: data.factuur_zelfde ? 'var(--primary)' : 'var(--fg)' }}>
              Factuur-adres is gelijk aan werk-adres
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {data.factuur_zelfde
                ? 'Geen apart factuur-adres nodig'
                : 'Vink uit om een afwijkend factuur-adres in te vullen'}
            </div>
          </div>
        </button>

        {!data.factuur_zelfde && (
          <div style={{
            padding: 14,
            background: 'var(--surface)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            display: 'grid',
            gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Straat</label>
                <input className="input" value={data.factuur_straat} onChange={e => set('factuur_straat', e.target.value)} placeholder="Bv. Postbusstraat" />
              </div>
              <div className="field">
                <label className="field-label">Huisnummer</label>
                <input className="input" value={data.factuur_huisnummer} onChange={e => set('factuur_huisnummer', e.target.value)} placeholder="42" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Postcode</label>
                <input className="input" value={data.factuur_postcode} onChange={e => set('factuur_postcode', e.target.value)} placeholder="2611 GH" />
              </div>
              <div className="field">
                <label className="field-label">Plaats</label>
                <input className="input" value={data.factuur_plaats} onChange={e => set('factuur_plaats', e.target.value)} placeholder="Delft" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: 12,
        background: 'rgba(26,86,255,.05)',
        borderRadius: 10,
        fontSize: 12,
        color: 'var(--fg-soft)',
        lineHeight: 1.5,
      }}>
        <Icon name="sparkle" size={13} style={{ color: 'var(--primary)', verticalAlign: '-2px', marginRight: 6 }} />
        Tip: vul je tijd op het werk-adres bij <strong>"Afstand"</strong> in km vanaf Biervliet, dan rekent Surface automatisch de reiskosten boven 50km mee.
      </div>
    </div>
  );
}

// ── STEP 2: Werk ──────────────────────────────────────────────────
function StepWerk({ data, set }) {
  const toggleSub = key => {
    set('sub', data.sub.includes(key) ? data.sub.filter(s => s !== key) : [...data.sub, key]);
  };
  const hasInvegen = data.sub.includes('invegen');

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Wat moet er gebeuren?</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          De gekozen diensten bepalen de pricing-regels in de volgende stap
        </div>
      </div>

      {/* Hoofdcategorie */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Hoofddienst</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { k: 'oprit_terras_terrein', l: 'Oprit, Terras of Terreinreiniging', d: 'Bestrating reinigen + invegen' },
            { k: 'onkruidbeheersing',    l: 'Onkruidbeheersing',                  d: 'Preventie + onderhoudsplannen' },
          ].map(h => {
            const active = data.hoofdcategorie === h.k;
            return (
              <button
                key={h.k}
                onClick={() => set('hoofdcategorie', h.k)}
                style={{
                  padding: 14,
                  background: active ? 'rgba(26,86,255,.06)' : 'var(--surface)',
                  border: '1px solid',
                  borderColor: active ? 'rgba(26,86,255,.5)' : 'var(--border)',
                  borderRadius: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: active ? 'var(--gradient)' : 'var(--bg)',
                  border: active ? 'none' : '2px solid var(--border)',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--fg)' }}>{h.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{h.d}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-diensten checkboxes */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Sub-diensten <span style={{ color: 'var(--fg-muted)', fontWeight: 400, textTransform: 'none' }}>(meerdere mogelijk)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { k: 'invegen',             l: 'Invegen',                              d: 'Reinigen + voegzand bijvullen', cat: 'oprit_terras_terrein' },
            { k: 'preventieve_onkruid', l: 'Preventieve onkruidbehandeling',       d: 'Eenmalige behandeling, €1,10/m²', cat: 'both' },
            { k: 'beschermlaag',        l: 'Nieuwe beschermlaag toepassen',        d: 'Impregneer-coating, €1,60/m²',  cat: 'oprit_terras_terrein' },
            { k: 'onderhoud',           l: 'Onderhoudsplan',                       d: 'Terugkerende beurten — 4 t/m 16 weken', cat: 'both' },
          ].filter(d => d.cat === 'both' || d.cat === data.hoofdcategorie).map(d => {
            const active = data.sub.includes(d.k);
            return (
              <button
                key={d.k}
                onClick={() => toggleSub(d.k)}
                style={{
                  padding: 12,
                  background: active ? 'rgba(26,86,255,.06)' : 'var(--surface)',
                  border: '1px solid',
                  borderColor: active ? 'rgba(26,86,255,.4)' : 'var(--border)',
                  borderRadius: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div className="row between" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: active ? 'var(--primary)' : 'var(--fg)' }}>{d.l}</strong>
                  <div style={{
                    width: 18, height: 18, borderRadius: 6,
                    background: active ? 'var(--gradient)' : 'var(--bg)',
                    border: '1px solid',
                    borderColor: active ? 'transparent' : 'var(--border)',
                    display: 'grid', placeItems: 'center',
                    color: 'white',
                    flexShrink: 0,
                  }}>
                    {active && <Icon name="check" size={11} stroke={3} />}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{d.d}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Onderhoudsplan — weken-selector */}
      {data.sub.includes('onderhoud') && (
        <div style={{
          padding: 14,
          background: 'rgba(26,86,255,.04)',
          border: '1px solid rgba(26,86,255,.2)',
          borderRadius: 12,
        }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Frequentie onderhoudsplan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { w: 4,  prijs: 1.25 },
              { w: 8,  prijs: 1.75 },
              { w: 12, prijs: 2.90 },
              { w: 16, prijs: 4.50 },
            ].map(opt => {
              const active = +data.onderhoud_weken === opt.w;
              return (
                <button
                  key={opt.w}
                  onClick={() => set('onderhoud_weken', opt.w)}
                  style={{
                    padding: '10px 8px',
                    background: active ? 'var(--gradient)' : 'var(--bg)',
                    color: active ? 'white' : 'var(--fg)',
                    border: '1px solid',
                    borderColor: active ? 'transparent' : 'var(--border)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
                    {opt.w}<span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>wk</span>
                  </div>
                  <div style={{ fontSize: 10, opacity: active ? 0.92 : 0.6, marginTop: 1 }} className="tabular">
                    €{opt.prijs.toFixed(2)}/m²
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Hoe hoger de frequentie, hoe lager de prijs per beurt — maar wel meer beurten per jaar.
            {data.m2 > 0 && (
              <strong style={{ color: 'var(--fg-soft)', marginLeft: 6 }}>
                Per beurt: €{(+data.m2 * (data.onderhoud_weken === 4 ? 1.25 : data.onderhoud_weken === 8 ? 1.75 : data.onderhoud_weken === 12 ? 2.90 : 4.50)).toFixed(2)}
              </strong>
            )}
          </div>
        </div>
      )}

      {/* Specs basic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Oppervlakte (m²) *</label>
          <input className="input tabular" type="number" value={data.m2} onChange={e => set('m2', e.target.value)} style={{ textAlign: 'right' }} />
        </div>
        <div className="field">
          <label className="field-label">Korstmos aanwezig</label>
          <div className="row" style={{ gap: 8 }}>
            {['nee', 'ja'].map(v => (
              <button
                key={v}
                onClick={() => set('korstmos', v)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: data.korstmos === v ? 'var(--card-hover-bg)' : 'var(--surface-2)',
                  border: '1px solid',
                  borderColor: data.korstmos === v ? 'var(--primary)' : 'transparent',
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 500,
                  color: data.korstmos === v ? 'var(--primary)' : 'var(--fg-soft)',
                }}
              >
                {v === 'ja' ? 'Ja (+10% toeslag)' : 'Nee'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voegzand sectie — alleen tonen als invegen actief */}
      {hasInvegen && (
        <div style={{
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Voegzand</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                Kies welke type(s) je wil gebruiken — pas aantal zakken en prijs per zak desgewenst aan
              </div>
            </div>
          </div>

          <ZandTypeRow
            label="Normaal voegzand"
            sub="Standaard kwarts/zilver, voor algemeen voegwerk"
            actief={data.voegzand_normaal_actief}
            zakken={data.voegzand_normaal_zakken}
            prijs={data.voegzand_normaal_prijs}
            defaultPrijs={2.90}
            onToggle={v => set('voegzand_normaal_actief', v)}
            onZakken={v => set('voegzand_normaal_zakken', v)}
            onPrijs={v => set('voegzand_normaal_prijs', v)}
          />
          <div style={{ height: 10 }} />
          <ZandTypeRow
            label="Onkruidwerend voegzand"
            sub="Polymeer-gebonden, voorkomt onkruidgroei tussen voegen"
            actief={data.voegzand_onkruidwerend_actief}
            zakken={data.voegzand_onkruidwerend_zakken}
            prijs={data.voegzand_onkruidwerend_prijs}
            defaultPrijs={20.90}
            onToggle={v => set('voegzand_onkruidwerend_actief', v)}
            onZakken={v => set('voegzand_onkruidwerend_zakken', v)}
            onPrijs={v => set('voegzand_onkruidwerend_prijs', v)}
          />

          {/* Kleur */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="field-label" style={{ marginBottom: 8 }}>Kleur voegzand</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KleurChip
                label="Naturel"
                hex="#C6BBA1"
                actief={data.kleur_naturel}
                onToggle={v => set('kleur_naturel', v)}
              />
              <KleurChip
                label="Antraciet"
                hex="#3A3A3A"
                actief={data.kleur_antraciet}
                onToggle={v => set('kleur_antraciet', v)}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
              Vink beide aan als de klant een mix wil (bijv. naturel op pad + antraciet rond terras)
            </div>
          </div>
        </div>
      )}

      {/* Plantenafscherming */}
      <div style={{
        padding: 16,
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <button
          onClick={() => set('planten_afschermen_actief', !data.planten_afschermen_actief)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 0,
            background: 'transparent',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: data.planten_afschermen_actief ? 'var(--gradient)' : 'var(--bg)',
            border: '1px solid',
            borderColor: data.planten_afschermen_actief ? 'transparent' : 'var(--border)',
            display: 'grid', placeItems: 'center',
            color: 'white',
            flexShrink: 0,
          }}>
            {data.planten_afschermen_actief && <Icon name="check" size={12} stroke={3} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: data.planten_afschermen_actief ? 'var(--primary)' : 'var(--fg)' }}>
              Plantenafscherming nodig
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              Afdekfolie voor planten/struiken direct naast bestrating
            </div>
          </div>
        </button>

        {data.planten_afschermen_actief && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}>
            <div className="field">
              <label className="field-label">Aantal rollen</label>
              <input
                className="input tabular"
                type="number"
                min="0"
                value={data.planten_afschermen_rollen}
                onChange={e => set('planten_afschermen_rollen', e.target.value)}
                style={{ textAlign: 'right' }}
              />
            </div>
            <div className="field">
              <label className="field-label">Prijs per rol</label>
              <div className="row" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)', alignSelf: 'center' }}>€</span>
                <input
                  className="input tabular"
                  type="number"
                  step="0.01"
                  value={data.planten_afschermen_prijs}
                  onChange={e => set('planten_afschermen_prijs', e.target.value)}
                  style={{ textAlign: 'right' }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
                Standaard € 8,50
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Groene aanslag */}
      <CheckRow
        label="Groene aanslag aanwezig"
        sub="Notitie voor uitvoerder (geen prijs-impact)"
        on={data.groene_aanslag === 'ja'}
        onChange={v => set('groene_aanslag', v ? 'ja' : 'nee')}
      />
    </div>
  );
}

// ── ZandTypeRow ──────────────────────────────────────────────────
function ZandTypeRow({ label, sub, actief, zakken, prijs, defaultPrijs, onToggle, onZakken, onPrijs }) {
  return (
    <div style={{
      padding: 12,
      background: actief ? 'rgba(26,86,255,.04)' : 'var(--bg)',
      border: '1px solid',
      borderColor: actief ? 'rgba(26,86,255,.3)' : 'var(--border)',
      borderRadius: 10,
      transition: 'all 0.15s',
    }}>
      <button
        onClick={() => onToggle(!actief)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5,
          background: actief ? 'var(--gradient)' : 'var(--bg)',
          border: '1px solid',
          borderColor: actief ? 'transparent' : 'var(--border)',
          display: 'grid', placeItems: 'center',
          color: 'white',
          flexShrink: 0,
        }}>
          {actief && <Icon name="check" size={12} stroke={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: actief ? 'var(--primary)' : 'var(--fg)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sub}</div>
        </div>
        {actief && +zakken > 0 && (
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }} className="tabular">
            {zakken} zak × €{(+prijs).toFixed(2)} = <strong style={{ color: 'var(--primary)' }}>€{(+zakken * +prijs).toFixed(2)}</strong>
          </div>
        )}
      </button>

      {actief && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
        }}>
          <div className="field">
            <label className="field-label">Aantal zakken</label>
            <input
              className="input tabular"
              type="number"
              min="0"
              value={zakken}
              onChange={e => onZakken(e.target.value)}
              style={{ textAlign: 'right' }}
            />
          </div>
          <div className="field">
            <label className="field-label">Prijs per zak</label>
            <div className="row" style={{ gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', alignSelf: 'center' }}>€</span>
              <input
                className="input tabular"
                type="number"
                step="0.01"
                value={prijs}
                onChange={e => onPrijs(e.target.value)}
                style={{ textAlign: 'right' }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
              Standaard € {defaultPrijs.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KleurChip({ label, hex, actief, onToggle }) {
  return (
    <button
      onClick={() => onToggle(!actief)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        background: actief ? 'rgba(26,86,255,.06)' : 'var(--bg)',
        border: '1px solid',
        borderColor: actief ? 'rgba(26,86,255,.4)' : 'var(--border)',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 28, height: 28,
        borderRadius: '50%',
        background: hex,
        border: '2px solid white',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: actief ? 'var(--primary)' : 'var(--fg)' }}>{label}</div>
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: 5,
        background: actief ? 'var(--gradient)' : 'var(--bg)',
        border: '1px solid',
        borderColor: actief ? 'transparent' : 'var(--border)',
        display: 'grid', placeItems: 'center',
        color: 'white',
        flexShrink: 0,
      }}>
        {actief && <Icon name="check" size={11} stroke={3} />}
      </div>
    </button>
  );
}

function CheckRow({ label, sub, on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'var(--surface)',
        border: '1px solid',
        borderColor: on ? 'rgba(26,86,255,.3)' : 'var(--border)',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6,
        background: on ? 'var(--gradient)' : 'var(--bg)',
        border: '1px solid',
        borderColor: on ? 'transparent' : 'var(--border)',
        display: 'grid', placeItems: 'center',
        color: 'white',
        flexShrink: 0,
      }}>
        {on && <Icon name="check" size={12} stroke={3} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--primary)' : 'var(--fg)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sub}</div>
      </div>
    </button>
  );
}

// ── STEP 3: Offerte regels ────────────────────────────────────────
function StepOfferte({ data, set, rules, totals }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Offerte-regels</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          Auto-berekend op basis van wat je hebt ingevoerd. Voeg extra arbeid toe of pas korting aan.
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
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
          </div>
        ))}
        {rules.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            Geen regels — ga terug naar "Werk" en kies minstens een dienst
          </div>
        )}
      </div>

      {/* Extra arbeid */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Extra arbeid (optioneel)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <input className="input" placeholder="Omschrijving (bv. Struiken beschermen)" value={data.extra_arbeid_omschrijving} onChange={e => set('extra_arbeid_omschrijving', e.target.value)} />
          <input className="input tabular" type="number" placeholder="Minuten" value={data.extra_arbeid_minuten} onChange={e => set('extra_arbeid_minuten', e.target.value)} style={{ textAlign: 'right' }} />
          <input className="input tabular" type="number" placeholder="# pers." value={data.extra_arbeid_personen} onChange={e => set('extra_arbeid_personen', e.target.value)} style={{ textAlign: 'right' }} />
        </div>
      </div>

      {/* Korting */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Korting</div>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <input type="range" min="0" max="20" value={data.korting_percentage} onChange={e => set('korting_percentage', +e.target.value)} style={{ flex: 1 }} />
          <span className="tabular" style={{ width: 50, fontWeight: 700, textAlign: 'right' }}>{data.korting_percentage}%</span>
          <input
            className="input"
            placeholder="Toelichting (bv. Kennismakingskorting)"
            value={data.korting_omschrijving}
            onChange={e => set('korting_omschrijving', e.target.value)}
            style={{ flex: 2 }}
          />
        </div>
      </div>

      {/* Totals summary */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: 16,
      }}>
        <div className="row between" style={{ padding: '4px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Subtotaal</span>
          <span style={{ fontSize: 13 }} className="tabular">{fmtEurDec(totals.subtotal)}</span>
        </div>
        {totals.korstmosToeslag > 0 && (
          <div className="row between" style={{ padding: '4px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Korstmos toeslag (10%)</span>
            <span style={{ fontSize: 13 }} className="tabular">{fmtEurDec(totals.korstmosToeslag)}</span>
          </div>
        )}
        {totals.kortingBedrag > 0 && (
          <div className="row between" style={{ padding: '4px 0', color: 'var(--success)' }}>
            <span style={{ fontSize: 12 }}>Korting ({totals.discount}%)</span>
            <span style={{ fontSize: 13 }} className="tabular">– {fmtEurDec(totals.kortingBedrag)}</span>
          </div>
        )}
        <div className="row between" style={{ padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Excl. BTW</span>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{fmtEurDec(totals.total)}</span>
        </div>
        <div className="row between" style={{
          padding: '12px 14px',
          background: 'var(--gradient)',
          color: 'white',
          borderRadius: 10,
          marginTop: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Totaal incl. BTW</span>
          <span className="tabular" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtEurDec(totals.total + totals.btw)}</span>
        </div>
      </div>
    </div>
  );
}

// ── STEP 4: Versturen ─────────────────────────────────────────────
function StepVersturen({ data, set, rules, totals }) {
  const fakeLead = {
    id: 'L-MANUAL',
    naam: data.naam || 'Klant',
    telefoon: data.telefoon,
    email: data.email,
    adres: `${data.straat || ''} ${data.huisnummer || ''}, ${data.postcode || ''} ${data.plaats || ''}`.trim() || '—',
    m2: +data.m2,
    sub: data.sub,
    afstand_km: +data.afstand_km,
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Klaar om te versturen?</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          Surface stuurt de PDF binnen 60 seconden via je gekozen kanaal en start een WhatsApp-conversatie zodat de klant kan reageren.
        </div>
      </div>

      {/* Summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(26,86,255,.04), rgba(0,207,255,.04))',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 18,
      }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={fakeLead.naam} size="lg" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{fakeLead.naam}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fakeLead.adres}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fakeLead.telefoon} {fakeLead.email && '· ' + fakeLead.email}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Totaal incl. BTW</div>
            <div className="tabular" style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {fmtEurDec(totals.total + totals.btw)}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 16, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span><Icon name="square" size={12} /> {fakeLead.m2} m²</span>
          <span>·</span>
          <span>{data.sub.map(s => DIENST_LABELS[s]).join(' + ')}</span>
          <span>·</span>
          <span>{rules.length} offerte-regels</span>
        </div>
      </div>

      {/* Begeleidende notitie */}
      <div className="field">
        <label className="field-label">Begeleidende notitie voor klant (optioneel)</label>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Bv. Beste Jan, fijn dat we elkaar even hebben gesproken. Hierbij de offerte zoals afgesproken — je hoort het wel."
          value={data.notitie}
          onChange={e => set('notitie', e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
          Deze tekst staat boven de PDF en wordt als WhatsApp-bericht meegestuurd.
        </div>
      </div>

      {/* Send channel */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Versturen via</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { k: 'wa',   l: 'WhatsApp',     i: 'whatsapp', sub: '+ PDF bijlage', def: true },
            { k: 'mail', l: 'E-mail',       i: 'mail',     sub: 'met PDF bijlage' },
            { k: 'both', l: 'Beide',        i: 'send',     sub: 'WhatsApp + e-mail' },
            { k: 'manual', l: 'Alleen download', i: 'file', sub: 'PDF zelf opsturen', alt: true },
          ].map(c => (
            <button
              key={c.k}
              style={{
                padding: 14,
                background: c.def ? 'rgba(26,86,255,.06)' : c.alt ? 'rgba(22,163,74,.06)' : 'var(--surface)',
                border: '1px solid',
                borderColor: c.def ? 'rgba(26,86,255,.4)' : c.alt ? 'rgba(22,163,74,.3)' : 'var(--border)',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Icon name={c.i} size={20} style={{ color: c.def ? 'var(--primary)' : c.alt ? 'var(--success)' : 'var(--fg-soft)' }} />
              <strong style={{ fontSize: 13, color: c.def ? 'var(--primary)' : c.alt ? 'var(--success)' : 'var(--fg)' }}>{c.l}</strong>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center' }}>{c.sub}</span>
            </button>
          ))}
        </div>
        <div style={{
          marginTop: 10,
          padding: 10,
          background: 'rgba(22,163,74,.06)',
          border: '1px solid rgba(22,163,74,.2)',
          borderRadius: 8,
          fontSize: 11,
          color: 'var(--fg-soft)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--success)' }}>"Alleen download"</strong> is handig als je de klant zelf wil contacteren (bijv. via persoonlijke e-mail of langs laten lopen). De PDF wordt naar je downloads-map opgeslagen, geen WhatsApp / mail verstuurd.
        </div>
      </div>

      <div style={{
        padding: 14,
        background: 'rgba(22,163,74,.06)',
        border: '1px solid rgba(22,163,74,.2)',
        borderRadius: 10,
      }}>
        <div className="row" style={{ gap: 10 }}>
          <Icon name="check" size={16} style={{ color: 'var(--success)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Klaar om te versturen</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              Na verzenden wordt de klant aangemaakt als lead, ontvang je notificaties bij elke reactie, en kun je 'm volgen via de Pipeline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ManualQuoteModal = ManualQuoteModal;
