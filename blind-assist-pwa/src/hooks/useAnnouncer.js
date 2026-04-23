// src/hooks/useAnnouncer.js
// Connects detector output → throttle → TTS
// Reads voice speed, pitch, language, and cooldown from settings

import { useEffect, useRef, useCallback } from 'react';
import { DetectionThrottle } from '../utils/detectionThrottle';
import { tts, formatDetectionSpeech, buildSceneDescription } from '../utils/tts';

export function useAnnouncer(detections, videoRef, isActive, settings = {}) {
  const throttleRef = useRef(null);

  // Rebuild throttle whenever cooldown settings change
  useEffect(() => {
    throttleRef.current = new DetectionThrottle({
      persistenceMs:    settings.persistenceMs    ?? 1000,
      cooldownMs:       settings.cooldownMs       ?? 4000,
      dangerCooldownMs: settings.dangerCooldownMs ?? 2000,
      maxPerFrame:      settings.maxAnnouncePerFrame ?? 2,
    });
  }, [settings.persistenceMs, settings.cooldownMs, settings.dangerCooldownMs, settings.maxAnnouncePerFrame]);

  // Apply TTS voice settings whenever they change
  useEffect(() => {
    tts.applySettings({
      rate:     settings.voiceSpeed  ?? 1.0,
      pitch:    settings.voicePitch  ?? 1.0,
      language: settings.language    ?? 'en-US',
    });
  }, [settings.voiceSpeed, settings.voicePitch, settings.language]);

  // Process detections
  useEffect(() => {
    if (!isActive || !detections?.length || tts.isSpeaking()) return;
    const video = videoRef.current;
    if (!video) return;
    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;
    const toAnnounce = throttleRef.current?.process(detections) ?? [];
    toAnnounce.forEach(det => {
      const { text, priority } = formatDetectionSpeech(det, W, H);
      tts.speak(text, priority);
    });
  }, [detections, isActive, videoRef]);

  const describeScene = useCallback(() => {
    if (!videoRef.current) return;
    const W = videoRef.current.videoWidth || 640;
    const H = videoRef.current.videoHeight || 480;
    tts.stop();
    tts.speak('Scene: ' + buildSceneDescription(detections, W, H), 'normal');
  }, [detections, videoRef]);

  const resetThrottle = useCallback(() => {
    throttleRef.current?.reset();
    tts.stop();
  }, []);

  return { describeScene, resetThrottle };
}
