// src/components/DetectionList.jsx
// Bottom panel — scrollable list of detected objects
// High contrast, readable at arm's length

const DANGER_OBJECTS = new Set([
  'person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle',
  'fire hydrant', 'stop sign', 'traffic light', 'dog', 'cat',
  'horse', 'bear', 'scissors', 'knife', 'cow'
]);

const POSITION_ICONS = { left: '◄', center: '▲', right: '►' };

function getPosition(bbox, frameWidth) {
  const cx = bbox[0] + bbox[2] / 2;
  const third = frameWidth / 3;
  if (cx < third) return 'left';
  if (cx > third * 2) return 'right';
  return 'center';
}

export function DetectionList({ detections, frameWidth }) {
  if (!detections || detections.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyRow}>
          <span style={styles.emptyText}>● PATH CLEAR</span>
        </div>
      </div>
    );
  }

  // Sort: danger first, then by confidence
  const sorted = [...detections].sort((a, b) => {
    const aD = DANGER_OBJECTS.has(a.class) ? 1 : 0;
    const bD = DANGER_OBJECTS.has(b.class) ? 1 : 0;
    if (aD !== bD) return bD - aD;
    return b.score - a.score;
  });

  return (
    <div style={styles.container} role="region" aria-label="Detected objects">
      {sorted.slice(0, 5).map((det, i) => {
        const isDanger = DANGER_OBJECTS.has(det.class);
        const pos = getPosition(det.bbox, frameWidth || 640);
        const conf = Math.round(det.score * 100);
        const icon = POSITION_ICONS[pos];

        return (
          <div
            key={`${det.class}-${i}`}
            style={{
              ...styles.row,
              borderLeft: `3px solid ${isDanger ? '#FF3B30' : '#34C759'}`,
              background: isDanger
                ? 'rgba(255,59,48,0.12)'
                : 'rgba(52,199,89,0.08)',
            }}
            aria-label={`${det.class}, ${pos}, ${conf}% confidence`}
          >
            <span style={{
              ...styles.posIcon,
              color: isDanger ? '#FF3B30' : '#34C759',
            }}>
              {icon}
            </span>
            <span style={{
              ...styles.className,
              color: isDanger ? '#FF6B6B' : '#E5E5E5',
              fontWeight: isDanger ? 700 : 500,
            }}>
              {isDanger && '⚠ '}{det.class.toUpperCase()}
            </span>
            <span style={styles.confidence}>{conf}%</span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    background: 'linear-gradient(to top, rgba(0,0,0,0.92) 70%, transparent)',
    padding: '40px 16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    pointerEvents: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 6,
    backdropFilter: 'blur(4px)',
  },
  emptyRow: {
    padding: '10px 0',
    textAlign: 'center',
  },
  emptyText: {
    color: '#34C759',
    fontFamily: '"Courier New", monospace',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  posIcon: {
    fontFamily: 'monospace',
    fontSize: 12,
    width: 14,
    flexShrink: 0,
  },
  className: {
    fontFamily: '"Courier New", monospace',
    fontSize: 15,
    letterSpacing: '0.05em',
    flex: 1,
  },
  confidence: {
    color: '#666',
    fontFamily: '"Courier New", monospace',
    fontSize: 12,
    flexShrink: 0,
  },
};
