// src/screens/Agenda.jsx + Instellingen.jsx (combined)

const { useState: useStateAG, useMemo: useMemoAG } = React;

// ─────────────────────────────────────────────────────────────────
function Agenda({ navigate }) {
  const [viewMode, setViewMode] = useStateAG('week'); // week | kaart
  // Week mei 11 - 17, 2026 (mon-sun)
  const weekStart = new Date('2026-05-11');
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date('2026-05-13');
  const hours = Array.from({ length: 11 }).map((_, i) => i + 7); // 7:00 → 17:00

  const eventsByDay = useMemoAG(() => {
    const map = {};
    APPOINTMENTS.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    // Add a few extra for visual richness
    map['2026-05-12'] = map['2026-05-12'] || [];
    map['2026-05-12'].push({ name: 'Offerte review-call', start: '10:00', end: '10:30', tone: 'amber', adres: 'Telefoon', dienst: 'Korstmos' });
    map['2026-05-14'] = map['2026-05-14'] || [];
    map['2026-05-14'].push({ name: 'Inkoop voegzand', start: '13:00', end: '14:00', tone: 'amber', adres: 'Biervliet', dienst: 'Eigen' });
    map['2026-05-15'] = map['2026-05-15'] || [];
    return map;
  }, []);

  return (
    <div className="content-inner">
      <div className="section-head">
        <div>
          <div className="section-title">Agenda</div>
          <div className="section-sub">Week 20 · 11 t/m 17 mei 2026</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            <button className={`seg-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>
              <Icon name="calendar" size={13} /> Week
            </button>
            <button className={`seg-btn ${viewMode === 'kaart' ? 'active' : ''}`} onClick={() => setViewMode('kaart')}>
              <Icon name="mappin" size={13} /> Routekaart
            </button>
          </div>
          <button className="btn btn-secondary"><Icon name="calendar" size={13} /> Vandaag</button>
          <button className="btn btn-primary"><Icon name="plus" size={13} /> Afspraak</button>
        </div>
      </div>

      {viewMode === 'kaart' ? (
        <RouteMap appointments={APPOINTMENTS} />
      ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Week grid */}
        <div className="card" style={{ padding: 16 }}>
          <div className="cal-grid">
            <div className="cal-cell head"></div>
            {days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div className={`cal-cell head ${isToday ? 'today' : ''}`} key={i}>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                    {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? 'var(--primary)' : 'inherit' }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}

            {hours.map(h => (
              <React.Fragment key={h}>
                <div className="cal-cell time">{h}:00</div>
                {days.map((d, di) => {
                  const dateStr = d.toISOString().slice(0, 10);
                  const isToday = d.toDateString() === today.toDateString();
                  const events = (eventsByDay[dateStr] || []).filter(e => {
                    const sh = parseInt(e.start.split(':')[0], 10);
                    return sh === h;
                  });
                  return (
                    <div className={`cal-cell ${isToday ? 'today' : ''}`} key={di}>
                      {events.map((e, ei) => (
                        <div key={ei} className={`cal-event ${e.tone === 'green' ? 'green' : e.tone === 'amber' ? 'amber' : ''}`}>
                          <div>{e.name}</div>
                          <div className="cal-event-time">{e.start}–{e.end}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Sidebar — upcoming list */}
        <div className="col">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Komende 7 dagen</div>
                <div className="card-sub">4 afspraken · 12 uur werk</div>
              </div>
            </div>
            <div className="col" style={{ padding: 14, gap: 10 }}>
              {APPOINTMENTS.map((a, i) => (
                <div key={i} className="row" style={{
                  padding: '12px',
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  gap: 12,
                  cursor: 'pointer',
                }} onClick={() => navigate(`leads/${a.lead}`)}>
                  <div style={{
                    width: 6, alignSelf: 'stretch', borderRadius: 9999,
                    background: a.tone === 'green' ? 'var(--success)' : a.tone === 'amber' ? '#F59E0B' : 'var(--primary)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                      {new Date(a.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })} · {a.start}–{a.end}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                      <Icon name="mappin" size={10} style={{ verticalAlign: '-1px' }} /> {a.adres} · {a.m2}m²
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Op te volgen</div>
            </div>
            <div className="col" style={{ padding: 14, gap: 8 }}>
              {[
                { name: 'Bouwbedrijf Korstmos', text: 'Offerte 5 dagen oud — herinnering automatisch verstuurd', tone: 'amber' },
                { name: 'Thomas Wilms', text: 'Wacht op owner-besluit over korting', tone: 'red' },
              ].map((t, i) => (
                <div key={i} style={{
                  padding: 12,
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                }}>
                  <div className="row between" style={{ marginBottom: 4, gap: 8 }}>
                    <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{t.name}</strong>
                    <Pill tone={t.tone} sm>Open</Pill>
                  </div>
                  <div style={{ color: 'var(--fg-muted)', lineHeight: 1.45 }}>{t.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function Instellingen() {
  const [tab, setTab] = useStateAG('bedrijf');
  return (
    <div className="content-inner">
      <div className="section-head">
        <div>
          <div className="section-title">Instellingen</div>
          <div className="section-sub">Bedrijf · Prijzen · Diensten · Openingsbericht · Reminders · Team</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: 16,
        alignItems: 'start',
      }}>
        <div className="card" style={{ padding: 8 }}>
          <div className="col" style={{ gap: 2 }}>
            {[
              { k: 'bedrijf',    l: 'Bedrijfsgegevens',   i: 'building' },
              { k: 'prijzen',    l: 'Prijzen',             i: 'euro'    },
              { k: 'diensten',   l: 'Diensten aanbod',     i: 'list'    },
              { k: 'tags',       l: 'Tags',                i: 'tag'     },
              { k: 'opening',    l: 'Openingsbericht',     i: 'whatsapp'},
              { k: 'reminders',  l: 'Reminders',           i: 'bell'    },
              { k: 'notif',      l: 'Notificaties',        i: 'sparkle' },
              { k: 'team',       l: 'Team',                i: 'users'   },
            ].map(t => (
              <button
                key={t.k}
                className="nav-item"
                style={{
                  background: tab === t.k ? 'var(--card-hover-bg)' : 'transparent',
                  color: tab === t.k ? 'var(--primary)' : 'var(--fg-soft)',
                  fontSize: 13,
                }}
                onClick={() => setTab(t.k)}
              >
                <Icon name={t.i} size={15} />
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="col">
          {tab === 'bedrijf'   && <SettingsBedrijf />}
          {tab === 'prijzen'   && <SettingsPrijzen />}
          {tab === 'diensten'  && <SettingsDiensten />}
          {tab === 'tags'      && <SettingsTags />}
          {tab === 'opening'   && <SettingsOpening />}
          {tab === 'reminders' && <SettingsReminders />}
          {tab === 'notif'     && <SettingsNotif />}
          {tab === 'team'      && <SettingsTeam />}
        </div>
      </div>
    </div>
  );
}

function SettingsBedrijf() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Bedrijfsgegevens</div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.__openOnboarding?.()}>
            <Icon name="sparkle" size={12} /> Onboarding opnieuw doorlopen
          </button>
          <button className="btn btn-primary btn-sm">Opslaan</button>
        </div>
      </div>
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="field"><label className="field-label">Bedrijfsnaam</label><input className="input" defaultValue="Schoon Straatje" /></div>
        <div className="field"><label className="field-label">Chatbot-naam</label><input className="input" defaultValue="Surface" /></div>
        <div className="field"><label className="field-label">Adres</label><input className="input" defaultValue="Achterweg 23" /></div>
        <div className="field" style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
          <div><label className="field-label">Postcode</label><input className="input" defaultValue="4521 CB" /></div>
          <div><label className="field-label">Plaats</label><input className="input" defaultValue="Biervliet" /></div>
        </div>
        <div className="field"><label className="field-label">Eigenaar e-mail</label><input className="input" defaultValue="info@schoonstraatje.nl" /></div>
        <div className="field"><label className="field-label">Eigenaar WhatsApp</label><input className="input" defaultValue="+31 6 24965270" /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Google Calendar afspraak-link</label>
          <input className="input" defaultValue="https://calendar.google.com/calendar/appointments/schedules/AcZ..." />
        </div>
      </div>
    </div>
  );
}

function SettingsPrijzen() {
  const [values, setValues] = useStateAG(() => Object.fromEntries(PRICING_RULES.map(p => [p.key, p.waarde])));
  const [changed, setChanged] = useStateAG({});

  const update = (key, val) => {
    setValues(v => ({ ...v, [key]: val }));
    setChanged(c => ({ ...c, [key]: val !== PRICING_RULES.find(p => p.key === key).waarde }));
  };

  const hasChanges = Object.values(changed).some(Boolean);

  // Calculate simulated impact based on 30 reference leads
  const sim = useMemoAG(() => {
    if (!hasChanges) return { delta: 0, omzet: 25420, conversie: 64 };
    let totalDelta = 0;
    Object.entries(changed).forEach(([k, isChanged]) => {
      if (!isChanged) return;
      const rule = PRICING_RULES.find(p => p.key === k);
      const oldV = rule.waarde;
      const newV = values[k];
      const diffPct = ((newV - oldV) / oldV);

      // Rough impact model: per-m² prices affect ~30 leads averaging 90m²
      if (k.includes('per_m2'))     totalDelta += (newV - oldV) * 90 * 22;  // 22 of 30 leads had this service
      if (k.includes('per_zak'))    totalDelta += (newV - oldV) * 18 * 15;
      if (k.includes('per_minuut')) totalDelta += (newV - oldV) * 45 * 8;
      if (k.includes('per_km'))     totalDelta += (newV - oldV) * 38 * 30;
    });
    // Conversion model: higher prices = lower conversion (very rough)
    const priceMove = totalDelta / 25420;
    const conversieDelta = -priceMove * 12; // 12pt drop per 100% price hike
    return {
      delta: totalDelta,
      omzet: 25420 + totalDelta * (1 + conversieDelta / 100),
      conversie: Math.max(0, Math.min(100, 64 + conversieDelta)),
      conversieDelta,
    };
  }, [values, changed, hasChanges]);

  return (
    <div className="col">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Prijzen</div>
            <div className="card-sub">Worden gebruikt door Surface om offertes te berekenen</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={!hasChanges} style={{ opacity: hasChanges ? 1 : 0.5 }}>Alles opslaan</button>
        </div>
        <div style={{ padding: 8 }}>
          {PRICING_RULES.map(p => (
            <div key={p.key} className="row" style={{
              padding: '10px 14px',
              borderRadius: 8,
              gap: 12,
              background: changed[p.key] ? 'rgba(26,86,255,.05)' : 'transparent',
              border: changed[p.key] ? '1px solid rgba(26,86,255,.2)' : '1px solid transparent',
              transition: 'background 0.15s',
              marginBottom: 2,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }} className="mono">{p.key}</div>
              </div>
              <div style={{ width: 180, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="input tabular"
                  type="number"
                  step={p.waarde < 1 ? 0.05 : 0.1}
                  value={values[p.key]}
                  onChange={e => update(p.key, parseFloat(e.target.value) || 0)}
                  style={{ textAlign: 'right', width: 90 }}
                />
                <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{p.eenheid}</span>
                {changed[p.key] && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: values[p.key] > p.waarde ? 'var(--success)' : 'var(--danger)',
                    whiteSpace: 'nowrap',
                  }}>
                    {values[p.key] > p.waarde ? '+' : ''}{((values[p.key] - p.waarde) / p.waarde * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulator banner */}
      <div style={{
        position: 'sticky',
        bottom: 16,
        background: hasChanges ? 'var(--bg)' : 'var(--bg)',
        border: '1px solid',
        borderColor: hasChanges ? 'rgba(26,86,255,.3)' : 'var(--border)',
        borderRadius: 14,
        padding: 18,
        boxShadow: hasChanges ? '0 10px 30px rgba(26,86,255,.15), 0 1px 3px rgba(0,0,0,.08)' : 'var(--shadow-card)',
        transition: 'all 0.25s',
        overflow: 'hidden',
      }}>
        <div className="row" style={{ gap: 14, alignItems: 'center', marginBottom: hasChanges ? 14 : 0 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: hasChanges ? 'var(--gradient)' : 'var(--surface-2)',
            color: hasChanges ? 'white' : 'var(--fg-muted)',
            display: 'grid', placeItems: 'center',
            flexShrink: 0,
            transition: 'background 0.25s',
          }}>
            <Icon name="sparkle" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Wat-als simulator</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {hasChanges
                ? <>Op basis van je <strong>laatste 30 leads</strong> ({new Date('2026-04-13').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – nu)</>
                : 'Pas een prijs aan om het effect te zien op je laatste 30 leads'}
            </div>
          </div>
        </div>

        {hasChanges && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            <SimCard
              label="Omzet-effect (30 leads)"
              value={`${sim.delta > 0 ? '+' : ''}€ ${Math.round(sim.delta).toLocaleString('nl-NL')}`}
              tone={sim.delta > 0 ? 'positive' : 'negative'}
              sub={`van €25.420 naar €${Math.round(sim.omzet).toLocaleString('nl-NL')}`}
            />
            <SimCard
              label="Geschatte conversie"
              value={`${sim.conversie.toFixed(0)}%`}
              tone={sim.conversieDelta > 0 ? 'positive' : sim.conversieDelta < -1 ? 'negative' : 'neutral'}
              sub={`${sim.conversieDelta > 0 ? '+' : ''}${sim.conversieDelta.toFixed(1)} pt vs nu (64%)`}
            />
            <SimCard
              label="Beste actie"
              value={sim.delta > 1000 ? 'Test 2 weken' : sim.delta < -500 ? 'Behoud huidig' : 'Marginaal'}
              tone="neutral"
              sub={sim.delta > 1000 ? 'A/B met 50% van leads' : 'Kleine impact verwacht'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SimCard({ label, value, sub, tone }) {
  const color = tone === 'positive' ? 'var(--success)' : tone === 'negative' ? 'var(--danger)' : 'var(--fg)';
  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--surface)',
      borderRadius: 10,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color, marginTop: 4 }} className="tabular">
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function SettingsDiensten() {
  const [services, setServices] = useStateAG(SERVICE_OFFERINGS);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Diensten aanbod</div>
        <button className="btn btn-secondary btn-sm"><Icon name="plus" size={12} /> Dienst toevoegen</button>
      </div>
      <div style={{ padding: 16 }}>
        {services.map((s, i) => (
          <div key={s.key} className="row between" style={{
            padding: 14,
            background: 'var(--surface)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            marginBottom: 10,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }} className="mono">{s.key}</div>
            </div>
            <Toggle
              on={s.actief}
              onChange={v => setServices(services.map((x, ix) => ix === i ? { ...x, actief: v } : x))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsReminders() {
  const defaults = [
    {
      dag: 2,
      label: 'Eerste herinnering',
      sub: 'Vriendelijk, zonder druk',
      tone: 'blue',
      tekst: "Hoi {voornaam},\n\nIk heb gisteren de offerte van € {totaal} doorgestuurd. Heb je 'm kunnen bekijken? Even tikje sturen als je nog vragen hebt, dan denk ik graag met je mee.\n\nGroet,\nSurface namens Schoon Straatje",
    },
    {
      dag: 5,
      label: 'Tweede herinnering',
      sub: 'Vraagt expliciet of klant nog interesse heeft',
      tone: 'amber',
      tekst: "Hoi {voornaam},\n\nNog even een check: is de offerte voor het {dienst} duidelijk? Geen druk hoor — gewoon laten weten of je 'm in beraad houdt of liever afmeldt. Beide is prima.\n\nDe offerte is nog geldig tot {geldig_tot}.",
    },
    {
      dag: 8,
      label: 'Derde herinnering',
      sub: 'Laatste poging, met optie tot afmelden',
      tone: 'red',
      tekst: "Hoi {voornaam},\n\nLaatste tikje — als ik over een paar dagen niks hoor sluit ik de offerte automatisch af. Geen probleem als het niet doorgaat; wel fijn als je het even bevestigt.\n\nWil je 'm toch nog gebruiken? Reageer dan vóór {geldig_tot}.",
    },
  ];
  const [reminders, setReminders] = useStateAG(defaults);

  const update = (i, key, val) => {
    setReminders(rs => rs.map((r, ix) => ix === i ? { ...r, [key]: val } : r));
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Reminders</div>
          <div className="card-sub">Surface stuurt deze berichten automatisch wanneer een klant niet reageert op de offerte</div>
        </div>
        <button className="btn btn-primary btn-sm">Alles opslaan</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Available variables */}
        <div style={{
          padding: 12,
          background: 'rgba(26,86,255,.05)',
          border: '1px solid rgba(26,86,255,.15)',
          borderRadius: 10,
          marginBottom: 18,
        }}>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
            <strong style={{ fontSize: 12 }}>Variabelen die je kunt gebruiken</strong>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {[
              { v: '{voornaam}',     d: 'Voornaam klant' },
              { v: '{totaal}',       d: 'Totaalbedrag offerte' },
              { v: '{dienst}',       d: 'Diensten in offerte' },
              { v: '{geldig_tot}',   d: 'Vervaldatum offerte' },
              { v: '{bedrijf}',      d: 'Jouw bedrijfsnaam' },
              { v: '{m2}',           d: 'Oppervlakte' },
            ].map(t => (
              <span key={t.v} title={t.d} style={{
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                padding: '3px 7px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--primary)',
                cursor: 'help',
              }}>{t.v}</span>
            ))}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          {reminders.map((r, i) => (
            <ReminderCard
              key={i}
              index={i}
              reminder={r}
              onChange={(key, val) => update(i, key, val)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReminderCard({ index, reminder, onChange }) {
  const toneColor = {
    blue:  { bg: 'rgba(26,86,255,.10)',  fg: 'var(--primary)' },
    amber: { bg: 'rgba(245,158,11,.14)', fg: '#B45309' },
    red:   { bg: 'rgba(220,38,38,.10)',  fg: 'var(--danger)' },
  }[reminder.tone];

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div className="row" style={{ padding: '14px 16px', gap: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: 12,
          background: toneColor.bg,
          color: toneColor.fg,
          display: 'grid', placeItems: 'center',
          fontWeight: 800,
          fontSize: 17,
          flexShrink: 0,
        }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{reminder.label}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{reminder.sub}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Na</span>
          <input
            className="input tabular"
            value={reminder.dag}
            onChange={e => onChange('dag', e.target.value)}
            style={{ width: 60, textAlign: 'center' }}
          />
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>dagen</span>
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16, alignItems: 'start' }}>
        {/* Editor */}
        <div className="field">
          <label className="field-label">Berichttekst</label>
          <textarea
            className="textarea"
            value={reminder.tekst}
            onChange={e => onChange('tekst', e.target.value)}
            style={{ minHeight: 130, fontSize: 13, lineHeight: 1.55, fontFamily: 'var(--font-body)' }}
          />
          <div className="row between" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {reminder.tekst.length} tekens · {reminder.tekst.split(/\s+/).filter(Boolean).length} woorden
            </span>
            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px', fontSize: 11 }}>
              <Icon name="sparkle" size={12} /> Surface-suggestie
            </button>
          </div>
        </div>

        {/* WhatsApp preview */}
        <div>
          <label className="field-label" style={{ marginBottom: 6, display: 'block' }}>Voorbeeld</label>
          <div style={{
            background: '#ECE5DD',
            borderRadius: 10,
            padding: 12,
            minHeight: 130,
          }}>
            <div style={{
              background: '#D9FDD3',
              borderRadius: 8,
              borderTopRightRadius: 2,
              padding: '7px 10px 6px',
              fontSize: 12.5,
              lineHeight: 1.4,
              color: '#111B21',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
              maxWidth: '100%',
            }}>
              {previewWithVariables(reminder.tekst)}
              <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: 3 }}>
                09:14 <span style={{ color: '#53BDEB' }}>✓✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function previewWithVariables(text) {
  const replacements = {
    '{voornaam}':   'Jeroen',
    '{totaal}':     '1.659,85',
    '{dienst}':     'invegen + beschermlaag',
    '{geldig_tot}': '27 mei',
    '{bedrijf}':    'Schoon Straatje',
    '{m2}':         '145m²',
  };
  return Object.entries(replacements).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    text
  );
}

// ── Openingsbericht (Meta WhatsApp template) ──────────────────────
function SettingsOpening() {
  const defaults = {
    oprit: "Hoi {voornaam} 👋\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte op maat voor het reinigen en opnieuw invegen van je {hoofddienst}.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
    onkruid: "Hoi {voornaam} 👋\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam} — ik help je snel aan een passende offerte voor onkruidbeheersing op jullie locatie.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
  };

  const [active, setActive] = useStateAG('oprit');
  const [templates, setTemplates] = useStateAG(defaults);
  const [showTimerSettings, setShowTimerSettings] = useStateAG(false);

  const cur = templates[active];

  return (
    <div className="col">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Openingsbericht via WhatsApp</div>
            <div className="card-sub">Het eerste bericht dat Surface stuurt zodra een lead binnenkomt — Meta-template</div>
          </div>
          <button className="btn btn-primary btn-sm">Wijzigingen opslaan</button>
        </div>

        {/* Meta-status banner */}
        <div style={{
          margin: 16,
          padding: 14,
          background: 'rgba(245,158,11,.06)',
          border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 10,
          display: 'flex',
          gap: 12,
        }}>
          <Icon name="flame" size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--fg)' }}>Let op:</strong> Meta keurt elke wijziging handmatig goed (kan 24-48u duren).
            Zolang Meta de nieuwe versie nog niet heeft goedgekeurd blijft de oude versie actief.
            Variabelen zoals <span className="mono" style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: 4 }}>{'{voornaam}'}</span> moeten <strong>exact</strong> overeenkomen met de template-parameters bij Meta.
          </div>
        </div>

        {/* Tab between hoofddiensten */}
        <div className="tabs" style={{ padding: '0 16px' }}>
          {[
            { k: 'oprit',   l: 'Oprit / Terras' },
            { k: 'onkruid', l: 'Onkruidbeheersing' },
          ].map(t => (
            <button key={t.k} className={`tab ${active === t.k ? 'active' : ''}`} onClick={() => setActive(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
          {/* Editor */}
          <div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">Template-tekst</label>
              <textarea
                className="textarea"
                value={cur}
                onChange={e => setTemplates(t => ({ ...t, [active]: e.target.value }))}
                style={{ minHeight: 180, fontSize: 13.5, lineHeight: 1.55, fontFamily: 'var(--font-body)' }}
              />
              <div className="row between" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  {cur.length}/1024 tekens · {cur.split(/\s+/).filter(Boolean).length} woorden
                </span>
                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => setTemplates(t => ({ ...t, [active]: defaults[active] }))}>
                  <Icon name="x" size={11} /> Herstellen naar standaard
                </button>
              </div>
            </div>

            {/* Variables panel */}
            <div style={{
              padding: 12,
              background: 'rgba(26,86,255,.05)',
              border: '1px solid rgba(26,86,255,.15)',
              borderRadius: 10,
            }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: 12 }}>Beschikbare variabelen</strong>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>(klik om in te voegen)</span>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {[
                  { v: '{voornaam}',   d: 'Voornaam klant' },
                  { v: '{naam}',       d: 'Volledige naam' },
                  { v: '{bedrijf}',    d: 'Jouw bedrijfsnaam' },
                  { v: '{bot_naam}',   d: 'Chatbot-naam (bv. Surface)' },
                  { v: '{m2}',         d: 'Oppervlakte van aanvraag' },
                  { v: '{hoofddienst}', d: 'Bv. oprit, terras' },
                  { v: '{plaats}',     d: 'Plaats klant' },
                ].map(t => (
                  <button
                    key={t.v}
                    title={t.d}
                    onClick={() => setTemplates(prev => ({ ...prev, [active]: prev[active] + t.v }))}
                    style={{
                      fontSize: 11,
                      fontFamily: 'ui-monospace, monospace',
                      padding: '4px 8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >{t.v}</button>
                ))}
              </div>
            </div>

            {/* Send timing */}
            <div style={{ marginTop: 14, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Verzendinstellingen</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Hoe snel reageert Surface na een nieuwe lead?</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowTimerSettings(s => !s)}>
                  {showTimerSettings ? 'Verbergen' : 'Tonen'}
                </button>
              </div>
              {showTimerSettings && (
                <div className="col" style={{ gap: 10, marginTop: 6 }}>
                  <div className="row between">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Reactietijd</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Vertraging na binnenkomst lead (0 = instant)</div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input tabular" defaultValue="45" style={{ width: 60, textAlign: 'center' }} />
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>sec.</span>
                    </div>
                  </div>
                  <div className="row between">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Verzendvenster</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Verstuur alleen tussen deze tijden</div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input tabular" defaultValue="07:00" style={{ width: 70, textAlign: 'center' }} />
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>—</span>
                      <input className="input tabular" defaultValue="22:00" style={{ width: 70, textAlign: 'center' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp preview */}
          <div>
            <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>Voorbeeld</label>
            <div style={{
              background: '#ECE5DD',
              borderRadius: 14,
              padding: 14,
              minHeight: 280,
            }}>
              {/* Day pill */}
              <div style={{
                alignSelf: 'center',
                display: 'block',
                width: 'fit-content',
                margin: '0 auto 12px',
                fontSize: 10.5, fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 8,
                background: 'rgba(225,245,254,0.95)',
                color: '#54656F',
                textAlign: 'center',
              }}>
                Vandaag
              </div>

              {/* Bot message */}
              <div style={{
                background: '#D9FDD3',
                borderRadius: 8,
                borderTopRightRadius: 2,
                padding: '7px 10px 7px',
                fontSize: 12.5,
                lineHeight: 1.4,
                color: '#111B21',
                whiteSpace: 'pre-wrap',
                boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
                marginLeft: 'auto',
                maxWidth: '90%',
                width: 'fit-content',
              }}>
                {previewOpening(cur)}
                <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginTop: 4 }}>
                  09:14 <span style={{ color: '#53BDEB' }}>✓✓</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              <Icon name="bot" size={12} style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--primary)' }} />
              Surface stuurt dit bericht binnen 60 sec. na een nieuwe lead.
            </div>
          </div>
        </div>
      </div>

      {/* Meta sync status */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Meta sync-status</div>
            <div className="card-sub">Goedkeuringen door WhatsApp Business</div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {[
            { name: 'lead_intake_oprit',   v: 'v3', status: 'Goedgekeurd', tone: 'green', date: '2 weken geleden' },
            { name: 'lead_intake_onkruid', v: 'v1', status: 'Goedgekeurd', tone: 'green', date: '1 maand geleden' },
            { name: 'lead_intake_oprit',   v: 'v4 (concept)', status: 'In review bij Meta', tone: 'amber', date: 'verstuurd 6u geleden' },
          ].map((t, i) => (
            <div key={i} className="row between" style={{ padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</span>
                  <Pill tone="gray" sm>{t.v}</Pill>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{t.date}</div>
              </div>
              <Pill tone={t.tone}>{t.status}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function previewOpening(text) {
  const replacements = {
    '{voornaam}':   'Jeroen',
    '{naam}':       'Jeroen de Vries',
    '{bedrijf}':    'Schoon Straatje',
    '{bot_naam}':   'Surface',
    '{m2}':         '145',
    '{hoofddienst}': 'oprit',
    '{plaats}':     'Delft',
  };
  return Object.entries(replacements).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    text
  );
}

function SettingsNotif() {
  const cats = [
    { k: 'new_lead',    l: 'Nieuwe lead binnen',        sub: 'Iemand vult het formulier in', def: { app: true, email: true, push: true, sms: false } },
    { k: 'review_req',  l: 'Owner-review nodig',         sub: 'Surface wacht op jouw goedkeuring', def: { app: true, email: false, push: true, sms: true } },
    { k: 'discount',    l: 'Klant vraagt korting',       sub: 'Onderhandelingsmoment', def: { app: true, email: false, push: true, sms: false } },
    { k: 'quote_ok',    l: 'Offerte goedgekeurd',        sub: 'Klant gaat akkoord', def: { app: true, email: true, push: true, sms: false } },
    { k: 'quote_no',    l: 'Offerte afgewezen',          sub: 'Klant haakt af', def: { app: true, email: true, push: false, sms: false } },
    { k: 'appt',        l: 'Afspraak ingepland',         sub: 'Klant kiest een datum', def: { app: true, email: true, push: true, sms: false } },
    { k: 'review_in',   l: 'Nieuwe review ontvangen',    sub: 'Klant scoort de klus', def: { app: true, email: true, push: false, sms: false } },
    { k: 'daily',       l: 'Dagelijkse samenvatting',    sub: 'Elke ochtend 08:00 — wat ging er gisteren', def: { app: false, email: true, push: false, sms: false } },
  ];
  const [prefs, setPrefs] = useStateAG(() => Object.fromEntries(cats.map(c => [c.k, c.def])));
  const toggle = (cat, ch) => setPrefs(p => ({ ...p, [cat]: { ...p[cat], [ch]: !p[cat][ch] } }));

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Notificatie-voorkeuren</div>
          <div className="card-sub">Per type event kies je welke kanalen je gebruikt</div>
        </div>
        <button className="btn btn-primary btn-sm">Opslaan</button>
      </div>

      {/* Channel info bar */}
      <div className="row" style={{ padding: '10px 18px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', gap: 14, fontSize: 12 }}>
        {[
          { i: 'sparkle', l: 'In-app',  ch: 'app',   v: '— altijd zichtbaar in de bell' },
          { i: 'mail',    l: 'E-mail',  ch: 'email', v: 'christiaan@frontlix.com' },
          { i: 'phone',   l: 'Push',    ch: 'push',  v: 'Mobile app (Pro)' },
          { i: 'phone',   l: 'SMS',     ch: 'sms',   v: '+31 6 24965270 (€0,05 per bericht)' },
        ].map(c => (
          <div key={c.ch} className="row" style={{ gap: 6, color: 'var(--fg-muted)' }}>
            <Icon name={c.i} size={13} style={{ color: 'var(--primary)' }} />
            <strong style={{ color: 'var(--fg)', fontSize: 12 }}>{c.l}</strong>
            <span style={{ fontSize: 11 }}>{c.v}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 70px)', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
          <span>Event</span>
          <span style={{ textAlign: 'center' }}>In-app</span>
          <span style={{ textAlign: 'center' }}>E-mail</span>
          <span style={{ textAlign: 'center' }}>Push</span>
          <span style={{ textAlign: 'center' }}>SMS</span>
        </div>
        {cats.map(c => (
          <div key={c.k} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 70px)', padding: '12px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.l}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.sub}</div>
            </div>
            {['app', 'email', 'push', 'sms'].map(ch => (
              <div key={ch} style={{ display: 'grid', placeItems: 'center' }}>
                <Toggle on={prefs[c.k][ch]} onChange={() => toggle(c.k, ch)} />
              </div>
            ))}
          </div>
        ))}

        <div style={{ padding: 14, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          <Icon name="sparkle" size={13} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--primary)' }} />
          <strong style={{ color: 'var(--fg-soft)' }}>Stil-uren:</strong> 22:00 — 07:00 stuurt Surface alleen <em>urgente</em> notificaties (korting-verzoeken, akkoorden &gt; €1.000). Aanpassen via <a style={{ color: 'var(--primary)' }}>geavanceerde voorkeuren →</a>
        </div>
      </div>
    </div>
  );
}

function SettingsTags() {
  const presetColors = [
    { name: 'Blauw',    bg: 'rgba(26,86,255,.10)',  fg: '#1A56FF' },
    { name: 'Groen',    bg: 'rgba(22,163,74,.12)',  fg: '#16A34A' },
    { name: 'Amber',    bg: 'rgba(245,158,11,.14)', fg: '#B45309' },
    { name: 'Rood',     bg: 'rgba(220,38,38,.10)',  fg: '#DC2626' },
    { name: 'Paars',    bg: 'rgba(168,85,247,.12)', fg: '#7E22CE' },
    { name: 'Cyaan',    bg: 'rgba(0,207,255,.14)',  fg: '#0891B2' },
    { name: 'Grijs',    bg: 'var(--surface-2)',     fg: 'var(--fg-muted)' },
  ];

  const [tags, setTags] = useStateAG([
    { id: 1, label: 'Particulier',       color: 6, count: 14, system: true },
    { id: 2, label: 'Zakelijk',          color: 0, count: 3,  system: true },
    { id: 3, label: 'Repeat',            color: 1, count: 2,  system: false },
    { id: 4, label: '⚠️ Korting',         color: 2, count: 1,  system: true },
    { id: 5, label: '📍 Buiten radius',    color: 3, count: 1,  system: true },
    { id: 6, label: '⭐ Review',          color: 4, count: 1,  system: false },
    { id: 7, label: 'VIP-klant',         color: 5, count: 0,  system: false },
  ]);
  const [adding, setAdding] = useStateAG(false);
  const [newLabel, setNewLabel] = useStateAG('');
  const [newColor, setNewColor] = useStateAG(0);

  const addTag = () => {
    if (!newLabel.trim()) return;
    setTags(t => [...t, { id: Date.now(), label: newLabel.trim(), color: newColor, count: 0, system: false }]);
    setNewLabel('');
    setAdding(false);
  };

  const removeTag = id => setTags(t => t.filter(x => x.id !== id));

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Tags</div>
          <div className="card-sub">Categoriseer leads in je eigen woorden — gebruik in filters en zoekopdrachten</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}>
          <Icon name="plus" size={12} /> Nieuwe tag
        </button>
      </div>

      {adding && (
        <div style={{
          padding: 16,
          background: 'rgba(26,86,255,.04)',
          borderBottom: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 10,
          alignItems: 'center',
        }}>
          <input
            className="input"
            placeholder="Bv. Spoed, Onderhoudscontract, Korting-aanvrager…"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            autoFocus
          />
          <div className="row" style={{ gap: 5 }}>
            {presetColors.map((c, i) => (
              <button key={i} onClick={() => setNewColor(i)} style={{
                width: 26, height: 26,
                borderRadius: '50%',
                background: c.bg,
                border: newColor === i ? `2px solid ${c.fg}` : '2px solid transparent',
                cursor: 'pointer',
                position: 'relative',
              }} title={c.name}>
                {newColor === i && <Icon name="check" size={12} stroke={3} style={{ color: c.fg }} />}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewLabel(''); }}>Annuleren</button>
            <button className="btn btn-primary btn-sm" onClick={addTag} disabled={!newLabel.trim()} style={{ opacity: newLabel.trim() ? 1 : 0.5 }}>Tag toevoegen</button>
          </div>
        </div>
      )}

      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {tags.map(t => {
            const c = presetColors[t.color];
            return (
              <div key={t.id} style={{
                padding: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  padding: '4px 12px',
                  background: c.bg,
                  color: c.fg,
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  maxWidth: '60%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{t.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    {t.count > 0 ? `${t.count} ${t.count === 1 ? 'lead' : 'leads'}` : 'nog niet gebruikt'}
                  </div>
                </div>
                {t.system ? (
                  <span title="Systeem-tag — kan niet verwijderd worden" style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-2)', color: 'var(--fg-muted)', borderRadius: 4, fontWeight: 700, letterSpacing: '0.04em' }}>SYS</span>
                ) : (
                  <button onClick={() => removeTag(t.id)} className="btn btn-ghost btn-sm" style={{ padding: 4 }} title="Verwijderen">
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 14,
          padding: 12,
          background: 'rgba(26,86,255,.05)',
          border: '1px solid rgba(26,86,255,.15)',
          borderRadius: 9,
          fontSize: 12,
          color: 'var(--fg-soft)',
          lineHeight: 1.5,
        }}>
          <Icon name="sparkle" size={13} style={{ color: 'var(--primary)', verticalAlign: '-2px', marginRight: 6 }} />
          <strong style={{ color: 'var(--fg)' }}>Systeem-tags</strong> (⚠️ Korting, 📍 Buiten radius, etc.) worden automatisch door Surface gezet op basis van bot-detectie en kunnen niet verwijderd worden — wel hernoemen of kleur aanpassen.
        </div>
      </div>
    </div>
  );
}

function SettingsTeam() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Team</div>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={12} /> Lid uitnodigen</button>
      </div>
      <div style={{ padding: 12 }}>
        {[
          { name: 'Christiaan Tromp', email: 'christiaan@frontlix.com', role: 'Owner',  tint: 1 },
          { name: 'Georg Tromp',      email: 'georg@frontlix.com',     role: 'Admin',  tint: 2 },
          { name: 'Lisa Vermeer',     email: 'lisa@schoonstraatje.nl', role: 'Member', tint: 3 },
        ].map((m, i) => (
          <div key={i} className="row" style={{ padding: 12, gap: 12, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <Avatar name={m.name} tint={m.tint} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{m.email}</div>
            </div>
            <Pill tone={m.role === 'Owner' ? 'blue' : m.role === 'Admin' ? 'amber' : 'gray'}>{m.role}</Pill>
            <button className="btn btn-ghost btn-sm"><Icon name="chevron-down" size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange && onChange(!on)}
      style={{
        width: 40, height: 22,
        borderRadius: 9999,
        background: on ? 'var(--gradient)' : 'var(--surface-2)',
        border: 'none',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        top: 3,
        left: on ? 21 : 3,
        transition: 'left 0.2s cubic-bezier(.16,1,.3,1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function ToggleRow({ title, sub, defaultOn }) {
  const [on, setOn] = useStateAG(!!defaultOn);
  return (
    <div className="row between" style={{ padding: 14, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={setOn} />
    </div>
  );
}

Object.assign(window, { Agenda, Instellingen });
