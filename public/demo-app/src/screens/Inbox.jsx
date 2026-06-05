// src/screens/Inbox.jsx
// Unified inbox — all active WhatsApp conversations in one place (Intercom-style).
// 3-column layout: conversation list | active conversation | lead context

const { useState: useStateIn, useEffect: useEffectIn, useRef: useRefIn, useMemo: useMemoIn } = React;

function Inbox({ navigate }) {
  const [filter, setFilter] = useStateIn('all'); // all | unread | mine | bot | needs_action
  const [selectedId, setSelectedId] = useStateIn('L-2087');
  const [search, setSearch] = useStateIn('');

  // Build inbox items from leads + add a "last message" preview
  const items = useMemoIn(() => {
    return LEADS.map(l => ({
      ...l,
      unread: ['nieuw', 'in_gesprek', 'wacht_bevestiging'].includes(l.status) && Math.random() > 0.4,
      bot_paused: false,
      needs_action: l.tag.includes('⚠️ Korting') || l.fase === 'info_compleet' || l.bot_volgende_actie?.includes('escaleren') || l.bot_volgende_actie?.includes('Owner-review'),
    }));
  }, []);

  const filtered = useMemoIn(() => {
    let f = items;
    if (filter === 'unread')       f = f.filter(l => l.unread);
    if (filter === 'bot')          f = f.filter(l => !l.bot_paused && ['nieuw','in_gesprek','wacht_bevestiging','info_compleet'].includes(l.status));
    if (filter === 'needs_action') f = f.filter(l => l.needs_action);
    if (filter === 'mine')         f = f.filter(l => l.bot_paused);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(l => l.naam.toLowerCase().includes(q) || (l.laatste_bericht || '').toLowerCase().includes(q));
    }
    return f;
  }, [items, filter, search]);

  const selected = items.find(l => l.id === selectedId) || items[0];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '320px minmax(0, 1fr) 320px',
      height: 'calc(100vh - 60px)',
      background: 'var(--bg)',
    }}>
      {/* ── Conversation list ─────────────────────────────────── */}
      <div style={{
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 style={{ font: '800 18px var(--font-heading)', letterSpacing: '-0.01em' }}>Inbox</h2>
            <div className="row" style={{ gap: 4 }}>
              <button className="icon-btn" style={{ width: 28, height: 28 }} title="Filteren">
                <Icon name="filter" size={15} />
              </button>
              <button className="icon-btn" style={{ width: 28, height: 28 }} title="Vernieuwen">
                <Icon name="sparkle" size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="topbar-search" style={{ margin: 0, maxWidth: '100%', padding: '7px 10px' }}>
            <Icon name="search" size={13} />
            <input
              type="text"
              placeholder="Zoek in gesprekken..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="tabs" style={{ padding: '0 12px', flexShrink: 0, background: 'var(--bg)' }}>
          {[
            { k: 'all',          l: 'Alles',         c: items.length },
            { k: 'unread',       l: 'Ongelezen',     c: items.filter(l => l.unread).length },
            { k: 'needs_action', l: '⚠️ Actie',      c: items.filter(l => l.needs_action).length },
            { k: 'bot',          l: 'Bot',           c: items.filter(l => !l.bot_paused && ['nieuw','in_gesprek','wacht_bevestiging','info_compleet'].includes(l.status)).length },
          ].map(t => (
            <button key={t.k} className={`tab ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)} style={{ padding: '10px 6px', fontSize: 12 }}>
              {t.l} {t.c > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>{t.c}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(l => (
            <ConvRow
              key={l.id}
              lead={l}
              active={l.id === selectedId}
              onClick={() => setSelectedId(l.id)}
            />
          ))}
          {filtered.length === 0 && (
            <EmptyState
              icon="inbox"
              tone="neutral"
              title="Geen gesprekken hier"
              sub={filter === 'unread' ? 'Alles is gelezen — top!' : filter === 'needs_action' ? 'Geen openstaande acties van klanten.' : 'Geen gesprekken in dit filter.'}
            />
          )}
        </div>
      </div>

      {/* ── Active conversation ──────────────────────────────── */}
      <ActiveConversation lead={selected} />

      {/* ── Lead context ─────────────────────────────────────── */}
      <LeadContext lead={selected} navigate={navigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function ConvRow({ lead, active, onClick }) {
  const preview = lead.laatste_bericht || '(geen berichten)';
  const tone = STATUS[lead.status]?.tone || 'gray';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        background: active ? 'var(--card-hover-bg)' : 'transparent',
        cursor: 'pointer',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        position: 'relative',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.025)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar name={lead.naam} />
        {lead.unread && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--primary)',
            border: '2px solid var(--surface)',
            display: 'grid', placeItems: 'center',
            color: 'white',
            fontSize: 9,
            fontWeight: 700,
          }}>1</div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <strong style={{ fontSize: 13, fontWeight: lead.unread ? 700 : 500 }} className="truncate">{lead.naam}</strong>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', marginLeft: 6 }}>
            {lead.binnengekomen.replace(' geleden', '')}
          </span>
        </div>
        <div style={{
          fontSize: 12,
          color: lead.unread ? 'var(--fg)' : 'var(--fg-muted)',
          fontWeight: lead.unread ? 500 : 400,
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          marginBottom: 6,
        }}>
          {lead.laatste_richting === 'uitgaand'
            ? <span style={{ color: 'var(--whatsapp)' }}>→ {preview}</span>
            : preview}
        </div>
        <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          <Pill tone={tone} sm dot>{STATUS[lead.status].label}</Pill>
          {lead.needs_action && <Pill tone="amber" sm>⚠️ Actie</Pill>}
          {lead.totaal_prijs && <Pill tone="gray" sm>{fmtEur(lead.totaal_prijs)}</Pill>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function ActiveConversation({ lead }) {
  if (!lead) return null;

  const messages = useMemoIn(() => {
    return lead.id === 'L-2087'
      ? CONVERSATION_2087.slice(0, -1)
      : buildConv(lead);
  }, [lead.id]);

  const endRef = useRefIn(null);
  const [reply, setReply] = useStateIn('');
  const [botPaused, setBotPaused] = useStateIn(false);

  useEffectIn(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid var(--border)',
      minWidth: 0,
    }}>
      {/* WA Header */}
      <div className="wa-header">
        <Avatar name={lead.naam} size="sm" tint={2} />
        <div className="wa-header-info">
          <div className="wa-header-name">{lead.naam}</div>
          <div className="wa-header-status">{lead.adres} · {lead.telefoon}</div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setBotPaused(b => !b)}
          style={{ background: botPaused ? 'white' : 'rgba(255,255,255,0.15)', color: botPaused ? '#008069' : 'white', border: 'none' }}
        >
          <Icon name="bot" size={13} />
          {botPaused ? 'Bot uit — activeren' : 'Bot actief — pauzeren'}
        </button>
      </div>

      {/* Bot status strip */}
      {botPaused ? (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(245,158,11,.10)',
          borderBottom: '1px solid rgba(245,158,11,.25)',
          color: '#B45309',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ⏸️ Surface is gepauzeerd — antwoorden gaan handmatig
        </div>
      ) : (
        <div style={{
          padding: '7px 16px',
          background: 'rgba(26,86,255,.04)',
          borderBottom: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--fg-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name="bot" size={13} style={{ color: 'var(--primary)' }} />
          <strong style={{ color: 'var(--fg)' }}>Surface:</strong>
          <span>{lead.bot_volgende_actie}</span>
        </div>
      )}

      {/* Transcript */}
      <div className="wa-frame" ref={endRef}>
        {messages.map((m, i) => {
          if (m.day) return <div className="wa-day" key={i}>{m.day}</div>;
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
      </div>

      {/* Compose */}
      <div style={{
        padding: 12,
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        {botPaused && (
          <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {[
              'Bedankt voor je bericht, ik kom hierop terug.',
              'Helder, ik stuur je later vandaag de offerte.',
              'Korting akkoord — ik pas de offerte aan.',
              'Mag ik een foto erbij?',
            ].map((t, i) => (
              <button
                key={i}
                onClick={() => setReply(t)}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 9999,
                  color: 'var(--fg-soft)',
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <button className="icon-btn" style={{ width: 38, height: 38 }}><Icon name="paperclip" size={16} /></button>
          <textarea
            placeholder={botPaused ? 'Typ je bericht (vervangt Surface)...' : 'Surface antwoordt automatisch. Pauzeer om zelf te reageren.'}
            disabled={!botPaused}
            value={reply}
            onChange={e => setReply(e.target.value)}
            style={{
              flex: 1,
              minHeight: 38,
              maxHeight: 120,
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: botPaused ? 'var(--bg)' : 'var(--surface-2)',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              color: botPaused ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          />
          <button
            className="btn btn-primary"
            disabled={!botPaused || !reply.trim()}
            style={{
              padding: '10px 16px',
              opacity: (!botPaused || !reply.trim()) ? 0.4 : 1,
              cursor: (!botPaused || !reply.trim()) ? 'not-allowed' : 'pointer',
            }}
            onClick={() => { if (reply.trim()) { alert('Verstuurd!'); setReply(''); } }}
          >
            <Icon name="send" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function LeadContext({ lead, navigate }) {
  if (!lead) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
        <div className="row" style={{ gap: 12, marginBottom: 14 }}>
          <Avatar name={lead.naam} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }} className="truncate">{lead.naam}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }} className="truncate">{lead.id} · {lead.binnengekomen}</div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate(`leads/${lead.id}`)}
        >
          <Icon name="eye" size={13} /> Open volledig dossier
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Status */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel label="Status" />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Pill tone={STATUS[lead.status].tone} dot>{STATUS[lead.status].label}</Pill>
            <Pill tone="gray">Fase: {FASES[lead.fase]?.label}</Pill>
          </div>
        </div>

        {/* Werk */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel label="Werk" />
          <CompactRow l="Adres" v={lead.adres} />
          <CompactRow l="Oppervlakte" v={`${lead.m2} m²`} />
          <CompactRow l="Diensten" v={lead.sub.map(s => DIENST_LABELS[s]).join(' + ')} />
          {lead.korstmos === 'ja' && <CompactRow l="Korstmos" v="Ja (+10%)" warn />}
          {lead.fotos > 0 && <CompactRow l="Foto's" v={`${lead.fotos} stuks`} />}
        </div>

        {/* Offerte */}
        {lead.totaal_prijs && (
          <div style={{ marginBottom: 18 }}>
            <SectionLabel label="Offerte" />
            <div style={{
              padding: 12,
              background: 'rgba(26,86,255,.04)',
              borderRadius: 10,
              border: '1px solid rgba(26,86,255,.15)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular">
                {fmtEur(lead.totaal_prijs)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                {lead.offerte_verstuurd_op ? `Verstuurd ${lead.offerte_verstuurd_op}` : 'Nog niet verstuurd'}
              </div>
            </div>
          </div>
        )}

        {/* Snelle acties */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel label="Snelle acties" />
          <div className="col" style={{ gap: 6 }}>
            <ActionRow icon="sticky"  label="Interne notitie toevoegen" onClick={() => alert('Notitie-form geopend')} />
            <ActionRow icon="edit"    label="Lead-gegevens aanpassen"   onClick={() => alert('Edit-modus actief')} />
            <ActionRow icon="send"    label="Offerte opnieuw versturen" onClick={() => alert('Offerte verzonden')} />
            <ActionRow icon="archive" label="Archiveren als afgerond"   onClick={() => alert('Verplaatst naar Afgerond')} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <SectionLabel label="Tags" />
          <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            {lead.tag.map((t, i) => <Pill key={i} tone="gray" sm>{t}</Pill>)}
            <button style={{
              padding: '3px 9px',
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 9999,
              fontSize: 11,
              color: 'var(--fg-muted)',
              cursor: 'pointer',
            }}>
              + Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--fg-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
    }}>{label}</div>
  );
}

function CompactRow({ l, v, warn }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '78px 1fr',
      gap: 10,
      padding: '5px 0',
      fontSize: 12,
      alignItems: 'baseline',
    }}>
      <span style={{ color: 'var(--fg-muted)' }}>{l}</span>
      <span style={{
        color: warn ? '#B45309' : 'var(--fg)',
        fontWeight: warn ? 600 : 500,
        textAlign: 'right',
        wordBreak: 'break-word',
        lineHeight: 1.4,
      }}>{v}</span>
    </div>
  );
}

function ActionRow({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        fontSize: 12,
        color: 'var(--fg-soft)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-hover-bg)'; e.currentTarget.style.borderColor = 'var(--card-hover-border)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

function buildConv(lead) {
  return [
    { day: 'Eerder deze week' },
    { from: 'bot', time: '14:22', text: `Hoi ${lead.naam.split(' ')[0]}, bedankt voor je aanvraag! Ik help je in een paar berichten aan een offerte. Klopt het dat het om ${lead.m2}m² gaat?` },
    { from: 'customer', time: '14:35', text: lead.laatste_bericht || 'Ja klopt!' },
  ];
}

window.Inbox = Inbox;
