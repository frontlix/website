// src/components/EmptyStates.jsx
// Beautiful empty-states for various scenarios across the dashboard

function EmptyState({ icon = 'inbox', title, sub, action, secondary, tone = 'default' }) {
  const toneStyles = {
    default: { iconBg: 'var(--card-hover-bg)',     iconFg: 'var(--primary)' },
    success: { iconBg: 'rgba(22,163,74,.10)',      iconFg: 'var(--success)' },
    warn:    { iconBg: 'rgba(245,158,11,.14)',     iconFg: '#B45309' },
    neutral: { iconBg: 'var(--surface-2)',          iconFg: 'var(--fg-muted)' },
  }[tone];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      gap: 14,
      minHeight: 320,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(26,86,255,0.04), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: 80, height: 80,
        borderRadius: 22,
        background: toneStyles.iconBg,
        display: 'grid', placeItems: 'center',
        color: toneStyles.iconFg,
        marginBottom: 4,
      }}>
        <Icon name={icon} size={36} stroke={1.6} />
        <div style={{
          position: 'absolute',
          inset: -10,
          borderRadius: 28,
          border: '1.5px dashed',
          borderColor: toneStyles.iconFg,
          opacity: 0.15,
        }} />
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--fg-muted)', maxWidth: 380, lineHeight: 1.55 }}>
        {sub}
      </div>

      {(action || secondary) && (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {action && (
            <button className="btn btn-primary" onClick={action.onClick}>
              {action.icon && <Icon name={action.icon} size={13} />}
              {action.label}
            </button>
          )}
          {secondary && (
            <button className="btn btn-secondary" onClick={secondary.onClick}>
              {secondary.icon && <Icon name={secondary.icon} size={13} />}
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

window.EmptyState = EmptyState;
