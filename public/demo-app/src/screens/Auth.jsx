// src/screens/Auth.jsx
// Login / Signup / Wachtwoord vergeten — gates the dashboard.
// Beautiful Frontlix-branded auth flow.

const { useState: useStateAuth, useEffect: useEffectAuth } = React;

function Auth({ onAuth }) {
  const [view, setView] = useStateAuth('login'); // login | signup | forgot
  const [loading, setLoading] = useStateAuth(false);
  const [error, setError] = useStateAuth('');

  const submit = (e) => {
    e?.preventDefault?.();
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (view === 'forgot') {
        setError(''); setView('login');
        alert('Verstuurd! Check je inbox voor een reset-link.');
      } else {
        onAuth({
          name: view === 'signup' ? 'Nieuwe Gebruiker' : 'Christiaan Tromp',
          email: 'christiaan@frontlix.com',
          bedrijf: 'Schoon Straatje',
        });
      }
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* ── Left: form ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 56px',
        overflow: 'auto',
      }}>
        {/* Brand */}
        <div className="row" style={{ gap: 10, marginBottom: 'auto' }}>
          <img src="assets/frontlix-logo.png" alt="" style={{ width: 38, height: 38 }} />
          <div>
            <div style={{ font: '800 18px var(--font-heading)', letterSpacing: '-0.02em' }}>
              Frontl<span className="gradient-text">ix</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Dashboard</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 380, width: '100%', alignSelf: 'center', margin: '60px auto auto' }}>
          {view === 'login' && (
            <form onSubmit={submit}>
              <h1 style={{ font: '900 32px var(--font-heading)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
                Welkom terug.
              </h1>
              <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 32, lineHeight: 1.5 }}>
                Log in om je leads, gesprekken en offertes van vandaag te bekijken.
              </p>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">E-mail</label>
                <input className="input" type="email" defaultValue="christiaan@schoonstraatje.nl" placeholder="jij@bedrijf.nl" autoFocus />
              </div>

              <div className="field" style={{ marginBottom: 8 }}>
                <div className="row between">
                  <label className="field-label">Wachtwoord</label>
                  <button type="button" onClick={() => setView('forgot')}
                    style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, background: 'none' }}>
                    Vergeten?
                  </button>
                </div>
                <input className="input" type="password" defaultValue="••••••••••" placeholder="Minimaal 8 tekens" />
              </div>

              <label className="row" style={{ gap: 8, marginTop: 18, marginBottom: 24, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 12, color: 'var(--fg-soft)' }}>30 dagen ingelogd blijven op dit apparaat</span>
              </label>

              {error && <ErrorMsg text={error} />}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', padding: '14px 20px', marginBottom: 14, fontSize: 14, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Bezig...' : 'Inloggen'}
                {!loading && <Icon name="arrow-right" size={14} />}
              </button>

              <div className="row" style={{ gap: 12, alignItems: 'center', margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>of</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button type="button" className="btn btn-secondary"
                style={{ width: '100%', padding: '12px 20px', marginBottom: 24, fontSize: 13 }}
              >
                <GoogleLogo /> Inloggen met Google
              </button>

              <div style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
                Geen account?{' '}
                <button type="button" onClick={() => setView('signup')}
                  style={{ color: 'var(--primary)', fontWeight: 600, background: 'none' }}>
                  Account aanmaken →
                </button>
              </div>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={submit}>
              <h1 style={{ font: '900 32px var(--font-heading)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
                Account aanmaken.
              </h1>
              <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 32, lineHeight: 1.5 }}>
                Aan de slag in 8 minuten — daarna stuurt Surface automatisch reacties op je leads.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="field">
                  <label className="field-label">Voornaam</label>
                  <input className="input" placeholder="Jan" autoFocus />
                </div>
                <div className="field">
                  <label className="field-label">Achternaam</label>
                  <input className="input" placeholder="de Jong" />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">Bedrijfsnaam</label>
                <input className="input" placeholder="Bv. Schoon Straatje" />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">Werk-e-mail</label>
                <input className="input" type="email" placeholder="jij@bedrijf.nl" />
              </div>

              <div className="field" style={{ marginBottom: 18 }}>
                <label className="field-label">Wachtwoord</label>
                <input className="input" type="password" placeholder="Minimaal 8 tekens" />
                <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i < 2 ? 'var(--primary)' : 'var(--surface-2)',
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                  Gebruik minstens 1 cijfer en 1 hoofdletter voor extra veiligheid
                </div>
              </div>

              <label className="row" style={{ gap: 8, marginBottom: 18, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} defaultChecked />
                <span style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5 }}>
                  Ik ga akkoord met de{' '}
                  <a style={{ color: 'var(--primary)', fontWeight: 600 }}>algemene voorwaarden</a> en{' '}
                  <a style={{ color: 'var(--primary)', fontWeight: 600 }}>privacy policy</a>
                </span>
              </label>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                style={{ width: '100%', padding: '14px 20px', marginBottom: 14, fontSize: 14, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Account aanmaken...' : '14 dagen gratis proberen'}
                {!loading && <Icon name="arrow-right" size={14} />}
              </button>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 24 }}>
                Geen creditcard nodig · stop wanneer je wil
              </div>

              <div style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
                Heb je al een account?{' '}
                <button type="button" onClick={() => setView('login')}
                  style={{ color: 'var(--primary)', fontWeight: 600, background: 'none' }}>
                  Inloggen
                </button>
              </div>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={submit}>
              <button type="button" onClick={() => setView('login')}
                style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20, background: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                ← Terug naar inloggen
              </button>

              <h1 style={{ font: '900 32px var(--font-heading)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
                Wachtwoord vergeten?
              </h1>
              <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 32, lineHeight: 1.5 }}>
                Geen zorgen. Vul je e-mail in, dan sturen we je een reset-link.
              </p>

              <div className="field" style={{ marginBottom: 24 }}>
                <label className="field-label">E-mail</label>
                <input className="input" type="email" placeholder="jij@bedrijf.nl" autoFocus />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                style={{ width: '100%', padding: '14px 20px', fontSize: 14, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Versturen...' : 'Stuur reset-link'}
                {!loading && <Icon name="mail" size={14} />}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="row between" style={{ marginTop: 'auto', paddingTop: 32, fontSize: 11, color: 'var(--fg-muted)' }}>
          <span>© 2026 Frontlix B.V. · Den Haag, NL</span>
          <div className="row" style={{ gap: 16 }}>
            <a>Privacy</a>
            <a>Voorwaarden</a>
            <a>Help</a>
          </div>
        </div>
      </div>

      {/* ── Right: marketing visual ────────────────────────────── */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0B1530 0%, #1A56FF 50%, #00CFFF 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 56,
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 70%)',
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '20%', right: '15%',
          width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(0,207,255,0.6) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '10%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(26,86,255,0.5) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', maxWidth: 460, color: 'white' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 9999,
            fontSize: 12, fontWeight: 600,
            marginBottom: 28,
            letterSpacing: '0.02em',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 4px rgba(34,197,94,0.25)' }} />
            14 nieuwe leads vandaag · 8 offertes verstuurd
          </div>

          <h2 style={{
            font: '900 44px var(--font-heading)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 24,
          }}>
            Jij bent aan het werk.<br />
            <span style={{ color: '#A5D8FF' }}>Jouw leads worden al opgevolgd.</span>
          </h2>

          <p style={{
            fontSize: 17, lineHeight: 1.5,
            opacity: 0.85,
            marginBottom: 40,
          }}>
            Surface beantwoordt elke nieuwe aanvraag binnen 60 seconden via WhatsApp — verzamelt de info, stuurt een offerte, en plant de afspraak. Jij ziet alles hier samenkomen.
          </p>

          {/* Mini metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Reactietijd', value: '47s', sub: 'gem. 2 weken' },
              { label: 'Conversie', value: '64%', sub: '+8 pt' },
              { label: 'Auto-deals', value: '89%', sub: 'zonder hulp' },
            ].map((m, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }} className="tabular">{m.value}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Customer logos / quote */}
          <div style={{
            padding: 20,
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
          }}>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' }}>
              "Voorheen reageerde ik 's avonds nog op aanvragen tussen het koken door. Nu pakt Surface het op en mijn conversie ging van 38% naar 67%."
            </div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700,
              }}>PvH</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Pieter van Hove</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Eigenaar Schoon Straatje</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small inline components ----------------------------------------------
function ErrorMsg({ text }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(220,38,38,0.08)',
      border: '1px solid rgba(220,38,38,0.2)',
      borderRadius: 9,
      color: 'var(--danger)',
      fontSize: 13,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <Icon name="x" size={14} />
      {text}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

window.Auth = Auth;
