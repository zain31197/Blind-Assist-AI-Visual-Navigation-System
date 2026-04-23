// src/components/ControlBar.jsx
// Large accessible control buttons — designed for vision-impaired users
// Placed at corners so they can be found by touch without looking

export function ControlBar({ isActive, onToggle, onFlip, onDescribe, modelReady }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '20px 24px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        // No background — controls are transparent overlays
        pointerEvents: 'auto',
      }}
      role="toolbar"
      aria-label="Navigation controls"
    >
      {/* Flip camera */}
      <IconButton
        onClick={onFlip}
        label="Flip camera"
        disabled={!isActive}
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        }
      />

      {/* Main toggle — START / STOP */}
      <button
        onClick={onToggle}
        disabled={!modelReady}
        aria-label={isActive ? 'Stop visual assistance' : 'Start visual assistance'}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `3px solid ${isActive ? '#FF3B30' : '#34C759'}`,
          background: isActive
            ? 'rgba(255,59,48,0.15)'
            : modelReady ? 'rgba(52,199,89,0.15)' : 'rgba(100,100,100,0.15)',
          color: isActive ? '#FF3B30' : modelReady ? '#34C759' : '#555',
          cursor: modelReady ? 'pointer' : 'not-allowed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          boxShadow: isActive
            ? '0 0 20px rgba(255,59,48,0.3)'
            : modelReady ? '0 0 20px rgba(52,199,89,0.3)' : 'none',
        }}
      >
        {isActive ? (
          // Stop icon
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Play icon
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          {isActive ? 'STOP' : 'START'}
        </span>
      </button>

      {/* Describe scene */}
      <IconButton
        onClick={onDescribe}
        label="Describe scene"
        disabled={!isActive}
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 0 20" />
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="1" />
          </svg>
        }
        altIcon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        }
      />
    </div>
  );
}

function IconButton({ onClick, label, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.5)',
        color: disabled ? '#444' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
    </button>
  );
}
