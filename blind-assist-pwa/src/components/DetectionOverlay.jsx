// src/components/DetectionOverlay.jsx
// Canvas overlay that draws bounding boxes on top of the video feed
// High-contrast colors, large labels — readable for low-vision users

import { useEffect, useRef } from 'react';

const DANGER_COLOR = '#FF3B30';   // iOS red — immediate danger
const SAFE_COLOR = '#34C759';     // iOS green — safe objects
const LABEL_BG_ALPHA = 0.85;

const DANGER_OBJECTS = new Set([
  'person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle',
  'fire hydrant', 'stop sign', 'traffic light', 'dog', 'cat',
  'horse', 'bear', 'scissors', 'knife', 'cow'
]);

export function DetectionOverlay({ detections, videoRef, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth || video.offsetWidth;
    const vh = video.videoHeight || video.offsetHeight;

    // Match canvas to actual rendered video size
    const rendered = video.getBoundingClientRect();
    canvas.width = rendered.width;
    canvas.height = rendered.height;

    // Scale factor from video pixels → rendered pixels
    const scaleX = rendered.width / vw;
    const scaleY = rendered.height / vh;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections || detections.length === 0) return;

    detections.forEach(({ class: cls, score, bbox }) => {
      const [x, y, w, h] = bbox;
      const rx = x * scaleX;
      const ry = y * scaleY;
      const rw = w * scaleX;
      const rh = h * scaleY;
      const isDanger = DANGER_OBJECTS.has(cls);
      const color = isDanger ? DANGER_COLOR : SAFE_COLOR;
      const confidence = Math.round(score * 100);

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = isDanger ? 3 : 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Subtle glow on danger objects
      if (isDanger) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.shadowBlur = 0;
      }

      // Label background
      const label = `${cls} ${confidence}%`;
      const fontSize = Math.max(14, Math.min(20, rw / 6));
      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      const textMetrics = ctx.measureText(label);
      const labelW = textMetrics.width + 12;
      const labelH = fontSize + 10;
      const labelY = ry > labelH + 4 ? ry - labelH - 4 : ry + 4;

      // Label pill background
      ctx.fillStyle = isDanger
        ? `rgba(255, 59, 48, ${LABEL_BG_ALPHA})`
        : `rgba(0, 0, 0, ${LABEL_BG_ALPHA})`;
      _roundRect(ctx, rx, labelY, labelW, labelH, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, rx + 6, labelY + labelH - 6);

      // Corner accent marks for danger (more visible)
      if (isDanger) {
        _drawCornerMarks(ctx, rx, ry, rw, rh, color);
      }
    });
  }, [detections, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function _drawCornerMarks(ctx, x, y, w, h, color) {
  const len = Math.min(20, w * 0.15, h * 0.15);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'square';

  // Top-left
  ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len); ctx.stroke();
}
