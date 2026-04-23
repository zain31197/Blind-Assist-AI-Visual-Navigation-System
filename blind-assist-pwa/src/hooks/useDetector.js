// src/hooks/useDetector.js
// Loads COCO-SSD via TensorFlow.js, runs inference on video frames.
// Accepts user-configured confidence threshold from settings.

import { useState, useEffect, useRef, useCallback } from 'react';

const INFERENCE_INTERVAL_MS = 150;

export function useDetector(videoRef, isActive, confidenceThreshold = 0.45) {
  const modelRef = useRef(null);
  const rafRef   = useRef(null);
  const lastInferenceRef = useRef(0);
  const thresholdRef = useRef(confidenceThreshold);

  const [modelStatus, setModelStatus] = useState('idle');
  const [detections, setDetections]   = useState([]);
  const [fps, setFps]                 = useState(0);
  const fpsCountRef = useRef({ count: 0, start: Date.now() });

  // Keep threshold ref current without restarting loop
  useEffect(() => { thresholdRef.current = confidenceThreshold; }, [confidenceThreshold]);

  // Load TF.js + COCO-SSD once
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      setModelStatus('loading');
      try {
        const tf = await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
        await tf.setBackend('webgl');
        await tf.ready();
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        const model = await Promise.race([
          cocoSsd.load({ base: 'mobilenet_v2' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000)),
        ]);
        if (cancelled) return;
        modelRef.current = model;
        setModelStatus('ready');
      } catch (err) {
        if (!cancelled) { console.error('[BlindAssist] Model load failed:', err); setModelStatus('error'); }
      }
    }
    loadModel();
    return () => { cancelled = true; };
  }, []);

  // Inference
  const runInference = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !isActive) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) return;
    const now = Date.now();
    if (now - lastInferenceRef.current < INFERENCE_INTERVAL_MS) return;
    lastInferenceRef.current = now;
    try {
      const preds = await modelRef.current.detect(video, 10, thresholdRef.current);
      setDetections(preds);
      fpsCountRef.current.count++;
      if (now - fpsCountRef.current.start >= 1000) {
        setFps(fpsCountRef.current.count);
        fpsCountRef.current = { count: 0, start: now };
      }
    } catch (_) {}
  }, [videoRef, isActive]);

  // Animation loop
  useEffect(() => {
    if (modelStatus !== 'ready' || !isActive) return;
    let animating = true;
    const loop = async () => {
      if (!animating) return;
      await runInference();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      animating = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [modelStatus, isActive, runInference]);

  return { modelStatus, detections, fps, isModelReady: modelStatus === 'ready' };
}
