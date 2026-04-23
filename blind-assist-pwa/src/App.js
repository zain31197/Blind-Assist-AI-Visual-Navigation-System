// src/App.js
// Blind Assist — Complete PWA Orchestrator
// Zero backend. All processing client-side via TensorFlow.js + Web Speech API.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCamera }    from './hooks/useCamera';
import { useDetector }  from './hooks/useDetector';
import { useAnnouncer } from './hooks/useAnnouncer';
import { useSettings }  from './hooks/useSettings';
import { useHaptic }    from './hooks/useHaptic';
import { DetectionOverlay } from './components/DetectionOverlay';
import { DetectionList }    from './components/DetectionList';
import { StatusBar }        from './components/StatusBar';
import { ControlBar }       from './components/ControlBar';
import { LoadingScreen }    from './components/LoadingScreen';
import { SettingsPanel }    from './components/SettingsPanel';
import { tts, isDangerObject } from './utils/tts';
import './App.css';

export default function App() {
  const [sessionActive, setSessionActive]   = useState(false);
  const [showUI, setShowUI]                 = useState(true);
  const [settingsOpen, setSettingsOpen]     = useState(false);

  const uiTimeoutRef    = useRef(null);
  const tapCountRef     = useRef(0);
  const tapTimerRef     = useRef(null);
  const longPressRef    = useRef(null);

  const { settings, update: updateSetting, reset: resetSettings } = useSettings();
  const { vibrate } = useHaptic(settings.hapticFeedback);

  const {
    videoRef, status: cameraStatus, error: cameraError,
    startCamera, stopCamera, flipCamera, isActive: isCameraActive,
  } = useCamera();

  const { modelStatus, detections, fps, isModelReady } = useDetector(
    videoRef,
    sessionActive && isCameraActive,
    settings.sensitivity,
  );

  const { describeScene, resetThrottle } = useAnnouncer(
    detections, videoRef,
    sessionActive && isCameraActive,
    settings,
  );

  // Haptic on danger
  useEffect(() => {
    if (!sessionActive || !settings.hapticFeedback) return;
    const hasDanger = detections.some(d => isDangerObject(d.class) && d.score > 0.6);
    if (hasDanger) vibrate('danger');
  }, [detections, sessionActive, settings.hapticFeedback, vibrate]);

  // Auto-hide UI
  const resetUITimeout = useCallback(() => {
    setShowUI(true);
    clearTimeout(uiTimeoutRef.current);
    if (sessionActive && !settingsOpen) {
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 4000);
    }
  }, [sessionActive, settingsOpen]);

  useEffect(() => {
    if (sessionActive) resetUITimeout();
    else { setShowUI(true); clearTimeout(uiTimeoutRef.current); }
    return () => clearTimeout(uiTimeoutRef.current);
  }, [sessionActive, resetUITimeout]);

  // Toggle session
  const handleToggleSession = useCallback(async () => {
    if (!isModelReady) {
      tts.speak('AI model is still loading. Please wait.', 'normal');
      return;
    }
    if (sessionActive) {
      vibrate('stop');
      tts.speak('Stopping visual assistance.', 'normal');
      setTimeout(() => { stopCamera(); resetThrottle(); setSessionActive(false); }, 300);
    } else {
      vibrate('start');
      tts.speak('Starting visual assistance. Point your camera at the scene.', 'normal');
      await startCamera();
      setSessionActive(true);
    }
  }, [sessionActive, isModelReady, startCamera, stopCamera, resetThrottle, vibrate]);

  // Camera error
  useEffect(() => { if (cameraError) tts.speak(cameraError, 'critical'); }, [cameraError]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (settingsOpen) return;
      if (e.code === 'Space') { e.preventDefault(); handleToggleSession(); }
      if (e.code === 'KeyD')  describeScene();
      if (e.code === 'KeyF')  flipCamera();
      if (e.code === 'Comma') setSettingsOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, handleToggleSession, describeScene, flipCamera]);

  // Tap gesture: 1=describe, 2=toggle, 3=flip
  const handleTap = useCallback((e) => {
    if (e.target.closest('button')) return;
    tapCountRef.current += 1;
    resetUITimeout();
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      const count = tapCountRef.current;
      tapCountRef.current = 0;
      if (count === 1)      { if (sessionActive) describeScene(); }
      else if (count === 2) { handleToggleSession(); }
      else if (count >= 3)  { if (isCameraActive) flipCamera(); }
    }, 300);
  }, [sessionActive, isCameraActive, describeScene, handleToggleSession, flipCamera, resetUITimeout]);

  // Long press → settings
  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      clearTimeout(tapTimerRef.current);
      vibrate('warning');
      setSettingsOpen(true);
    }, 600);
  }, [vibrate]);

  const handlePointerUp = useCallback(() => clearTimeout(longPressRef.current), []);

  useEffect(() => () => {
    clearTimeout(uiTimeoutRef.current);
    clearTimeout(tapTimerRef.current);
    clearTimeout(longPressRef.current);
  }, []);

  // Loading screen
  if (modelStatus === 'idle' || modelStatus === 'loading' || modelStatus === 'error') {
    return <LoadingScreen status={modelStatus} onRetry={() => window.location.reload()} />;
  }

  const frameWidth = videoRef.current?.videoWidth || 640;

  return (
    <div
      className="app-container"
      onClick={handleTap}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="main"
      aria-label={sessionActive
        ? `Blind Assist active. ${detections.length} objects detected. Tap to describe scene.`
        : 'Blind Assist standby. Double-tap to start.'}
    >
      {/* Camera */}
      <video ref={videoRef} className="camera-feed" playsInline muted autoPlay aria-hidden="true" />

      {/* Bounding boxes */}
      {sessionActive && isCameraActive && settings.showOverlay && (
        <DetectionOverlay detections={detections} videoRef={videoRef} />
      )}

      {/* Status bar */}
      <div style={{ opacity: showUI ? 1 : 0, transition: 'opacity 0.5s ease', pointerEvents: showUI ? 'auto' : 'none' }}>
        <StatusBar modelStatus={modelStatus} fps={fps} detectionCount={detections.length} isActive={sessionActive} onSettingsOpen={() => setSettingsOpen(true)} />
      </div>

      {/* Standby overlay */}
      {!sessionActive && (
        <div className="standby-overlay" aria-hidden="true">
          <div className="standby-content">
            <div className="standby-logo">
              <div className="logo-eye"><div className="logo-pupil" /></div>
            </div>
            <h1 className="standby-title">BLIND ASSIST</h1>
            <p className="standby-subtitle">AI VISUAL NAVIGATION</p>
            <div className="standby-gestures">
              <p className="gesture-row"><span className="gesture-key">2×</span> Start / Stop</p>
              <p className="gesture-row"><span className="gesture-key">1×</span> Describe scene</p>
              <p className="gesture-row"><span className="gesture-key">3×</span> Flip camera</p>
              <p className="gesture-row"><span className="gesture-key">hold</span> Settings</p>
            </div>
            {!isModelReady && <p className="standby-loading">Loading AI model…</p>}
          </div>
        </div>
      )}

      {/* Detection list */}
      {sessionActive && settings.showList && (
        <div style={{ opacity: showUI ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: 'none' }}>
          <DetectionList detections={detections} frameWidth={frameWidth} />
        </div>
      )}

      {/* Hint text */}
      {sessionActive && showUI && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: '45%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,0.3)', fontFamily: '"Courier New", monospace',
          fontSize: 11, letterSpacing: '0.15em', textAlign: 'center',
          pointerEvents: 'none', animation: 'fadeOutSlow 5s forwards', whiteSpace: 'nowrap',
        }}>
          TAP TO DESCRIBE · HOLD FOR SETTINGS
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div role="alert" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,59,48,0.95)', color: '#fff',
          padding: '24px 32px', borderRadius: 12,
          fontFamily: '"Courier New", monospace', fontSize: 15,
          textAlign: 'center', maxWidth: '80vw', zIndex: 50, lineHeight: 1.6,
        }}>
          {cameraError}
          <br />
          <button onClick={() => startCamera()} style={{
            marginTop: 16, background: '#fff', color: '#FF3B30', border: 'none',
            padding: '10px 24px', borderRadius: 6, fontFamily: '"Courier New", monospace',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em',
          }}>RETRY</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ opacity: showUI ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <ControlBar
          isActive={sessionActive}
          onToggle={handleToggleSession}
          onFlip={flipCamera}
          onDescribe={describeScene}
          onSettings={() => setSettingsOpen(true)}
          modelReady={isModelReady}
        />
      </div>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSetting}
        onReset={resetSettings}
      />
    </div>
  );
}
