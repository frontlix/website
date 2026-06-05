// src/screens/Onboarding.jsx
// 7-step onboarding wizard — voor nieuwe Frontlix-klanten

const { useState: useStateOn, useMemo: useMemoOn } = React;

function Onboarding({ onComplete }) {
  const [step, setStep] = useStateOn(1);
  const total = 7;
  const [data, setData] = useStateOn({
    bedrijfsnaam: '', plaats: '', kvk: '', postcode: '', huisnummer: '',
    hoofddiensten: ['oprit_terras'],
    subDiensten: ['invegen', 'beschermlaag'],
    prijzen: { reiniging: 3.95, invegen_normaal: 0.90, beschermlaag: 1.60 },
    radius_km: 100, doorverwijs: '',
    template_stijl: 'informeel',
    bot_naam: 'Surface',
    webhook_tested: false,
    test_telefoon: '',
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const progress = (step / total) * 100;
  const next = () => setStep(s => Math.min(total, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '18px 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'var(--bg)',
      }}>
        <img src="assets/frontlix-logo.png" alt="" style={{ width: 32, height: 32 }} />
        <div style={{ font: '800 17px var(--font-heading)', letterSpacing: '-0.02em' }}>Frontl<span className="gradient-text">ix</span></div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', borderLeft: '1px solid var(--border)', paddingLeft: 14, marginLeft: 6 }}>Onboarding</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Stap {step} van {total}</span>
        <button className="btn btn-ghost btn-sm" onClick={onComplete}>Sla over</button>
      </div>

      {/* Progress */}
      <div style={{ height: 3, background: 'var(--surface-2)', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${progress}%`,
          background: 'var(--gradient)',
          transition: 'width 0.4s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, overflow: 'hidden' }}>
        {/* Stepper sidebar */}
        <div style={{ padding: '28px 24px', borderRight: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto' }}>
          {[
            { n: 1, l: 'Welkom',        s: 'Even kennismaken' },
            { n: 2, l: 'Bedrijfsbasics', s: 'Naam, plaats, KvK' },
            { n: 3, l: 'Diensten',       s: 'Wat bied je aan?' },
            { n: 4, l: 'Prijzen',        s: 'Pre-fill + aanpassen' },
            { n: 5, l: 'Werkgebied',     s: 'Postcode-radius' },
            { n: 6, l: 'Openingsbericht', s: 'WhatsApp-template' },
            { n: 7, l: 'Live zetten',    s: 'Webhook + test' },
          ].map(s => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="row" style={{ gap: 12, padding: '10px 0', cursor: done ? 'pointer' : 'default' }} onClick={() => done && setStep(s.n)}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: active ? 'var(--gradient)' : done ? 'rgba(22,163,74,.15)' : 'var(--surface-2)',
                  color: active ? 'white' : done ? 'var(--success)' : 'var(--fg-muted)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700,
                  flexShrink: 0,
                }}>{done ? <Icon name="check" size={13} stroke={3} /> : s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--fg)' }}>{s.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.s}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '40px 56px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {step === 1 && <StepWelkom next={next} />}
            {step === 2 && <StepBedrijf data={data} set={set} />}
            {step === 3 && <StepDiensten data={data} set={set} />}
            {step === 4 && <StepPrijzen data={data} set={set} />}
            {step === 5 && <StepWerkgebied data={data} set={set} />}
            {step === 6 && <StepOpening data={data} set={set} />}
            {step === 7 && <StepLive data={data} set={set} onComplete={onComplete} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="row between" style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button className="btn btn-ghost" onClick={back} disabled={step === 1} style={{ opacity: step === 1 ? 0.4 : 1 }}>
          ← Vorige
        </button>
        <div className="row" style={{ gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i + 1 <= step ? 'var(--primary)' : 'var(--surface-2)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        {step < total
          ? <button className="btn btn-primary" onClick={next}>Volgende <Icon name="arrow-right" size={13} /></button>
          : <button className="btn btn-primary" onClick={onComplete}><Icon name="check" size={13} /> Naar dashboard</button>}
      </div>
    </div>
  );
}

// ── Steps ────────────────────────────────────────────────────────
function StepWelkom({ next }) {
  return (
    <div>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--gradient)',
        display: 'grid', placeItems: 'center',
        color: 'white', marginBottom: 20,
      }}>
        <Icon name="sparkle" size={32} />
      </div>
      <h1 style={{ font: '900 36px var(--font-heading)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14 }}>
        Welkom! Klaar in 8 minuten.
      </h1>
      <p style={{ fontSize: 16, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 24 }}>
        We doorlopen 7 korte stappen waarin we Surface — jullie WhatsApp-bot — afstemmen op jouw bedrijf, diensten en prijzen. Daarna staat 'ie binnen 24u live.
      </p>
      <div className="col" style={{ gap: 12, marginBottom: 24 }}>
        {[
          { i: 'building', t: 'Bedrijfsgegevens', s: 'Naam, KvK, vestiging' },
          { i: 'list',     t: 'Jouw diensten', s: 'Welke werkzaamheden + sub-types' },
          { i: 'euro',     t: 'Prijzen pre-fill', s: 'Branche-standaard, jij past aan' },
          { i: 'mappin',   t: 'Werkgebied', s: 'Postcode-radius vanaf je vestiging' },
          { i: 'whatsapp', t: 'Openingsbericht', s: 'Wat Surface zegt bij een nieuwe lead' },
          { i: 'check',    t: 'Live + test', s: 'Webhook installeren + eerste test-bericht' },
        ].map((b, i) => (
          <div key={i} className="row" style={{ gap: 12, padding: 12, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,86,255,.08)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
              <Icon name={b.i} size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.t}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{b.s}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-lg" onClick={next} style={{ padding: '14px 26px' }}>
        Laten we beginnen <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

function StepBedrijf({ data, set }) {
  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Bedrijfsbasics</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Komt op de offertes en in het openingsbericht.</p>
      <div className="col" style={{ gap: 14 }}>
        <div className="field"><label className="field-label">Bedrijfsnaam *</label><input className="input" value={data.bedrijfsnaam} onChange={e => set('bedrijfsnaam', e.target.value)} placeholder="Bv. Schoon Straatje" autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
          <div className="field"><label className="field-label">Plaats *</label><input className="input" value={data.plaats} onChange={e => set('plaats', e.target.value)} placeholder="Biervliet" /></div>
          <div className="field"><label className="field-label">KvK</label><input className="input" value={data.kvk} onChange={e => set('kvk', e.target.value)} placeholder="12345678" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
          <div className="field"><label className="field-label">Postcode</label><input className="input" value={data.postcode} onChange={e => set('postcode', e.target.value)} placeholder="4521 CB" /></div>
          <div className="field"><label className="field-label">Adres + huisnummer</label><input className="input" value={data.huisnummer} onChange={e => set('huisnummer', e.target.value)} placeholder="Achterweg 23" /></div>
        </div>
      </div>
    </div>
  );
}

function StepDiensten({ data, set }) {
  const toggle = (arr, k, v) => set(k, data[k].includes(v) ? data[k].filter(x => x !== v) : [...data[k], v]);
  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Welke diensten bied je aan?</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Surface stelt vragen op basis van wat je hier kiest. Later aan te passen.</p>

      <div className="field-label" style={{ marginBottom: 8 }}>Hoofddiensten</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {[
          { k: 'oprit_terras', l: 'Oprit / Terras', d: 'Reiniging + invegen' },
          { k: 'onkruid',      l: 'Onkruidbeheersing', d: 'Preventie + onderhoud' },
        ].map(h => (
          <CheckTile key={h.k} active={data.hoofddiensten.includes(h.k)} onClick={() => toggle(null, 'hoofddiensten', h.k)} l={h.l} d={h.d} />
        ))}
      </div>

      <div className="field-label" style={{ marginBottom: 8 }}>Sub-diensten</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { k: 'invegen',     l: 'Voegen invegen' },
          { k: 'beschermlaag', l: 'Beschermlaag' },
          { k: 'preventief', l: 'Preventieve onkruidbehandeling' },
          { k: 'onderhoud',  l: 'Onderhoudsplan (4-16w)' },
        ].map(s => (
          <CheckTile key={s.k} active={data.subDiensten.includes(s.k)} onClick={() => toggle(null, 'subDiensten', s.k)} l={s.l} />
        ))}
      </div>
    </div>
  );
}

function StepPrijzen({ data, set }) {
  const setPrijs = (k, v) => set('prijzen', { ...data.prijzen, [k]: parseFloat(v) || 0 });
  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Pre-fill prijzen</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>
        Gemiddelde markttarief voor jouw branche. Pas aan waar je afwijkt — alles is later in het dashboard te wijzigen.
      </p>
      <div className="col" style={{ gap: 8 }}>
        {[
          { k: 'reiniging',       l: 'Reiniging straatwerk', e: '€ / m²' },
          { k: 'invegen_normaal', l: 'Invegen — arbeid normaal voegzand', e: '€ / m²' },
          { k: 'beschermlaag',    l: 'Beschermlaag impregneren', e: '€ / m²' },
        ].map(p => (
          <div key={p.k} style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.l}</div>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>€</span>
              <input className="input tabular" type="number" step="0.05" value={data.prijzen[p.k]} onChange={e => setPrijs(p.k, e.target.value)} style={{ textAlign: 'right', width: 70 }} />
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{p.e.replace('€', '').trim()}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: 'rgba(26,86,255,.05)', border: '1px solid rgba(26,86,255,.15)', borderRadius: 9, fontSize: 12, color: 'var(--fg-soft)' }}>
        <Icon name="sparkle" size={13} style={{ color: 'var(--primary)', verticalAlign: '-2px', marginRight: 6 }} />
        Tip: deze pre-fill is gebaseerd op 12 vergelijkbare bedrijven in Zuid-Holland. Voeg later meer prijzen toe via Instellingen.
      </div>
    </div>
  );
}

function StepWerkgebied({ data, set }) {
  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Hoe ver werk je?</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Leads buiten dit gebied worden automatisch doorverwezen (of komen bij jou voor overleg).</p>
      <div className="field" style={{ marginBottom: 18 }}>
        <label className="field-label">Maximale afstand vanaf vestiging</label>
        <div className="row" style={{ gap: 14, marginTop: 8 }}>
          <input type="range" min="20" max="300" step="10" value={data.radius_km} onChange={e => set('radius_km', +e.target.value)} style={{ flex: 1 }} />
          <span className="tabular" style={{ fontSize: 20, fontWeight: 800, minWidth: 80, textAlign: 'right' }}>{data.radius_km} km</span>
        </div>
      </div>
      <div className="field">
        <label className="field-label">Doorverwijs-bedrijf voor leads buiten radius (optioneel)</label>
        <input className="input" value={data.doorverwijs} onChange={e => set('doorverwijs', e.target.value)} placeholder="https://collega-bedrijf.nl" />
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
          Surface stuurt deze klanten netjes door + waarschuwt jou zodat je eventueel zelf kunt beslissen.
        </div>
      </div>
    </div>
  );
}

function StepOpening({ data, set }) {
  const templates = {
    informeel: `Hoi {voornaam} 👋\n\nBedankt voor je aanvraag bij ${data.bedrijfsnaam || 'jullie'}! Ik ben ${data.bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte.\n\nKlopt het dat het om ongeveer {m2} m² gaat?`,
    formeel: `Geachte heer/mevrouw {achternaam},\n\nHartelijk dank voor uw aanvraag. Mijn naam is ${data.bot_naam} en ik ben de digitale assistent van ${data.bedrijfsnaam || 'ons bedrijf'}. Ik help u graag met een offerte op maat.\n\nKan ik bevestigen dat het om circa {m2} m² gaat?`,
    direct: `Hoi {voornaam},\n\n${data.bot_naam} hier, namens ${data.bedrijfsnaam || 'het bedrijf'}. Bedankt voor je aanvraag — ik help je snel aan een prijs.\n\n{m2} m² klopt?`,
  };
  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Hoe spreekt Surface je klanten aan?</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Kies een stijl — je kunt 'm later helemaal vrij aanpassen.</p>

      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field-label">Naam van je bot</label>
        <input className="input" value={data.bot_naam} onChange={e => set('bot_naam', e.target.value)} placeholder="Bv. Surface, Robbie, Stratos" />
      </div>

      <div className="field-label" style={{ marginBottom: 8 }}>Communicatiestijl</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { k: 'informeel', l: 'Informeel', e: '👋' },
          { k: 'formeel',   l: 'Formeel',   e: '🎩' },
          { k: 'direct',    l: 'Direct',    e: '⚡' },
        ].map(s => {
          const active = data.template_stijl === s.k;
          return (
            <button key={s.k} onClick={() => set('template_stijl', s.k)} style={{
              padding: '14px 10px',
              background: active ? 'rgba(26,86,255,.06)' : 'var(--surface)',
              border: '1px solid', borderColor: active ? 'rgba(26,86,255,.4)' : 'var(--border)',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>{s.e}</span>
              <strong style={{ fontSize: 13, color: active ? 'var(--primary)' : 'var(--fg)' }}>{s.l}</strong>
            </button>
          );
        })}
      </div>

      <div className="field-label" style={{ marginBottom: 6 }}>Preview</div>
      <div style={{ background: '#ECE5DD', borderRadius: 12, padding: 14 }}>
        <div style={{
          background: '#D9FDD3', borderRadius: 8, borderTopRightRadius: 2,
          padding: '8px 12px',
          fontSize: 13, lineHeight: 1.45,
          marginLeft: 'auto', maxWidth: '92%', width: 'fit-content',
          whiteSpace: 'pre-wrap',
          boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
          color: '#111B21',
        }}>
          {templates[data.template_stijl]}
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: 5 }}>
            09:14 <span style={{ color: '#53BDEB' }}>✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepLive({ data, set, onComplete }) {
  const [tested, setTested] = useStateOn(false);
  const test = () => {
    setTested(true);
    setTimeout(() => set('webhook_tested', true), 800);
  };

  return (
    <div>
      <h2 style={{ font: '800 28px var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 8 }}>Verbind je formulier</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>
        Surface ontvangt aanvragen via een webhook van je website. Stuur dit naar je webdeveloper.
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><div className="card-title">Webhook endpoint</div></div>
        <div style={{ padding: 16 }}>
          <input className="input mono" readOnly value={`https://${(data.bedrijfsnaam || 'jouw-bedrijf').toLowerCase().replace(/\s+/g,'')}.frontlix.com/api/webhook/lead`} />
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm"><Icon name="file" size={11} /> Kopieer URL</button>
            <button className="btn btn-secondary btn-sm"><Icon name="mail" size={11} /> Mail naar webdev</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Test-bericht</div>
            <div className="card-sub">Stuur 1e WhatsApp naar je eigen nummer</div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="+31 6 ..." value={data.test_telefoon} onChange={e => set('test_telefoon', e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={!data.test_telefoon || tested} onClick={test} style={{ opacity: !data.test_telefoon ? 0.5 : 1 }}>
              {tested ? <><Icon name="check" size={13} /> Verstuurd</> : <><Icon name="send" size={13} /> Test</>}
            </button>
          </div>
          {tested && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 9, fontSize: 12, color: 'var(--fg-soft)' }}>
              <Icon name="check" size={13} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 6 }} />
              Test-bericht is verstuurd naar {data.test_telefoon}. Check je WhatsApp!
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: 18,
        background: 'var(--gradient)',
        color: 'white',
        borderRadius: 12,
        textAlign: 'center',
      }}>
        <Icon name="sparkle" size={26} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4 }}>Klaar!</div>
        <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 14 }}>
          {data.bot_naam} staat live. De eerste echte lead die binnenkomt wordt automatisch beantwoord.
        </div>
        <button onClick={onComplete} style={{
          background: 'white', color: 'var(--primary)',
          border: 'none', padding: '10px 22px', borderRadius: 9,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          Open mijn dashboard →
        </button>
      </div>
    </div>
  );
}

function CheckTile({ active, onClick, l, d }) {
  return (
    <button onClick={onClick} style={{
      padding: 14,
      background: active ? 'rgba(26,86,255,.06)' : 'var(--surface)',
      border: '1px solid', borderColor: active ? 'rgba(26,86,255,.4)' : 'var(--border)',
      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ width: 20, height: 20, borderRadius: 6,
        background: active ? 'var(--gradient)' : 'var(--bg)',
        border: '1px solid', borderColor: active ? 'transparent' : 'var(--border)',
        display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
      }}>{active && <Icon name="check" size={11} stroke={3} />}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--fg)' }}>{l}</div>
        {d && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{d}</div>}
      </div>
    </button>
  );
}

window.Onboarding = Onboarding;
