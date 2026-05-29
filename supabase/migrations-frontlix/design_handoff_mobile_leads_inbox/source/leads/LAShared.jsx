// src/leads-a/LAShared.jsx
// Optie A — uitgewerkt. Schone card-atoms (zonder bot-row, zonder
// urgent-stripe), per-fase varianten, en helpers voor swipe + filter.
//
// Hangt af van: AShared.jsx (AIcon, AAvatar, ALiveDot, makeATheme, fmtA),
//               MLShared.jsx (ML_LEADS, ML_STAGES, ML_COUNTS, ...)

// ── Per-fase metadata: welk veld dominant is + welke kleur ─────
const LA_STAGE_META = {
  gesprek: { tone: 'blue',   emph: 'meta',  label: 'In gesprek' },
  review:  { tone: 'amber',  emph: 'price', label: 'Owner-review' },
  uit:     { tone: 'violet', emph: 'price', label: 'Offerte uit' },
  gepland: { tone: 'green',  emph: 'datum', label: 'Ingepland' },
  klaar:   { tone: 'gray',   emph: 'datum', label: 'Afgerond' },
};

function laToneColor(tone, t) {
  return tone === 'red'    ? t.danger
       : tone === 'amber'  ? t.warning
       : tone === 'green'  ? t.success
       : tone === 'gray'   ? t.fgMuted
       : tone === 'violet' ? '#7C3AED'
       : t.accent;
}

// ── Stage pill (kleine variant, gebruikt onderaan elke card) ──
function LAStagePill({ stage, t, sm = true }) {
  const meta = LA_STAGE_META[stage] || {};
  const c = laToneColor(meta.tone, t);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: sm ? '2px 8px' : '3px 10px',
      borderRadius: 9999,
      background: c + '14',
      color: c,
      fontSize: sm ? 10.5 : 11,
      fontWeight: 700, lineHeight: 1.2,
      whiteSpace: 'nowrap',
      letterSpacing: '.01em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }}/>
      {meta.label || stage}
    </span>
  );
}

// ── Bron-dot (WhatsApp / formulier) ──
function LASource({ bron, t, size = 14 }) {
  if (bron === 'wa') {
    return <span style={{
      width: size, height: size, borderRadius: '50%',
      background: t.wa, color: 'white',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
      boxShadow: '0 0 0 2px ' + t.surface,
    }}>
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2z"/>
      </svg>
    </span>;
  }
  return <span style={{
    width: size, height: size, borderRadius: 4,
    background: t.fgMuted + '40', color: t.fgSoft,
    display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    boxShadow: '0 0 0 2px ' + t.surface,
  }}>
    <AIcon name="doc" size={size * 0.6} stroke={2.4} color={t.fgSoft}/>
  </span>;
}

// ── De schone card. density='med' is de hoofdvariant.
// Density: 'compact' | 'med' | 'royaal' | 'hero'
// Variant: standaard volgt uit fase (gesprek=meta, review/uit=price, gepland=datum)
//   maar kan ge-overruled worden met `emph` prop.
function LACard({ l, t, density = 'med', emph, onTap, dim }) {
  const meta = LA_STAGE_META[l.stage] || {};
  const stageColor = laToneColor(meta.tone, t);
  const eff = emph || meta.emph || 'meta';

  if (density === 'compact') return <LACardCompact l={l} t={t} eff={eff} stageColor={stageColor} onTap={onTap} dim={dim}/>;
  if (density === 'royaal')  return <LACardRoyaal  l={l} t={t} eff={eff} stageColor={stageColor} onTap={onTap} dim={dim}/>;
  if (density === 'hero')    return <LACardHero    l={l} t={t} eff={eff} stageColor={stageColor} onTap={onTap} dim={dim}/>;

  // ── Default: medium ───────────────────────────────────────────
  return (
    <div onClick={onTap} style={{
      background: t.surface, borderRadius: 14, padding: 14,
      boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      opacity: dim ? 0.45 : 1,
      cursor: onTap ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Top row — avatar / naam / right metric */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <AAvatar name={l.naam} size={40} t={t} tint={l.id.length}/>
          <div style={{ position: 'absolute', bottom: -2, right: -2 }}>
            <LASource bron={l.bron} t={t}/>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.005em',
          }}>{l.naam}</div>
          <div style={{
            fontSize: 12, color: t.fgMuted, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {l.plaats} · {l.m2}m² · {l.dienst.split('·')[1]?.trim() || l.dienst}
          </div>
        </div>
        <LARightMetric l={l} t={t} eff={eff} stageColor={stageColor}/>
      </div>

      {/* Bottom row — stage pill + tijd */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 52,
      }}>
        <LAStagePill stage={l.stage} t={t}/>
        <span style={{
          fontSize: 11, color: t.fgMuted, fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}>{l.binnen}</span>
      </div>
    </div>
  );
}

// Right-side metric — wijzigt op basis van fase-emphasis
function LARightMetric({ l, t, eff, stageColor }) {
  if (eff === 'datum' && l.datum) {
    return (
      <div style={{
        textAlign: 'right', flexShrink: 0,
        background: stageColor + '14', borderRadius: 9,
        padding: '5px 9px',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: stageColor,
          textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1,
        }}>{l.datum.split(' ')[0]}</div>
        <div style={{
          fontSize: 13, fontWeight: 800, color: stageColor,
          letterSpacing: '-0.01em', marginTop: 2,
        }}>{l.datum.split(' ').slice(1).join(' ')}</div>
      </div>
    );
  }
  if (eff === 'price' && l.prijs) {
    return (
      <div style={{
        fontSize: 17, fontWeight: 800, color: t.fg,
        letterSpacing: '-0.015em', flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>{fmtA(l.prijs)}</div>
    );
  }
  // meta — no price/datum yet (gesprek fase)
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, color: t.fgMuted,
      textTransform: 'uppercase', letterSpacing: '.04em',
      textAlign: 'right', flexShrink: 0, lineHeight: 1.3,
    }}>
      Nog<br/>geen prijs
    </div>
  );
}

// ── Compact: single dense row ────────────────────────────────
function LACardCompact({ l, t, eff, stageColor, onTap, dim }) {
  return (
    <div onClick={onTap} style={{
      background: t.surface, borderRadius: 11,
      padding: '10px 12px',
      boxShadow: t.dark ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      opacity: dim ? 0.45 : 1,
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: onTap ? 'pointer' : 'default',
    }}>
      <div style={{ position: 'relative' }}>
        <AAvatar name={l.naam} size={30} t={t} tint={l.id.length}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: t.fg,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.005em',
        }}>{l.naam}</div>
        <div style={{
          fontSize: 11, color: t.fgMuted, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <LAStagePill stage={l.stage} t={t}/>
          {l.plaats} · {l.m2}m²
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {eff === 'price' && l.prijs ? (
          <div style={{
            fontSize: 14, fontWeight: 800, color: t.fg,
            letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
          }}>{fmtA(l.prijs)}</div>
        ) : eff === 'datum' && l.datum ? (
          <div style={{
            fontSize: 12, fontWeight: 700, color: stageColor,
            letterSpacing: '-0.01em',
          }}>{l.datum}</div>
        ) : null}
        <div style={{
          fontSize: 10.5, color: t.fgMuted, marginTop: 1,
        }}>{l.binnen}</div>
      </div>
    </div>
  );
}

// ── Royaal: 3-row, voegt dienst-omschrijving en bron-tag toe ──
function LACardRoyaal({ l, t, eff, stageColor, onTap, dim }) {
  return (
    <div onClick={onTap} style={{
      background: t.surface, borderRadius: 16, padding: 16,
      boxShadow: t.dark ? 'none' : '0 1px 3px rgba(0,0,0,.05)',
      opacity: dim ? 0.45 : 1,
      display: 'flex', flexDirection: 'column', gap: 12,
      cursor: onTap ? 'pointer' : 'default',
    }}>
      {/* Top: avatar + name + price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <AAvatar name={l.naam} size={48} t={t} tint={l.id.length}/>
          <div style={{ position: 'absolute', bottom: -2, right: -2 }}>
            <LASource bron={l.bron} t={t} size={16}/>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>{l.naam}</div>
          <div style={{
            fontSize: 12, color: t.fgMuted, marginTop: 2,
          }}>{l.id} · {l.plaats}</div>
        </div>
        <LARightMetric l={l} t={t} eff={eff} stageColor={stageColor}/>
      </div>

      {/* Middle row: dienst */}
      <div style={{
        padding: '8px 12px',
        background: t.dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.025)',
        borderRadius: 9,
        fontSize: 13, color: t.fgSoft, lineHeight: 1.4,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: t.fgMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>{l.m2}m²</span>
        <span style={{
          width: 3, height: 3, borderRadius: '50%', background: t.fgMuted,
        }}/>
        <span style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{l.dienst}</span>
      </div>

      {/* Bottom: stage + time */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <LAStagePill stage={l.stage} t={t} sm={false}/>
        <span style={{ fontSize: 11.5, color: t.fgMuted }}>{l.binnen}</span>
      </div>
    </div>
  );
}

// ── Hero: 1 lead met grote prijs/datum-emphasis ──
function LACardHero({ l, t, eff, stageColor, onTap, dim }) {
  return (
    <div onClick={onTap} style={{
      background: t.surface, borderRadius: 16, padding: 16,
      boxShadow: t.dark ? 'none' : '0 1px 3px rgba(0,0,0,.05)',
      opacity: dim ? 0.45 : 1,
      cursor: onTap ? 'pointer' : 'default',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Gradient accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${stageColor}1A, transparent 70%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AAvatar name={l.naam} size={44} t={t} tint={l.id.length}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: t.fg,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{l.naam}</div>
          <div style={{ fontSize: 11.5, color: t.fgMuted, marginTop: 2 }}>
            {l.plaats} · {l.m2}m²
          </div>
        </div>
        <LAStagePill stage={l.stage} t={t}/>
      </div>
      <div style={{
        marginTop: 14, display: 'flex', alignItems: 'baseline',
        justifyContent: 'space-between',
      }}>
        <div>
          {eff === 'datum' && l.datum ? (
            <>
              <div style={{ fontSize: 11, color: t.fgMuted, fontWeight: 500 }}>Afspraak</div>
              <div style={{
                fontSize: 24, fontWeight: 800, color: stageColor,
                letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1,
              }}>{l.datum}</div>
            </>
          ) : l.prijs ? (
            <>
              <div style={{ fontSize: 11, color: t.fgMuted, fontWeight: 500 }}>Offerte</div>
              <div style={{
                fontSize: 28, fontWeight: 800, color: t.fg,
                letterSpacing: '-0.025em', marginTop: 2, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>{fmtA(l.prijs)}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: t.fgMuted, fontWeight: 500 }}>Surface verwerkt</div>
              <div style={{
                fontSize: 17, fontWeight: 700, color: t.fg,
                letterSpacing: '-0.01em', marginTop: 2,
              }}>{l.fotos} foto's · {l.m2}m²</div>
            </>
          )}
        </div>
        <span style={{ fontSize: 11, color: t.fgMuted }}>{l.binnen}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  LA_STAGE_META, laToneColor,
  LAStagePill, LASource, LARightMetric,
  LACard, LACardCompact, LACardRoyaal, LACardHero,
});
