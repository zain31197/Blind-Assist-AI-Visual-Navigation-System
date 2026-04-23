// src/utils/detectionThrottle.js
// Smart throttling: only announce objects that have persisted ≥persistenceMs
// or are newly-appearing danger objects.

const DANGER_OBJECTS = new Set([
  'person','car','truck','bus','motorcycle','bicycle',
  'fire hydrant','stop sign','traffic light','dog','cat',
  'horse','bear','scissors','knife','cow'
]);

export class DetectionThrottle {
  constructor({
    persistenceMs    = 1000,
    cooldownMs       = 4000,
    dangerCooldownMs = 2000,
    maxPerFrame      = 2,
  } = {}) {
    this.persistenceMs    = persistenceMs;
    this.cooldownMs       = cooldownMs;
    this.dangerCooldownMs = dangerCooldownMs;
    this.maxPerFrame      = maxPerFrame;
    this._tracked         = new Map();
    this._lastCleanup     = Date.now();
  }

  process(detections) {
    const now      = Date.now();
    const toAnnounce = [];
    const visible  = new Set(detections.map(d => d.class));

    if (now - this._lastCleanup > 5000) { this._cleanup(now); this._lastCleanup = now; }

    detections.forEach(det => {
      const cls     = det.class;
      const danger  = DANGER_OBJECTS.has(cls);
      const cooldown = danger ? this.dangerCooldownMs : this.cooldownMs;

      if (!this._tracked.has(cls)) {
        this._tracked.set(cls, { firstSeen: now, lastSeen: now, lastAnnounced: 0, detection: det });
      } else {
        const e = this._tracked.get(cls);
        e.lastSeen  = now;
        e.detection = det;
        const persisted  = (now - e.firstSeen) >= this.persistenceMs;
        const cooledDown = (now - e.lastAnnounced) >= cooldown;
        if (persisted && cooledDown) {
          toAnnounce.push(det);
          e.lastAnnounced = now;
        }
      }
    });

    // Reset first-seen for objects that disappeared
    this._tracked.forEach((e, cls) => {
      if (!visible.has(cls) && now - e.lastSeen > 2000) {
        e.firstSeen = now; e.lastAnnounced = 0;
      }
    });

    // Danger first, cap at maxPerFrame
    const danger = toAnnounce.filter(d => DANGER_OBJECTS.has(d.class));
    const safe   = toAnnounce.filter(d => !DANGER_OBJECTS.has(d.class));
    return [
      ...danger.slice(0, this.maxPerFrame),
      ...safe.slice(0, Math.max(0, this.maxPerFrame - danger.length)),
    ];
  }

  _cleanup(now) {
    for (const [cls, e] of this._tracked.entries()) {
      if (now - e.lastSeen > 10000) this._tracked.delete(cls);
    }
  }

  reset() { this._tracked.clear(); }
}
