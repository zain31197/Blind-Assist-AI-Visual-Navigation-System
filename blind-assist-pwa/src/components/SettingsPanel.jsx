// src/components/SettingsPanel.jsx
// Slide-up settings drawer — accessible, large controls, keyboard navigable
// Appears when user long-presses the START button (500ms hold)

import { useEffect, useRef } from 'react';

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ur-PK', label: 'Urdu' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
];

export function SettingsPanel({ isOpen, onClose, settings, onUpdate, onReset }) {
  const panelRef = useRef(null);

  // Focus trap and keyboard close
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 70,
          background: '#111',
          borderTop: '1px solid #2a2a2a',
          borderRadius: '20px 20px 0 0',
          padding: '12px 24px 40px',
          paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom) + 24px))',
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'slideUp 0.3s ease',
          outline: 'none',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: '#333', margin: '0 auto 24px',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 28,
        }}>
          <h2 style={{
            color: '#fff', fontFamily: '"Courier New", monospace',
            fontSize: 18, fontWeight: 700, letterSpacing: '0.1em',
          }}>
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={btnClose}
          >
            ✕
          </button>
        </div>

        {/* ---- Voice Speed ---- */}
        <SettingRow label="Voice Speed" value={`${settings.voiceSpeed.toFixed(1)}×`}>
          <input
            type="range" min="0.5" max="2" step="0.1"
            value={settings.voiceSpeed}
            onChange={e => onUpdate('voiceSpeed', parseFloat(e.target.value))}
            aria-label={`Voice speed: ${settings.voiceSpeed.toFixed(1)} times`}
            style={rangeStyle}
          />
        </SettingRow>

        {/* ---- Voice Pitch ---- */}
        <SettingRow label="Voice Pitch" value={`${settings.voicePitch.toFixed(1)}×`}>
          <input
            type="range" min="0.5" max="2" step="0.1"
            value={settings.voicePitch}
            onChange={e => onUpdate('voicePitch', parseFloat(e.target.value))}
            aria-label={`Voice pitch: ${settings.voicePitch.toFixed(1)}`}
            style={rangeStyle}
          />
        </SettingRow>

        {/* ---- Detection Sensitivity ---- */}
        <SettingRow
          label="Detection Sensitivity"
          value={sensitivityLabel(settings.sensitivity)}
        >
          <input
            type="range" min="0.3" max="0.8" step="0.05"
            value={settings.sensitivity}
            onChange={e => onUpdate('sensitivity', parseFloat(e.target.value))}
            aria-label={`Sensitivity: ${sensitivityLabel(settings.sensitivity)}`}
            style={rangeStyle}
          />
          <p style={hint}>
            Lower = detects more objects. Higher = fewer false positives.
          </p>
        </SettingRow>

        {/* ---- Announce After ---- */}
        <SettingRow
          label="Announce After"
          value={`${(settings.persistenceMs / 1000).toFixed(1)}s`}
        >
          <input
            type="range" min="300" max="3000" step="100"
            value={settings.persistenceMs}
            onChange={e => onUpdate('persistenceMs', parseInt(e.target.value))}
            aria-label={`Announce after ${settings.persistenceMs}ms`}
            style={rangeStyle}
          />
          <p style={hint}>
            Object must be visible this long before it's announced.
          </p>
        </SettingRow>

        {/* ---- Language ---- */}
        <SettingRow label="Language">
          <select
            value={settings.language}
            onChange={e => onUpdate('language', e.target.value)}
            aria-label="Voice language"
            style={selectStyle}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </SettingRow>

        {/* ---- Toggles ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          <Toggle
            label="Show Bounding Boxes"
            description="Visual overlay showing detected objects"
            checked={settings.showOverlay}
            onChange={v => onUpdate('showOverlay', v)}
          />
          <Toggle
            label="Show Detection List"
            description="Text list of detected objects at bottom"
            checked={settings.showList}
            onChange={v => onUpdate('showList', v)}
          />
          <Toggle
            label="Haptic Feedback"
            description="Vibrate on danger object detection"
            checked={settings.hapticFeedback}
            onChange={v => onUpdate('hapticFeedback', v)}
          />
        </div>

        {/* ---- Reset ---- */}
        <button
          onClick={() => { onReset(); onClose(); }}
          style={{
            marginTop: 32, width: '100%', padding: '16px',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: 8, color: '#666',
            fontFamily: '"Courier New", monospace',
            fontSize: 13, letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
          aria-label="Reset all settings to defaults"
        >
          RESET TO DEFAULTS
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255,255,255,0.3);
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px;
          background: #333;
          border-radius: 2px;
        }
        select option {
          background: #111;
          color: #fff;
        }
      `}</style>
    </>
  );
}

// ---- Sub-components ----------------------------------------

function SettingRow({ label, value, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 10,
      }}>
        <label style={{
          color: '#aaa', fontFamily: '"Courier New", monospace',
          fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {label}
        </label>
        {value && (
          <span style={{
            color: '#fff', fontFamily: '"Courier New", monospace',
            fontSize: 14, fontWeight: 700,
          }}>
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid #1a1a1a',
    }}>
      <div>
        <p style={{
          color: '#ccc', fontFamily: '"Courier New", monospace',
          fontSize: 14, margin: 0,
        }}>
          {label}
        </p>
        {description && (
          <p style={{
            color: '#555', fontFamily: '"Courier New", monospace',
            fontSize: 11, marginTop: 3,
          }}>
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          width: 52, height: 30, borderRadius: 15, border: 'none',
          background: checked ? '#34C759' : '#333',
          cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s ease', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3, left: checked ? 25 : 3,
          width: 24, height: 24,
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </button>
    </div>
  );
}

// ---- Helpers -----------------------------------------------
function sensitivityLabel(v) {
  if (v <= 0.35) return 'HIGH';
  if (v <= 0.55) return 'MED';
  return 'LOW';
}

// ---- Inline styles -----------------------------------------
const rangeStyle = {
  width: '100%', height: 4, appearance: 'none',
  WebkitAppearance: 'none', cursor: 'pointer',
  background: 'transparent',
};

const selectStyle = {
  width: '100%', padding: '14px 16px',
  background: '#1a1a1a', border: '1px solid #333',
  borderRadius: 8, color: '#fff',
  fontFamily: '"Courier New", monospace', fontSize: 14,
  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
};

const btnClose = {
  background: 'transparent', border: 'none', color: '#666',
  fontSize: 18, cursor: 'pointer', padding: '8px 12px',
  lineHeight: 1,
};

const hint = {
  color: '#444', fontFamily: '"Courier New", monospace',
  fontSize: 11, marginTop: 6, lineHeight: 1.5,
};
