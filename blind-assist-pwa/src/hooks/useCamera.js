// src/hooks/useCamera.js
// Manages camera stream lifecycle: open, close, switch, error handling

import { useState, useEffect, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | requesting | active | error
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // rear camera default

  const startCamera = useCallback(async (facing = facingMode) => {
    setStatus('requesting');
    setError(null);

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1280, max: 1920 },
          height: { ideal: 720,  max: 1080 },
          frameRate: { ideal: 15, max: 30 }, // 15fps is enough for detection
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = resolve;
          videoRef.current.onerror = reject;
        });
        await videoRef.current.play();
      }

      setStatus('active');
      setFacingMode(facing);
    } catch (err) {
      console.error('Camera error:', err);
      let msg = 'Camera access denied.';
      if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in your browser settings.';
      if (err.name === 'OverconstrainedError') {
        // Retry with looser constraints
        return startCamera_fallback(facing);
      }
      setError(msg);
      setStatus('error');
    }
  }, [facingMode]);

  const startCamera_fallback = async (facing) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('active');
    } catch (err) {
      setError('Could not access camera: ' + err.message);
      setStatus('error');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const flipCamera = useCallback(() => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    status,
    error,
    facingMode,
    startCamera,
    stopCamera,
    flipCamera,
    isActive: status === 'active',
  };
}
