// Text-to-speech for the character, built to avoid the usual browser pitfalls:
//  - Chrome drops a new line if you speak() right after cancel() while something is still playing
//  - utterances can be garbage-collected mid-speech (no events, speech cut off)
//  - long text is silently cut after ~15 s, so it is spoken in sentence-sized chunks
//  - prefers modern neural/natural/enhanced female voices and skips robotic novelty/Eloquence synths
//  - if nothing starts, retries smoothly with the next available voice and reports failures
const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

let token = 0;               // newest request wins; callbacks from older ones are ignored
const alive = new Set();     // keeps utterances referenced until they finish

export const voiceSupported = () => !!synth() && typeof SpeechSynthesisUtterance !== "undefined";

// voices load asynchronously in Chrome, so warm the list up early
if (typeof window !== "undefined" && synth()) {
  synth().getVoices();
  synth().addEventListener?.("voiceschanged", () => synth().getVoices());
}

// ---- pronunciation: make names, acronyms, tech terms, emails & phone numbers speak naturally ----
const SAY = [
  [/([a-z0-9._%+-]+)@([a-z0-9.-]+)\.([a-z]{2,})/gi, (_, u, d, t) => `${u.replace(/[._-]+/g, " ")} at ${d.replace(/\./g, " dot ")} dot ${t}`],
  [/\b(\d{5})(\d{5})\b/g, (_, a, b) => `${a.split("").join(" ")}, ${b.split("").join(" ")}`],
  [/pradhansrustisaranjana(\d+)/gi, "pradhaan srooshti saranjana $1"],
  [/Srusti/gi, "Srooshti"],
  [/Saranjana/gi, "Saaranjana"],
  [/Pradhan/gi, "Pradhaan"],
  [/\bB\.?Sc\.?/g, "Bachelor of Science"],
  [/\bMCA\b/g, "M C ay"],
  [/\bCGPA\b/g, "C G P ay"],
  [/\bBengaluru\b/g, "Bengalooru"],
  [/\bSwiftUI\b/g, "Swift U I"],
  [/\biOS\b/g, "eye O S"],
  [/\bAPIs\b/g, "ay P eyes"],
  [/\bAPI\b/g, "ay P I"],
  [/\bAI\b/g, "ay eye"],
  [/\b3D\b/gi, "three D"],
  [/\bNext\.js\b/gi, "Next J S"],
  [/\bThree\.js\b/gi, "Three J S"],
  [/\bNode\.js\b/gi, "Node J S"],
  [/\bExpress\.js\b/gi, "Express J S"],
  [/\bPostgreSQL\b/g, "Postgress Q L"],
  [/\bMySQL\b/g, "My S Q L"],
  [/\bSQLite\b/g, "S Q Lite"],
  [/\bSQL\b/g, "S Q L"],
  [/\bAWS\b/g, "ay W S"],
  [/\bSDLC\b/g, "S D L C"],
  [/\bCI\/CD\b/g, "C I C D"],
  [/\bUI\b/g, "U I"],
  [/\bUX\b/g, "U X"],
  [/\bGitHub\b/g, "Git Hub"],
  [/\bREST\b/g, "rest"],
  // "Go" the language, not the verb
  [/\bGo \(Golang\)/g, "Golang"],
  [/\b(with|using|in|on) Go\b/g, "$1 Golang"],
  [/\bGo( backends?| services?| and| &|,|\+)/g, "Golang$1"],
  [/\$\s*([\d,]+)\s*[–—-]\s*\$\s*([\d,]+)/g, "$1 to $2 dollars"],
  [/\$\s*([\d,]+)\+/g, "$1 plus dollars"],
  [/(\d+)\s*\/\s*(\d+)/g, "$1 out of $2"],
  [/\b0(\d)\+/g, "$1 plus"],
  [/(\d+)\+/g, "$1 plus"],
  [/\bz{2,}\b\.*/gi, ""],
  [/\s*\+\s*/g, " and "],
  [/\s*[–—]\s*/g, ", "],
  [/\.{2,}|…/g, ", "],
  [/\s*&\s*/g, " and "],
  [/\s*\/\s*/g, " and "],
];

export function pronounce(text) {
  let t = String(text);
  for (const [re, to] of SAY) t = t.replace(re, to);
  return t.replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
}

// ---- voices: exclude robotic Eloquence/novelty voices, prefer modern neural/natural female voices ----
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Eddy|Flo|Fred|Good News|Grandma|Grandpa|Jester|Junior|Kathy|Organ|Ralph|Reed|Rocko|Sandy|Shelley|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;
const PREFER = [
  "Ava", "Emma", "Aria", "Jenny", "Sonia", "Libby", "Neerja", "Veena", "Isha", "Aditi", "Priya", "Raveena",
  "Google UK English Female", "Google US English", "Zoe", "Serena", "Allison", "Nicky",
  "Moira", "Karen", "Tessa", "Fiona", "Hazel", "Samantha", "Zira",
];
const MALE = /\b(male|david|mark|daniel|rishi|alex|george|james|ryan|guy|thomas|eddy|reed|rocko|ravi|oliver|arthur)\b/i;
const score = (v) => {
  const i = PREFER.findIndex((n) => v.name.toLowerCase().includes(n.toLowerCase()));
  let sc = i >= 0 ? 100 - i * 2 : 0;
  if (/natural|neural|premium|enhanced/i.test(v.name)) sc += 40;
  if (/google/i.test(v.name)) sc += 18;
  if (/en[-_]IN/i.test(v.lang)) sc += 10;
  if (v.localService) sc += 2;
  if (MALE.test(v.name) && !/female/i.test(v.name)) sc -= 80;
  return sc;
};

const KEY = "srusti-voice";
const vid = (v) => `${v.name}|${v.lang}`;
const englishVoices = () => (synth()?.getVoices() || []).filter((v) => /^en/i.test(v.lang) && !NOVELTY.test(v.name));

export function voiceOptions() {
  return englishVoices()
    .sort((a, b) => score(b) - score(a))
    .map((v) => ({ id: vid(v), label: `${v.name.replace(/\s*\(.*\)/, "")} (${v.lang})` }));
}

export function getPreferredVoice() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function setPreferredVoice(id) {
  try { localStorage.setItem(KEY, id); } catch {}
}

export function onVoicesChanged(cb) {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener?.("voiceschanged", cb);
  return () => s.removeEventListener?.("voiceschanged", cb);
}

// candidates in the order they should be tried: visitor's pick, top ranked natural/neural voices, then best local voice
function candidates() {
  const list = englishVoices().sort((a, b) => score(b) - score(a));
  const picked = list.find((v) => vid(v) === getPreferredVoice());
  const local = list.find((v) => v.localService);
  return [picked, list[0], list[1], local].filter((v, i, a) => v && a.indexOf(v) === i);
}

function chunks(text, max = 170) {
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  const out = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = p; } else cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function stopSpeaking() {
  token += 1;
  synth()?.cancel();
}

// returns false if speech isn't possible. onError gets a short code: "no-audio", "not-allowed", ...
export function speakText(text, { onStart, onEnd, onError } = {}) {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === "undefined") return false;
  const clean = pronounce(String(text).replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, ""));
  if (!clean) return false;
  const my = ++token;

  const run = (attempt) => {
    if (my !== token) return;
    if (s.paused) s.resume();
    const parts = chunks(clean);
    let started = false;
    let left = parts.length;
    const list = candidates();
    const voice = list[attempt] || null;
    parts.forEach((part) => {
      const u = new SpeechSynthesisUtterance(part);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
      u.rate = 0.98;
      u.pitch = 1.0;
      u.volume = 1;
      alive.add(u);
      u.onstart = () => { if (my === token && !started) { started = true; onStart?.(); } };
      const done = () => { alive.delete(u); if (my === token && --left === 0) onEnd?.(); };
      u.onend = done;
      u.onerror = (e) => {
        alive.delete(u);
        if (my !== token || e.error === "canceled" || e.error === "interrupted") return;
        onError?.(e.error || "error");
        done();
      };
      s.speak(u);
    });
    // watchdog: if nothing started, retry cleanly with next voice candidate, then report failure
    setTimeout(() => {
      if (my !== token || started) return;
      if (attempt < list.length) { s.cancel(); setTimeout(() => run(attempt + 1), 90); } else onError?.("no-audio");
    }, 1600);
  };

  // cancel-then-speak in the same tick is unreliable; only wait when something is actually playing
  if (s.speaking || s.pending) { s.cancel(); setTimeout(() => run(0), 100); } else run(0);
  return true;
}
