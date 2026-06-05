// src/screens/Mobile.jsx
// Mobile veldwerk view — iOS phone frame with field-worker focused UI

const { useState: useStateMB } = React;

function MobileScreen({ navigate }) {
  const [phase, setPhase] = useStateMB('onderweg'); // onderweg | aangekomen | bezig | klaar
  const lead = LEADS.find(l => l.id === 'L-2085'); // Marieke — vandaag's afspraak

  return (
    <div className="content-inner" style={{ background: 'var(--surface)', minHeight: 'calc(100vh - 60px)' }}>
      <div className="section-head">
        <div>
          <div className="section-title">Veldwerk-modus</div>
          <div className="section-sub">
            Hoe Schoon Straatje's medewerkers de app op locatie gebruiken — grote knoppen, 1-hand-bediening, offline-first
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Pill tone="green" dot>Live preview</Pill>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(300px, 1fr)',
        gap: 32,
        alignItems: 'start',
        paddingTop: 16,
      }}>
        <div style={{ transform: 'scale(0.92)', transformOrigin: 'top left', marginRight: -32 }}>
          <IOSDevice width={402} height={874} title="">
            <MobileLead lead={lead} phase={phase} setPhase={setPhase} />
          </IOSDevice>
        </div>

        <div className="col" style={{ paddingTop: 12 }}>
          <div className="card card-pad">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Probeer het uit
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Werkflow doorlopen
            </div>
            <div className="col" style={{ gap: 6 }}>
              {[
                { k: 'onderweg',   l: 'Onderweg' },
                { k: 'aangekomen', l: 'Aangekomen' },
                { k: 'bezig',      l: 'Aan het werk' },
                { k: 'klaar',      l: 'Klaar — overhandiging' },
              ].map(s => (
                <button
                  key={s.k}
                  onClick={() => setPhase(s.k)}
                  style={{
                    padding: '10px 12px',
                    background: phase === s.k ? 'var(--card-hover-bg)' : 'var(--surface)',
                    color: phase === s.k ? 'var(--primary)' : 'var(--fg-soft)',
                    border: '1px solid',
                    borderColor: phase === s.k ? 'rgba(26,86,255,.3)' : 'var(--border)',
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  {phase === s.k && '→ '}{s.l}
                </button>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Waarom dit werkt
            </div>
            <div className="col" style={{ gap: 10, fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.5 }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 16 }}>1.</span>
                <span><strong>Eén focuslead per scherm.</strong> Geen multi-tasking onderweg.</span>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 16 }}>2.</span>
                <span><strong>56px hit-targets.</strong> Met natte/vieze handen bedienbaar.</span>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 16 }}>3.</span>
                <span><strong>Status-knop is altijd in beeld.</strong> Eén tik → bericht naar kantoor + klant.</span>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 16 }}>4.</span>
                <span><strong>Foto's direct in lead.</strong> Synct automatisch wanneer er weer signaal is.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLead({ lead, phase, setPhase }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.04)', display: 'grid', placeItems: 'center', color: '#1A1A1A',
        }}>
          <Icon name="chevron-right" size={18} stroke={2.2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Vandaag's klus</div>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.04)', display: 'grid', placeItems: 'center', color: '#1A1A1A',
        }}>
          <Icon name="phone" size={17} stroke={2.2} />
        </button>
      </div>

      {/* Klant card */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: 'white',
          borderRadius: 18,
          padding: 16,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar name={lead.naam} tint={3} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#000' }}>{lead.naam}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 1 }}>{lead.adres}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{
              flex: 1,
              padding: '12px 14px',
              background: '#1A56FF',
              color: 'white',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
              <Icon name="mappin" size={15} stroke={2.2} /> Navigatie
            </button>
            <button style={{
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.05)',
              color: '#1A1A1A',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Icon name="whatsapp" size={15} stroke={2.2} /> Chat
            </button>
          </div>
        </div>
      </div>

      {/* Job specs grid */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'white',
          borderRadius: 18,
          overflow: 'hidden',
        }}>
          {[
            { icon: 'square',   label: 'Oppervlakte', value: `${lead.m2} m²` },
            { icon: 'list',     label: 'Werk',        value: lead.sub.map(s => DIENST_LABELS[s]).join(' + ') },
            { icon: 'flame',    label: 'Bijzonderheden', value: lead.korstmos === 'ja' ? 'Korstmos · Groene aanslag' : lead.groene_aanslag === 'ja' ? 'Groene aanslag aanwezig' : 'Geen' },
            { icon: 'euro',     label: 'Offertewaarde', value: fmtEur(lead.totaal_prijs) },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(26,86,255,.10)', color: '#1A56FF',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={r.icon} size={15} stroke={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#999' }}>{r.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#000', marginTop: 1 }}>{r.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{
          background: 'white',
          borderRadius: 18,
          padding: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Voortgang
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
            {[
              { k: 'onderweg',   l: 'Onderweg',   color: '#1A56FF' },
              { k: 'aangekomen', l: 'Op locatie', color: '#00CFFF' },
              { k: 'bezig',      l: 'Werkend',    color: '#F59E0B' },
              { k: 'klaar',      l: 'Klaar',      color: '#16A34A' },
            ].map((s, i, arr) => {
              const phases = ['onderweg', 'aangekomen', 'bezig', 'klaar'];
              const cur = phases.indexOf(phase);
              const active = i <= cur;
              return (
                <React.Fragment key={s.k}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 0 }}>
                    <div style={{
                      width: 28, height: 28,
                      borderRadius: '50%',
                      background: active ? s.color : '#E5E7EB',
                      color: 'white',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 700, fontSize: 12,
                      transition: 'all 0.3s',
                    }}>
                      {active && i < cur ? <Icon name="check" size={14} stroke={3} /> : i + 1}
                    </div>
                    <div style={{ fontSize: 10, color: active ? '#1A1A1A' : '#999', marginTop: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {s.l}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: 2,
                      background: i < cur ? s.color : '#E5E7EB',
                      marginTop: -19,
                      transition: 'background 0.3s',
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Primary action button */}
          <PhaseAction phase={phase} setPhase={setPhase} />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '14px 16px 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button style={mobileQuickBtn()}>
            <Icon name="image" size={20} stroke={2} style={{ color: '#1A56FF' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>Foto's maken</span>
          </button>
          <button style={mobileQuickBtn()}>
            <Icon name="sticky" size={20} stroke={2} style={{ color: '#1A56FF' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>Notitie</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function mobileQuickBtn() {
  return {
    padding: '18px 12px',
    background: 'white',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  };
}

function PhaseAction({ phase, setPhase }) {
  const cfg = {
    onderweg:   { label: 'Ik ben aangekomen',   next: 'aangekomen', color: 'linear-gradient(135deg, #1A56FF, #00CFFF)' },
    aangekomen: { label: 'Begin met werken',    next: 'bezig',      color: 'linear-gradient(135deg, #F59E0B, #FB923C)' },
    bezig:      { label: 'Werk klaar — checken', next: 'klaar',     color: 'linear-gradient(135deg, #16A34A, #22C55E)' },
    klaar:      { label: '✓ Overhandiging compleet', next: 'klaar', color: 'linear-gradient(135deg, #16A34A, #22C55E)', done: true },
  };
  const c = cfg[phase];
  return (
    <button
      onClick={() => !c.done && setPhase(c.next)}
      style={{
        width: '100%',
        padding: '18px 16px',
        background: c.color,
        color: 'white',
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 17,
        boxShadow: '0 4px 16px rgba(26,86,255,.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {c.label}
      {!c.done && <Icon name="arrow-right" size={18} stroke={2.5} />}
    </button>
  );
}

window.MobileScreen = MobileScreen;
