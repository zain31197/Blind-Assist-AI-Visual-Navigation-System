// src/utils/tts.js
// Web Speech API wrapper — zero network calls, runs entirely in browser

const DANGER_OBJECTS = new Set([
  'person','car','truck','bus','motorcycle','bicycle',
  'fire hydrant','stop sign','traffic light','stairs',
  'dog','cat','horse','cow','bear','scissors','knife'
]);

const POSITION_LABELS = { left: 'to your left', center: 'directly ahead', right: 'to your right' };

class TTSEngine {
  constructor() {
    this.synth    = window.speechSynthesis;
    this._speaking   = false;
    this._voice      = null;
    this._rate       = 1.0;
    this._pitch      = 1.0;
    this._lang       = 'en-US';
    this._initVoices();
  }

  _initVoices() {
    const load = () => {
      const voices = this.synth.getVoices();
      this._voice = voices.find(v =>
        v.lang.startsWith(this._lang.split('-')[0]) && (
          v.name.includes('Google') || v.name.includes('Samantha') ||
          v.name.includes('Karen')  || v.name.includes('Moira')
        )
      ) || voices.find(v => v.lang.startsWith(this._lang.split('-')[0])) || null;
    };
    if (this.synth.getVoices().length > 0) load();
    else this.synth.addEventListener('voiceschanged', load, { once: true });
  }

  applySettings({ rate, pitch, language }) {
    this._rate  = rate  ?? this._rate;
    this._pitch = pitch ?? this._pitch;
    if (language && language !== this._lang) {
      this._lang = language;
      this._initVoices(); // reload voice for new language
    }
  }

  speak(text, priority = 'normal') {
    if (!text || !this.synth) return;
    if (priority === 'critical') {
      this.synth.cancel();
      this._speaking = false;
    }
    if (this._speaking && priority !== 'critical') return;
    const utt      = new SpeechSynthesisUtterance(text);
    utt.voice      = this._voice;
    utt.lang       = this._lang;
    utt.rate       = priority === 'critical' ? Math.min(this._rate * 1.1, 2) : this._rate;
    utt.pitch      = priority === 'critical' ? Math.min(this._pitch * 1.2, 2) : this._pitch;
    utt.volume     = 1.0;
    this._speaking = true;
    utt.onend      = () => { this._speaking = false; };
    utt.onerror    = () => { this._speaking = false; };
    this.synth.speak(utt);
  }

  stop() {
    this.synth.cancel();
    this._speaking = false;
  }

  isSpeaking() { return this._speaking || this.synth.speaking; }
}

// ---- Detection helpers ------------------------------------
export function getPosition(bbox, frameWidth) {
  const cx = bbox[0] + bbox[2] / 2;
  const t  = frameWidth / 3;
  return cx < t ? 'left' : cx > t * 2 ? 'right' : 'center';
}

export function getDistance(bbox, frameHeight) {
  const rel = bbox[3] / frameHeight;
  if (rel > 0.45) return 'very close';
  if (rel > 0.25) return 'nearby';
  if (rel > 0.10) return 'ahead';
  return 'far ahead';
}

export function formatDetectionSpeech(detection, frameWidth, frameHeight) {
  const { class: cls, bbox } = detection;
  const pos    = getPosition(bbox, frameWidth);
  const dist   = getDistance(bbox, frameHeight);
  const posLbl = POSITION_LABELS[pos];
  const danger = DANGER_OBJECTS.has(cls);
  return danger
    ? { text: `Warning! ${cls} ${posLbl}, ${dist}.`, priority: 'critical' }
    : { text: `${cls} ${posLbl}.`, priority: 'normal' };
}

export function buildSceneDescription(detections, frameWidth, frameHeight) {
  if (!detections?.length) return 'No objects detected. Path appears clear.';
  const groups = { left: [], center: [], right: [] };
  detections.forEach(d => groups[getPosition(d.bbox, frameWidth)].push(d.class));
  const parts = [];
  if (groups.center.length) parts.push(`Ahead: ${groups.center.join(', ')}`);
  if (groups.left.length)   parts.push(`Left: ${groups.left.join(', ')}`);
  if (groups.right.length)  parts.push(`Right: ${groups.right.join(', ')}`);
  return parts.join('. ') + '.';
}

export const isDangerObject = cls => DANGER_OBJECTS.has(cls);
export const tts = new TTSEngine();
