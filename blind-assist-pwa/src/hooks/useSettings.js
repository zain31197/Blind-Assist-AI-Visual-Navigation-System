// src/hooks/useSettings.js
// Persists user preferences in localStorage (no backend required)
// Settings: voice speed, language, sensitivity, show overlay

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'blind-assist-settings';

const DEFAULTS = {
  voiceSpeed: 1.0,          // 0.5 – 2.0
  voicePitch: 1.0,          // 0.5 – 2.0
  language: 'en-US',        // BCP-47 language tag
  sensitivity: 0.45,        // COCO-SSD confidence threshold (0.3 – 0.8)
  persistenceMs: 1000,      // how long object must be visible before announced
  cooldownMs: 4000,         // how long before same object is re-announced
  dangerCooldownMs: 2000,   // cooldown for danger objects
  showOverlay: true,        // show bounding boxes visually
  showList: true,           // show detection list panel
  hapticFeedback: true,     // vibrate on danger (if device supports it)
  maxAnnouncePerFrame: 2,   // max objects announced per detection cycle
};

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable (private browsing, storage full)
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  // Persist whenever settings change
  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  return { settings, update, reset, DEFAULTS };
}
