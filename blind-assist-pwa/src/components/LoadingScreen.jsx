// src/components/LoadingScreen.jsx
// Shown while COCO-SSD model weights download (~20MB, one-time)

export function LoadingScreen({ status, onRetry }) {
  const isError = status === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 32,
        gap: 32,
      }}
    >
      {/* Logo mark */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `3px solid ${isError ? '#FF3B30' : '#ffffff20'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isError ? '#FF3B30' : 'transparent',
            border: `3px solid ${isError ? '#FF3B30' : '#fff'}`,
            animation: isError ? 'none' : 'scan 2s ease-in-out infinite',
          }} />
        </div>
        {!isError && (
          <div style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: '2px solid #ffffff15',
            animation: 'ping 2s ease-out infinite',
          }} />
        )}
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          color: '#fff',
          fontFamily: '"Courier New", monospace',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.15em',
          margin: 0,
        }}>
          BLIND ASSIST
        </h1>
        <p style={{
          color: '#555',
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          letterSpacing: '0.2em',
          marginTop: 8,
        }}>
          AI VISUAL NAVIGATION
        </p>
      </div>

      {/* Status */}
      {isError ? (
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <p style={{
            color: '#FF3B30',
            fontFamily: '"Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
          }}>
            Failed to load AI model. Check your internet connection and try again.
          </p>
          <button
            onClick={onRetry}
            style={{
              background: '#FF3B30',
              color: '#fff',
              border: 'none',
              padding: '16px 40px',
              borderRadius: 8,
              fontFamily: '"Courier New", monospace',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              minWidth: 200,
              minHeight: 56,
            }}
            aria-label="Retry loading the AI model"
          >
            RETRY
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#888',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            letterSpacing: '0.08em',
            marginBottom: 20,
          }}>
            LOADING AI MODEL…
          </p>
          <p style={{
            color: '#444',
            fontFamily: '"Courier New", monospace',
            fontSize: 11,
            maxWidth: 260,
            lineHeight: 1.7,
          }}>
            Downloading ~20MB model.{'\n'}
            This happens once — it's cached after first load.
          </p>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
