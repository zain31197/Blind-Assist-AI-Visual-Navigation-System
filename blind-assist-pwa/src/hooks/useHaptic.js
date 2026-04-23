// src/hooks/useHaptic.js
// Vibration feedback using the Vibration API
// Falls back silently on unsupported devices (iOS Safari)

import { useCallback } from 'react';

const PATTERNS = {
  danger:  [100, 50, 100],      // two short pulses — urgent
  warning: [200],               // single medium pulse
  start:   [50, 30, 50, 30, 50], // triple quick tap — confirmation
  stop:    [300],               // one long pulse — session ended
};

export function useHaptic(enabled = true) {
  const vibrate = useCallback((type = 'warning') => {
    if (!enabled) return;
    if (!('vibrate' in navigator)) return; // iOS Safari doesn't support this

    const pattern = PATTERNS[type] || PATTERNS.warning;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore — some browsers block vibration without user gesture
    }
  }, [enabled]);

  return { vibrate };
}
