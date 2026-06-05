// src/components/modals.jsx
// Modals & overlays: PDFPreview, NotificationPanel
// Globals attached at bottom.

const { useState: useStateMod, useEffect: useEffectMod } = React;

// ─────────────────────────────────────────────────────────────────
// PDFPreview — offerte-PDF rendered as A4 page in a modal
// ─────────────────────────────────────────────────────────────────
function PDFPreview({ lead, rules, totals, onClose }) {
  // Lock body scroll while open
  useEffectMod(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, []);

  const today = new Date('2026-05-13');
  const validTo = new Date(today);
  validTo.setDate(validTo.getDate() + 14);
  const offerteNr = `OF-${lead.id.replace('L-', '')}-${today.getFullYear()}`;

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
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 20,
          width: '100%',
          maxWidth: 1080,
          maxHeight: '92vh',
        }}
      >
        {/* PDF preview */}
        <div style={{
          background: 'white',
          color: '#1A1A1A',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}>
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#F4F6FA',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            color: '#1A1A1A',
            fontSize: 12,
          }}>
            <Icon name="file" size={14} />
            <span style={{ fontWeight: 600 }}>{offerteNr}.pdf</span>
            <span style={{ color: '#666' }}>· Concept · niet verstuurd</span>
            <div style={{ marginLeft: 'auto' }} className="seg">
              <button className="seg-btn active">100%</button>
              <button className="seg-btn">Pas in</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 36, background: '#E5E7EB' }}>
            <div style={{
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
              padding: '48px 56px',
              minHeight: 1180,
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              lineHeight: 1.5,
              color: '#1A1A1A',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#1A56FF' }}>Schoon Straatje</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4, lineHeight: 1.5 }}>
                    Achterweg 23 · 4521 CB Biervliet<br/>
                    info@schoonstraatje.nl · 06 — 30 31 32 51<br/>
                    KvK 87654321 · BTW NL004273829B01
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>OFFERTE</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4, lineHeight: 1.7 }}>
                    <div><strong style={{ color: '#1A1A1A' }}>Nummer:</strong> {offerteNr}</div>
                    <div><strong style={{ color: '#1A1A1A' }}>Datum:</strong> {today.toLocaleDateString('nl-NL')}</div>
                    <div><strong style={{ color: '#1A1A1A' }}>Geldig t/m:</strong> {validTo.toLocaleDateString('nl-NL')}</div>
                  </div>
                </div>
              </div>

              {/* Klant */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>
                  Voor
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{lead.naam}</div>
                <div style={{ color: '#444' }}>{lead.adres}</div>
                <div style={{ color: '#666', fontSize: 10 }}>{lead.email} · {lead.telefoon}</div>
              </div>

              {/* Project intro */}
              <div style={{ marginBottom: 28, fontSize: 11, lineHeight: 1.7 }}>
                Beste {lead.naam.split(' ')[0]},<br/><br/>
                Bedankt voor je interesse. Hierbij onze offerte voor het {lead.sub.includes('invegen') ? 'reinigen en opnieuw invegen' : 'behandelen'} van je oprit/terras van <strong>{lead.m2} m²</strong> in {lead.adres.split(',')[1]?.trim()}. We werken met professioneel materieel en goed opgeleide mensen — meer dan 1.200 klanten gingen je voor.
              </div>

              {/* Rules table */}
              <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 20,
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 70px 80px',
                  padding: '10px 14px',
                  background: '#F4F6FA',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#555',
                  borderBottom: '1px solid #E5E7EB',
                }}>
                  <div>Omschrijving</div>
                  <div style={{ textAlign: 'right' }}>Aantal</div>
                  <div style={{ textAlign: 'right' }}>Prijs</div>
                  <div style={{ textAlign: 'right' }}>Totaal</div>
                </div>
                {rules.map((r, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 70px 80px',
                    padding: '10px 14px',
                    borderBottom: i < rules.length - 1 ? '1px solid #F0F0F0' : 'none',
                    fontSize: 10.5,
                  }}>
                    <div>{r.desc}</div>
                    <div style={{ textAlign: 'right' }}>{r.aantal} {r.eenheid}</div>
                    <div style={{ textAlign: 'right' }}>€ {r.prijs.toFixed(2)}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>€ {r.totaal.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10.5 }}>
                    <span>Subtotaal</span>
                    <span>€ {totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.korstmosToeslag > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10.5 }}>
                      <span>Korstmos toeslag (10%)</span>
                      <span>€ {totals.korstmosToeslag.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.kortingBedrag > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10.5, color: '#16A34A' }}>
                      <span>Korting ({totals.discount}%)</span>
                      <span>– € {totals.kortingBedrag.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #E5E7EB', marginTop: 4, fontSize: 11, fontWeight: 600 }}>
                    <span>Totaal excl. BTW</span>
                    <span>€ {totals.total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10, color: '#666' }}>
                    <span>BTW 21%</span>
                    <span>€ {totals.btw.toFixed(2)}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: '#1A56FF',
                    color: 'white',
                    borderRadius: 8,
                    marginTop: 8,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Totaal incl. BTW</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>€ {(totals.total + totals.btw).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 40, fontSize: 9, color: '#666', lineHeight: 1.6 }}>
                <strong style={{ color: '#1A1A1A' }}>Werkwijze:</strong> Wij reinigen het oppervlak hogedruk, schermen planten af waar nodig, en vegen na droging het voegzand in. Tijdsindicatie: 1 werkdag voor jouw oppervlakte. Bij regen schuiven we op in overleg.<br/><br/>
                <strong style={{ color: '#1A1A1A' }}>Akkoord:</strong> Geef akkoord door deze offerte te bevestigen via WhatsApp of via de link in onze e-mail. Daarna stuur je je gewenste werkdag door — wij bevestigen binnen 24u.<br/><br/>
                Met vriendelijke groet,<br/>
                Pieter van Hove · Schoon Straatje
              </div>
            </div>
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="col" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Offerte controle</div>
            </div>
            <div className="col" style={{ padding: 14, gap: 10 }}>
              <Check ok label="Alle pricing-regels berekend" />
              <Check ok label="Klant-info compleet" />
              <Check ok label="Foto's bevestigd recent" />
              <Check warn label="Korstmos-toeslag toegepast (10%)" />
              <Check ok label="Adres binnen reisradius" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Versturen via</div>
            </div>
            <div className="col" style={{ padding: 14, gap: 8 }}>
              <button className="btn btn-primary" style={{ justifyContent: 'flex-start', padding: '12px 14px' }}>
                <Icon name="whatsapp" size={14} /> WhatsApp + PDF
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '12px 14px' }}>
                <Icon name="mail" size={14} /> E-mail
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '12px 14px' }}>
                <Icon name="file" size={14} /> Download PDF
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Geldigheid</div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 13 }}>
                Geldig tot <strong>{validTo.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                Reminders verstuurd na 2, 5 en 8 dagen geen reactie.
              </div>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={onClose}>
            <Icon name="x" size={14} /> Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({ ok, warn, label }) {
  const color = warn ? '#B45309' : ok ? 'var(--success)' : 'var(--fg-muted)';
  const bg = warn ? 'rgba(245,158,11,.12)' : ok ? 'rgba(22,163,74,.10)' : 'var(--surface-2)';
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{
        width: 22, height: 22,
        borderRadius: '50%',
        background: bg,
        color,
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        <Icon name={warn ? 'flame' : 'check'} size={12} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Notification panel — dropdown from bell icon
// ─────────────────────────────────────────────────────────────────
function NotificationPanel({ navigate, onClose }) {
  // Close on outside click
  useEffectMod(() => {
    const onClick = e => {
      if (!e.target.closest('.notif-panel') && !e.target.closest('.notif-trigger')) onClose();
    };
    setTimeout(() => document.addEventListener('click', onClick), 50);
    return () => document.removeEventListener('click', onClick);
  }, [onClose]);

  const notifs = [
    { id: 1, kind: 'urgent',  icon: 'flame',   title: 'Thomas Wilms vraagt om korting', text: 'Op offerte €395 — Surface wacht op jouw besluit', time: '5 min', leadId: 'L-2083', unread: true },
    { id: 2, kind: 'review',  icon: 'sparkle', title: 'Familie Bakker — owner review',  text: 'Korstmos-toeslag goedkeuren voor PDF gaat', time: '12 min', leadId: 'L-2084', unread: true },
    { id: 3, kind: 'success', icon: 'check',   title: 'Marieke v.d. Heijden boekte',     text: 'Afspraak voor dinsdag 9:00 vastgelegd in agenda', time: '24 min', leadId: 'L-2085' },
    { id: 4, kind: 'mention', icon: 'sticky',  title: 'Georg noemde je in een notitie', text: 'Op Jeroen de Vries — "even checken hortensia"', time: '1u', leadId: 'L-2087' },
    { id: 5, kind: 'info',    icon: 'bot',     title: 'Bot startte 2 nieuwe gesprekken', text: 'David Klein, Lisa Rietveld via website-formulier', time: '1u 20', leadId: 'L-2078' },
    { id: 6, kind: 'success', icon: 'euro',    title: 'Offerte goedgekeurd — Sandra Janssen', text: '€1.488 · Akkoord via WhatsApp', time: '5u', leadId: 'L-2082' },
    { id: 7, kind: 'warn',    icon: 'clock',   title: 'Reminder verstuurd',              text: 'Bouwbedrijf Korstmos (offerte 5 dagen oud)',    time: 'gister', leadId: 'L-2086' },
  ];
  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <div
      className="notif-panel"
      style={{
        position: 'absolute',
        top: 50, right: 12,
        width: 380,
        maxHeight: 540,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.08)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="row" style={{ gap: 10 }}>
          <strong style={{ fontSize: 14 }}>Notificaties</strong>
          {unreadCount > 0 && <Pill tone="blue" sm>{unreadCount} nieuw</Pill>}
        </div>
        <button className="btn btn-ghost btn-sm">Alles gelezen</button>
      </div>

      <div className="tabs" style={{ padding: '0 12px' }}>
        <button className="tab active">Alles</button>
        <button className="tab">Acties <span className="muted" style={{ marginLeft: 4 }}>2</span></button>
        <button className="tab">@mij</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifs.map(n => (
          <div
            key={n.id}
            onClick={() => { navigate(`leads/${n.leadId}`); onClose(); }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 10,
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.12s',
              background: n.unread ? 'rgba(26,86,255,.025)' : 'transparent',
              position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = n.unread ? 'rgba(26,86,255,.025)' : 'transparent'}
          >
            {n.unread && (
              <div style={{ position: 'absolute', left: 6, top: 18, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
            )}
            <div className={`feed-icon ${notifKindToClass(n.kind)}`} style={{ width: 30, height: 30 }}>
              <Icon name={n.icon} size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3, lineHeight: 1.4 }}>{n.text}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>{n.time}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <button className="btn btn-ghost btn-sm">Alle notificaties bekijken →</button>
      </div>
    </div>
  );
}

function notifKindToClass(kind) {
  if (kind === 'urgent')  return 'quote';
  if (kind === 'review')  return 'quote';
  if (kind === 'success') return 'appt';
  if (kind === 'mention') return 'new';
  if (kind === 'warn')    return 'quote';
  return 'new';
}

Object.assign(window, { PDFPreview, NotificationPanel });
