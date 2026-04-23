// src/components/StatusBar.jsx
// Minimal HUD — top of screen, high contrast, large text

export function StatusBar({ modelStatus, fps, detectionCount, isActive }) {
  const statusConfig = {
    idle:    { label: 'STANDBY',       color: '#888',    pulse: false },
    loading: { label: 'LOADING AI…',   color: '#FFD60A', pulse: true  },
    ready:   { label: 'AI READY',      color: '#34C759', pulse: false },
    error:   { label: 'MODEL ERROR',   color: '#FF3B30', pulse: false },
  };

  const { label, color, pulse } = statusConfig[modelStatus] || statusConfig.idle;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Status: ${label}. ${isActive ? `${detectionCount} objects detected` : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
        pointerEvents: 'none',
      }}
    >
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: pulse ? 'pulse 1s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          color: '#fff',
          fontFamily: '"Courier New", monospace',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}>
          {label}
        </span>
      </div>

      {/* Stats */}
      {isActive && modelStatus === 'ready' && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{
            color: detectionCount > 0 ? '#FFD60A' : '#888',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {detectionCount} OBJ
          </span>
          <span style={{
            color: '#555',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
          }}>
            {fps}fps
          </span>
        </div>
      )}
    </div>
  );
}
