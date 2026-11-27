// Text-to-speech for the character using en-IN-NeerjaExpressiveNeural (/api/tts),
// with automatic browser Web Speech fallback only if the network/server is unreachable.
import { DEFAULT_NEURAL_VOICE } from "./tts-voices";

const CACHE_LIMIT = 40;

const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

let token = 0;               // newest speech request wins
let activeCtrl = null;       // AbortController for in-flight /api/tts fetch
let activeAudio = null;      // currently playing HTMLAudioElement
const alive = new Set();     // keeps fallback SpeechSynthesisUtterance referenced until finished
const audioCache = new Map(); // cacheKey -> objectURL for instant repeat playback

export const voiceSupported = () =>
  typeof window !== "undefined" && (typeof Audio !== "undefined" || (!!synth() && typeof SpeechSynthesisUtterance !== "undefined"));

// Clean normalization for Neural Indian English voices (they handle "Bengaluru", "Kotlin", etc. natively)
const NEURAL_SAY = [
  [/([a-z0-9._%+-]+)@([a-z0-9.-]+)\.([a-z]{2,})/gi, (_, u, d, t) => `${u.replace(/[._-]+/g, " ")} at ${d.replace(/\./g, " dot ")} dot ${t}`],
  [/\b(\d{5})(\d{5})\b/g, (_, a, b) => `${a.split("").join(" ")}, ${b.split("").join(" ")}`],
  [/pradhansrustisaranjana(\d+)/gi, "pradhan srusti saranjana $1"],
  [/\bB\.?Sc\.?/g, "Bachelor of Science"],
  [/\bCI\/CD\b/g, "C I C D"],
  [/\$\s*([\d,]+)\s*[–—-]\s*\$\s*([\d,]+)/g, "$1 to $2 dollars"],
  [/\$\s*([\d,]+)\+/g, "$1 plus dollars"],
  [/(\d+)\s*\/\s*(\d+)/g, "$1 out of $2"],
  [/\b0(\d)\+/g, "$1 plus"],
  [/(\d+)\+/g, "$1 plus"],
  [/\s*\+\s*/g, " and "],
  [/\s*&\s*/g, " and "],
  [/\s*\/\s*/g, " and "],
  [/\bGo \(Golang\)/g, "Golang"],
  [/\b(with|using|in|on|keep|for|like) Go\b/gi, "$1 Golang"],
  [/\bGo( backends?| services?| and|,)/g, "Golang$1"],
  [/\bz{2,}\b\.*/gi, ""],
  [/\s*[–—]\s*/g, ", "],
  [/\.{2,}|…/g, ", "],
];

// Extra phonetic spelling hints reserved solely for offline Web Speech fallback
const FALLBACK_SAY = [
  [/Srusti/gi, "Srooshti"],
  [/\bBengaluru\b/g, "Bengalooru"],
  [/\bMCA\b/g, "M C ay"],
  [/\bCGPA\b/g, "C G P ay"],
  [/\bAPIs\b/g, "ay P eyes"],
  [/\bAPI\b/g, "ay P I"],
  [/\bAI\b/g, "ay eye"],
  [/\bAWS\b/g, "ay W S"],
  [/\bPostgreSQL\b/g, "Postgress Q L"],
  [/\bNext\.js\b/gi, "Next J S"],
  [/\bThree\.js\b/gi, "Three J S"],
  [/\bNode\.js\b/gi, "Node J S"],
  [/\bExpress\.js\b/gi, "Express J S"],
];

export function pronounce(text, extraRules = []) {
  let t = String(text).replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, "");
  for (const [re, to] of [...NEURAL_SAY, ...extraRules]) t = t.replace(re, to);
  return t.replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
}

function stopPlayback() {
  if (activeCtrl) {
    activeCtrl.abort();
    activeCtrl = null;
  }
  if (activeAudio) {
    activeAudio.onplaying = null;
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  synth()?.cancel();
}

export function stopSpeaking() {
  token += 1;
  stopPlayback();
}

function cachePut(key, url) {
  if (audioCache.has(key)) audioCache.delete(key);
  audioCache.set(key, url);
  while (audioCache.size > CACHE_LIMIT) {
    const oldestKey = audioCache.keys().next().value;
    const oldestUrl = audioCache.get(oldestKey);
    audioCache.delete(oldestKey);
    if (oldestUrl) URL.revokeObjectURL(oldestUrl);
  }
}

function fallbackSpeech(text, my, { onStart, onEnd, onError }) {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === "undefined") {
    onError?.("no-audio");
    return;
  }
  const clean = pronounce(text, FALLBACK_SAY);
  const list = s.getVoices() || [];
  const voice =
    list.find((v) => /\btessa\b/i.test(v.name)) ||
    list.find((v) => /^en/i.test(v.lang) && v.localService) ||
    list.find((v) => /^en/i.test(v.lang)) ||
    null;

  if (s.paused) s.resume();
  const u = new SpeechSynthesisUtterance(clean);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
  u.rate = 0.98;
  u.pitch = 1.0;
  alive.add(u);
  let started = false;
  u.onstart = () => { if (my === token && !started) { started = true; onStart?.(); } };
  u.onend = () => { alive.delete(u); if (my === token) onEnd?.(); };
  u.onerror = (e) => {
    alive.delete(u);
    if (my !== token || e.error === "canceled" || e.error === "interrupted") return;
    onError?.(e.error || "no-audio");
  };
  s.speak(u);
}

// returns false if speech isn't possible. onError gets a short code: "no-audio", "not-allowed", ...
export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!voiceSupported()) return false;
  const clean = pronounce(text);
  if (!clean) return false;

  const my = ++token;
  stopPlayback();

  const playUrl = (url) => {
    if (my !== token || typeof Audio === "undefined") return;
    const audio = new Audio(url);
    activeAudio = audio;
    let started = false;

    audio.onplaying = () => {
      if (my === token && !started) {
        started = true;
        onStart?.();
      }
    };
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      if (my === token) onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      if (my !== token) return;
      audioCache.delete(clean);
      URL.revokeObjectURL(url);
      fallbackSpeech(text, my, { onStart, onEnd, onError });
    };

    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        if (my !== token) return;
        if (activeAudio === audio) activeAudio = null;
        if (err?.name === "NotAllowedError") {
          onError?.("not-allowed");
        } else {
          fallbackSpeech(text, my, { onStart, onEnd, onError });
        }
      });
    }
  };

  const cached = audioCache.get(clean);
  if (cached) {
    audioCache.delete(clean);
    audioCache.set(clean, cached);
    playUrl(cached);
    return true;
  }

  const ctrl = new AbortController();
  activeCtrl = ctrl;

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice: DEFAULT_NEURAL_VOICE, text: clean }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      if (activeCtrl === ctrl) activeCtrl = null;
      if (my !== token) return;
      const url = URL.createObjectURL(blob);
      cachePut(clean, url);
      playUrl(url);
    })
    .catch((err) => {
      if (activeCtrl === ctrl) activeCtrl = null;
      if (my !== token || err?.name === "AbortError") return;
      fallbackSpeech(text, my, { onStart, onEnd, onError });
    });

  return true;
}
