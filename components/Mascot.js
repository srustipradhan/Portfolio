"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";

const WIDTH = 130;
const INK = "#0A0A0A";
const SKIN = "#F2B88C";
const HAIR = "#1E1511";
const HI = "#5E4333";
const fill = { transformBox: "fill-box" };
const sw = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" };
const sw2 = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" };

const STAR = "M0 -12 Q2.5 -2.5 12 0 Q2.5 2.5 0 12 Q-2.5 2.5 -12 0 Q-2.5 -2.5 0 -12 Z";

const OUTFITS = [
  { top: "var(--lime)", patch: INK, patchText: "var(--lime)", pants: "#1b1b1b", shoes: "var(--orange)", say: "Fit check! Lime hoodie, orange kicks. Ten out of ten, no notes." },
  { top: "var(--orange)", patch: INK, patchText: "var(--orange)", pants: "#1b1b1b", shoes: "var(--lime)", say: "Orange hoodie, lime kicks. This fit slaps, no cap." },
  { top: "var(--white)", patch: INK, patchText: "var(--white)", pants: "var(--lime)", shoes: INK, say: "Clean tee, lime pants. Main character energy." },
  { top: "#1b1b1b", patch: "var(--lime)", patchText: INK, pants: "var(--orange)", shoes: "var(--white)", shades: true, say: "Shades on. The drip is real." },
];

const PERCHES = {
  top: null,
  about: { x: 0.03, e: 0.3, label: "01 · About" },
  work: { x: 0.62, e: 0.14, label: "02 · Projects" },
  skills: { x: 0.04, e: 0.42, label: "03 · Skills" },
  experience: { x: 0.64, e: 0.3, label: "04 · Journey" },
  contact: { x: 0.03, e: 0.16, label: "05 · Contact" },
};

const sectionLines = {
  about: "That's me! Mobile full stack developer, 1+ years in.",
  work: "Scroll slowly. Each project gets its own phone screen!",
  skills: "Hover a row to light it up.",
  experience: "Two roles so far, and still learning every day.",
  contact: "Got a project? Tell me about it. It only takes three quick steps.",
};

const replies = [
  { q: "Who are you?", a: "I'm Srusti, a mobile full stack developer. I build apps with Flutter, Kotlin, SwiftUI and React Native, with Go and Node.js on the backend.", go: "#about" },
  { q: "What can you build?", a: "Mobile apps for Android and iOS, REST API integrations, Go and Node.js backends, and I can publish them on the Play Store and App Store too.", go: "#skills" },
  { q: "Show me your projects", a: "Three so far: an energy monitoring app, a beauty marketplace with a Go backend, and an AI travel assistant with local language support.", go: "#work" },
  { q: "Where have you worked?", a: "Right now I'm a Software Developer at Amplify Today in Bengaluru. Before that I was a Software Analyst at Best Infra in Hyderabad.", go: "#experience" },
  { q: "I want to hire you", a: "Wonderful! Tell me what you need in the form. It's three quick steps and I'll get back to you.", go: "#contact" },
  { q: "Tell me a joke", joke: true },
  { q: "Fit check!", fit: true },
  { q: "Dance!", dance: true },
];
const ACTS = [["walk", 34], ["code", 16], ["phone", 12], ["coffee", 12], ["stretch", 8], ["jump", 8], ["look", 6], ["sleep", 4], ["fit", 10]];
const ACT_MS = { code: 9000, phone: 7000, coffee: 6500, stretch: 3600, jump: 3300, look: 4200, sleep: 7500, fit: 7600 };
const ACT_SAY = { code: "Time to ship some code!", phone: "Testing the app on my phone.", coffee: "Coffee first, then Flutter.", stretch: "Stretch break!", jump: "Yay!", look: "Anyone need an app built?", sleep: "Zzz... just resting my eyes." };
const pickAct = (last) => {
  const pool = ACTS.filter(([n]) => n !== last);
  let r = Math.random() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [n, w] of pool) { r -= w; if (r <= 0) return n; }
  return "walk";
};

const jokes = [
  "Why do Flutter developers never get lost? Everything is a widget, so they always know where they stand.",
  "There are 10 kinds of people: those who understand binary and those who don't.",
  "A programmer's partner says: go to the store and get a loaf of bread, and if they have eggs, get a dozen. They come back with 12 loaves of bread.",
  "I'd tell you a UDP joke, but you might not get it.",
];

function useTypewriter(text, onDone) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => { i += 1; setN(i); if (i >= text.length) { clearInterval(id); done.current?.(); } }, 26);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, n);
}

function Typed({ text, onDone }) {
  return <span>{useTypewriter(text, onDone)}</span>;
}

const swing = [-26, 26, -26];
const T = (d, rep = true) => ({ duration: d, repeat: rep ? Infinity : 0, ease: "easeInOut" });
const limb = { ...fill, originX: 0.5, originY: 0 };

function Arm({ x, anim, tr, color }) {
  return (
    <g transform={`translate(${x} 138)`}>
      <motion.g animate={{ rotate: anim }} transition={tr} style={limb}>
        <path d="M0 0 L0 30" stroke={INK} strokeWidth="11" strokeLinecap="round" />
        <path d="M0 0 L0 30" stroke={color} strokeWidth="7.5" strokeLinecap="round" />
        <circle cx="0" cy="34" r="6.5" fill={SKIN} {...sw2} />
      </motion.g>
    </g>
  );
}

function MascotSVG({ mode, talking, px, py, tilt, dir, o }) {
  const walking = mode === "walk", dancing = mode === "dance", waving = mode === "wave", held = mode === "held";
  const coding = mode === "code", phoning = mode === "phone", coffee = mode === "coffee", stretch = mode === "stretch";
  const jump = mode === "jump" || mode === "leap", sleeping = mode === "sleep", look = mode === "look", fit = mode === "fit";
  const sitting = coding || sleeping;
  const focused = coding || phoning || sleeping;

  // where the eyes point
  const bx = useSpring(0, { stiffness: 90, damping: 14 });
  const by = useSpring(0, { stiffness: 90, damping: 14 });
  useEffect(() => {
    let id;
    if (walking) { bx.set(dir * 14); by.set(0); }
    else if (look) { const seq = [-16, 16, -8, 12]; let i = 0; const go = () => { bx.set(seq[i % seq.length]); i += 1; }; go(); id = setInterval(go, 800); by.set(0); }
    else { bx.set(0); by.set(coding || phoning ? 8 : coffee ? -3 : 0); }
    return () => clearInterval(id);
  }, [mode, dir, bx, by, walking, look, coding, phoning, coffee]);
  const ex = useTransform([px, bx], ([a, b]) => a + b);
  const ey = useTransform([py, by], ([a, b]) => a + b);
  const eyeX = focused ? bx : ex;
  const eyeY = focused ? by : ey;

  // arm + leg poses
  let L = 0, R = 0, AT = T(0.5, false);
  if (walking) { L = swing.map((v) => -v); R = swing; AT = T(0.7); }
  else if (waving) { R = [-150, -120, -150]; AT = T(0.45); }
  else if (dancing) { L = [150, 110, 150]; R = [-150, -110, -150]; AT = T(0.5); }
  else if (held || jump) { L = 150; R = -150; }
  else if (coding) { L = [-5, 5, -5]; R = [5, -5, 5]; AT = T(0.28); }
  else if (phoning) { L = -95; R = 95; }
  else if (coffee) { R = [128, 138, 128]; AT = T(1.5); }
  else if (fit) { L = [28, 28, 34, 34]; R = [-28, -28, 95, 95]; AT = { duration: 3.4, times: [0, 0.62, 0.78, 1], ease: "easeInOut" }; }
  else if (stretch) { L = [165, 176, 165]; R = [-165, -176, -165]; AT = T(1.1); }
  // 3D turning: rotateX / rotateY with perspective; show the back of her when she faces away
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const [back, setBack] = useState(false);
  const facing = () => setBack(Math.cos((rx.get() * Math.PI) / 180) * Math.cos((ry.get() * Math.PI) / 180) < 0);
  useMotionValueEvent(rx, "change", facing);
  useMotionValueEvent(ry, "change", facing);
  useEffect(() => {
    const norm = (mv) => { let a = mv.get() % 360; if (a > 180) a -= 360; if (a < -180) a += 360; mv.set(a); };
    norm(rx); norm(ry);
    const c = [];
    const spring = { type: "spring", stiffness: 70, damping: 12 };
    if (mode === "fit") { c.push(animate(ry, 360, { duration: 2.2, ease: "easeInOut" })); c.push(animate(rx, 0, spring)); }
    else if (mode === "leap") { c.push(animate(rx, -360, { duration: 0.95, ease: "easeInOut" })); c.push(animate(ry, 0, spring)); }
    else if (mode === "jump") { c.push(animate(rx, [0, -360], { duration: 0.75, ease: "easeInOut", repeat: Infinity })); c.push(animate(ry, 0, spring)); }
    else if (mode === "dance") { c.push(animate(ry, [-35, 35, -35], { duration: 1.1, ease: "easeInOut", repeat: Infinity })); c.push(animate(rx, 0, spring)); }
    else if (mode === "look") { c.push(animate(ry, [-34, 34, -34], { duration: 3.2, ease: "easeInOut", repeat: Infinity })); c.push(animate(rx, 0, spring)); }
    else if (mode === "walk") { c.push(animate(ry, dir * 30, spring)); c.push(animate(rx, 0, spring)); }
    else if (mode === "wave") { c.push(animate(ry, 16, spring)); c.push(animate(rx, 0, spring)); }
    else { c.push(animate(ry, 0, spring)); c.push(animate(rx, 0, spring)); }
    return () => c.forEach((k) => k.stop());
  }, [mode, dir, rx, ry]);

  const legSwing = dancing ? [-12, 12, -12] : [-22, 22, -22];
  const legRot = (sgn) => (sitting ? sgn * 82 : held ? sgn * 14 : jump ? sgn * 20 : walking || dancing ? (sgn > 0 ? legSwing : legSwing.map((v) => -v)) : 0);
  const blinkAnim = sleeping ? { scaleY: 0.08 } : { scaleY: [1, 1, 0.1, 1, 1] };
  const blinkT = sleeping ? { duration: 0.3 } : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.94, 0.97, 1] };
  const headRot = sleeping ? 14 : look ? [-8, 8, -8] : fit ? 7 : coding || phoning ? 5 : 0;

  return (
    <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 700, originY: 0.6 }}>
    <motion.svg viewBox="0 0 160 255" width="100%" role="img" aria-label="Srusti's cartoon assistant"
      animate={fit
        ? { y: 0, rotate: 0 }
        : { y: mode === "leap" ? 0 : jump ? [0, -52, 0] : walking ? [0, -4, 0] : dancing ? [0, -12, 0] : held ? 0 : [0, -2, 0], rotate: dancing ? [-6, 6, -6] : walking ? dir * 3 : stretch ? [-2, 2, -2] : 0 }}
      transition={fit
        ? { duration: 0.4 }
        : { duration: jump ? 0.75 : walking ? 0.35 : dancing ? 0.5 : stretch ? 1.1 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ overflow: "visible", ...fill, originX: 0.5, originY: 1 }}>
      <defs><clipPath id="mascot-mouth"><path d="M164 294 Q200 350 236 294 Z" /></clipPath></defs>
      <motion.ellipse cx="80" cy="246" rx="38" ry="6" fill="rgba(0,0,0,.35)" animate={{ scale: jump ? [1, 0.6, 1] : 1 }} transition={{ duration: 0.75, repeat: jump ? Infinity : 0 }} style={{ ...fill, originX: 0.5, originY: 0.5 }} />

      <motion.g animate={{ y: sitting ? 38 : 0 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}>
        {/* legs */}
        {[[68, 1], [92, -1]].map(([lx, sgn]) => (
          <g key={lx} transform={`translate(${lx} 192)`}>
            <motion.g animate={{ rotate: legRot(sgn) }} transition={walking || dancing ? T(walking ? 0.7 : 0.5) : { type: "spring", stiffness: 140, damping: 14 }} style={limb}>
              <rect x="-6" y="0" width="12" height="38" rx="6" fill={o.pants} {...sw2} />
              <ellipse cx="0" cy="41" rx="11" ry="6.5" fill={o.shoes} {...sw2} />
            </motion.g>
          </g>
        ))}

        {/* hoodie */}
        <path d="M42 198 C40 148 56 124 80 124 C104 124 120 148 118 198 Z" fill={o.top} {...sw2} />
        {!back && <path d="M68 130 C72 146 88 146 92 130" fill="none" {...sw2} strokeWidth="2" />}
        {!back && <rect x="64" y="162" width="32" height="18" rx="4" fill={o.patch} />}
        {!back && <text x="80" y="175" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="10" fill={o.patchText}>&lt;/&gt;</text>}

        {/* head */}
        <motion.g animate={{ rotate: headRot }} transition={look ? T(1.6) : { duration: 0.5 }} style={{ ...fill, originX: 0.5, originY: 1 }}>
          <motion.g style={{ ...fill, originX: 0.5, originY: 1, rotate: tilt }}>
            <g transform="translate(80 84) scale(0.4) translate(-200 -238)">
              {back ? (
                <g>
                  <path d="M78 235 C66 120 128 62 200 62 C272 62 334 120 322 235 C324 285 330 312 336 336 C310 350 286 344 276 324 L124 324 C114 344 90 350 64 336 C70 312 76 285 78 235 Z" fill={HAIR} {...sw} />
                  <ellipse cx="200" cy="238" rx="112" ry="104" fill={HAIR} {...sw} />
                  <path d="M200 130 C196 190 196 250 200 310 M150 150 C140 200 142 260 150 312 M250 150 C260 200 258 260 250 312 M120 190 C116 230 118 270 126 300 M280 190 C284 230 282 270 274 300" fill="none" stroke={HI} strokeWidth="4" strokeLinecap="round" />
                  <g transform="rotate(-28 262 150)"><rect x="244" y="142" width="38" height="16" rx="8" fill="var(--lime)" {...sw} strokeWidth="3.5" /></g>
                </g>
              ) : (
                <>
              <path d="M78 235 C66 120 128 62 200 62 C272 62 334 120 322 235 C324 285 330 312 336 336 C310 350 286 344 276 324 L124 324 C114 344 90 350 64 336 C70 312 76 285 78 235 Z" fill={HAIR} {...sw} />
              <ellipse cx="200" cy="238" rx="112" ry="104" fill={SKIN} {...sw} />
              <ellipse cx="128" cy="286" rx="21" ry="13" fill="#FF6B4A" opacity="0.5" />
              <ellipse cx="272" cy="286" rx="21" ry="13" fill="#FF6B4A" opacity="0.5" />
              {[158, 242].map((cx) => (
                <motion.g key={cx} animate={blinkAnim} transition={blinkT} style={{ ...fill, originX: 0.5, originY: 0.5 }}>
                  <motion.g style={{ x: eyeX, y: eyeY }}>
                    <ellipse cx={cx} cy="248" rx="17" ry="22" fill={INK} />
                    <circle cx={cx + 5} cy="240" r="7" fill="#fff" />
                    <circle cx={cx - 6} cy="256" r="3.5" fill="#fff" />
                  </motion.g>
                </motion.g>
              ))}
              {o.shades && (
                <g>
                  <rect x="116" y="222" width="80" height="54" rx="20" fill={INK} /><rect x="204" y="222" width="80" height="54" rx="20" fill={INK} />
                  <path d="M194 244 L206 244" stroke={INK} strokeWidth="7" />
                  <path d="M130 234 L152 234 M218 234 L240 234" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
                </g>
              )}
              <path d="M136 206 Q158 192 182 204" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
              <path d="M218 204 Q242 192 264 206" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
              <path d="M196 272 Q200 277 205 273" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <motion.g animate={{ scaleY: talking ? [1, 0.45, 1, 0.6, 1] : stretch ? [1, 1.5, 1] : 1 }} transition={{ duration: stretch ? 1.1 : 0.45, repeat: talking || stretch ? Infinity : 0 }} style={{ ...fill, originX: 0.5, originY: 0 }}>
                <path d="M164 294 Q200 350 236 294 Z" fill="#4A1410" />
                <g clipPath="url(#mascot-mouth)">
                  <path d="M160 290 L240 290 L240 304 Q200 314 160 304 Z" fill="#fff" />
                  <ellipse cx="200" cy="334" rx="22" ry="13" fill="#FF7A7A" />
                </g>
                <path d="M164 294 Q200 350 236 294 Z" fill="none" {...sw} strokeWidth="4.5" />
              </motion.g>
              <path d="M80 238 C66 118 128 58 202 58 C280 58 336 118 320 238 C316 196 292 160 260 146 C234 134 204 128 182 130 C140 150 104 190 80 238 Z" fill={HAIR} {...sw} />
              <path d="M178 70 C168 92 168 112 182 128 M196 64 C220 88 250 118 276 164 M214 62 C244 84 276 112 298 156 M122 110 C106 140 98 180 98 214" fill="none" stroke={HI} strokeWidth="4" strokeLinecap="round" />
              <path d="M80 238 C78 280 74 308 64 336 C84 346 102 338 110 320 C113 294 109 266 105 240 Z" fill={HAIR} {...sw} />
              <path d="M320 238 C322 280 326 308 336 336 C316 346 298 338 290 320 C287 294 291 266 295 240 Z" fill={HAIR} {...sw} />
              <g transform="rotate(-28 262 150)"><rect x="244" y="142" width="38" height="16" rx="8" fill="var(--lime)" {...sw} strokeWidth="3.5" /></g>
                </>
              )}
            </g>
          </motion.g>
        </motion.g>

        {/* laptop (coding) */}
        {coding && (
          <g>
            <rect x="52" y="142" width="56" height="31" rx="4" fill="var(--orange)" {...sw2} />
            <circle cx="80" cy="157" r="3" fill="#fff" />
            <rect x="44" y="173" width="72" height="6" rx="3" fill="#222" {...sw2} />
          </g>
        )}

        {/* arms (drawn after the head so hands stay visible) */}
        <Arm x={46} anim={L} tr={AT} color={o.top} />
        <Arm x={114} anim={R} tr={AT} color={o.top} />

        {/* phone */}
        {phoning && (
          <g transform="translate(80 138)">
            <rect x="-9" y="-14" width="18" height="30" rx="4" fill={INK} />
            <rect x="-7" y="-12" width="14" height="26" rx="3" fill="#fff" />
            {[0, 1, 2].map((i) => (
              <motion.rect key={i} x="-5" width="10" height="4" rx="2" fill={i === 1 ? "var(--orange)" : "var(--lime)"} stroke={INK} strokeWidth="0.8" initial={{ y: -8 + i * 9 }} animate={{ y: [-8 + i * 9, -17 + i * 9] }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
            ))}
          </g>
        )}

        {/* coffee */}
        {coffee && (
          <motion.g animate={{ y: [0, -3, 0] }} transition={T(1.5)}>
            <rect x="82" y="110" width="14" height="14" rx="3" fill="#fff" {...sw2} />
            <path d="M96 114 Q103 114 103 119 Q103 124 96 123" fill="none" {...sw2} strokeWidth="2" />
            <rect x="84" y="112" width="10" height="4" fill="#7A3B1B" />
            {[86, 92].map((sx, i) => (
              <motion.path key={sx} d={`M${sx} 106 Q${sx - 3} 101 ${sx} 96 Q${sx + 3} 91 ${sx} 87`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], y: [4, -6] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5 }} />
            ))}
          </motion.g>
        )}
      </motion.g>

      {/* code symbols floating up */}
      {coding && ["</>", "{ }", ";", "()"].map((c, i) => (
        <motion.text key={c} x={i % 2 ? 138 : 14} y="150" fontFamily="monospace" fontWeight="800" fontSize="15" fill={i % 2 ? "var(--orange)" : "var(--lime)"} stroke={INK} strokeWidth="0.6" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [150, 100] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55 }}>{c}</motion.text>
      ))}
      {sleeping && ["z", "Z", "z"].map((c, i) => (
        <motion.text key={i} x={112 + i * 8} y="70" fontFamily="var(--font-display)" fontSize={14 + i * 5} fill="var(--white)" stroke={INK} strokeWidth="0.6" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [70, 30 - i * 6], x: [112 + i * 8, 124 + i * 8] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7 }}>{c}</motion.text>
      ))}
      {fit && (
        <>
          <g transform="translate(80 138)">
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 0.2 }}>
              <rect x="-9" y="-14" width="18" height="30" rx="4" fill={INK} />
              <rect x="-7" y="-12" width="14" height="26" rx="3" fill="#2a2a2a" />
              <circle cx="0" cy="-7" r="2.6" fill="var(--lime)" />
            </motion.g>
            <motion.circle cx="0" cy="-4" r="9" fill="#fff" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 3.2, 4.2] }} transition={{ delay: 2.7, duration: 0.5 }} style={{ ...fill, originX: 0.5, originY: 0.5 }} />
          </g>
          <g transform="translate(122 46) rotate(8)">
            <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 3.1, type: "spring", stiffness: 300, damping: 12 }} style={{ ...fill, originX: 0.5, originY: 0.5 }}>
              <rect x="-27" y="-13" width="54" height="26" rx="13" fill="var(--lime)" stroke={INK} strokeWidth="2.5" />
              <text x="0" y="6" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fill={INK}>10/10</text>
            </motion.g>
          </g>
        </>
      )}
      {fit && [[18, 96], [142, 104], [24, 176], [138, 182], [80, 14]].map(([sx, sy], i) => (
        <g key={i} transform={`translate(${sx} ${sy})`}>
          <motion.path d={STAR} fill={i % 2 ? "var(--orange)" : "var(--lime)"} stroke={INK} strokeWidth="1.5" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 0], rotate: [0, 90, 180] }} transition={{ duration: 1.3, repeat: Infinity, delay: 2.9 + i * 0.25 }} style={{ ...fill, originX: 0.5, originY: 0.5 }} />
        </g>
      ))}
      {look && (
        <motion.text x="118" y="34" fontFamily="var(--font-display)" fontSize="26" fill="var(--orange)" stroke={INK} strokeWidth="0.8" animate={{ scale: [0.7, 1.15, 0.7], rotate: [-10, 10, -10] }} transition={T(1)} style={{ ...fill, originX: 0.5, originY: 0.5 }}>?</motion.text>
      )}
    </motion.svg>
    </motion.div>
  );
}

export default function Mascot() {
  const x = useMotionValue(-200);
  const y = useMotionValue(0);
  const layer = useRef(null);
  const [mode, setMode] = useState("idle"); // idle | walk | wave | dance | held
  const [dir, setDir] = useState(1);
  const [msg, setMsg] = useState(null);
  const [talking, setTalking] = useState(false);
  const [open, setOpen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [align, setAlign] = useState("l");
  const [outfit, setOutfit] = useState(0);
  const [perch, setPerch] = useState(null);
  const [busy, setBusy] = useState(false);
  const perchRef = useRef(null);
  const secRef = useRef("top");
  const jumpCtl = useRef([]);
  const draggingRef = useRef(false);
  const outfitRef = useRef(0);
  const walkCtl = useRef(null);
  const hideTimer = useRef(null);
  const msgId = useRef(0);
  const openRef = useRef(false);
  const voiceRef = useRef(false);
  const reduced = useRef(false);
  const seen = useRef(new Set());
  openRef.current = open;
  voiceRef.current = voice;

  // eye follow + head tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 120, damping: 16 };
  const px = useSpring(useTransform(mx, [-1, 1], [-8, 8]), spring);
  const py = useSpring(useTransform(my, [-1, 1], [-5, 5]), spring);
  const tilt = useSpring(useTransform(mx, [-1, 1], [-5, 5]), spring);

  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!voiceRef.current) return;
    const u = new SpeechSynthesisUtterance(text);
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find((c) => /^en/i.test(c.lang) && /female|samantha|zira|heera|veena|karen|moira|tessa|google/i.test(c.name)) || vs.find((c) => /^en/i.test(c.lang));
    if (v) u.voice = v;
    u.pitch = 1.2; u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }, []);

  const say = useCallback((text) => {
    clearTimeout(hideTimer.current);
    msgId.current += 1;
    setMsg({ id: msgId.current, text });
    setTalking(true);
    speak(text);
  }, [speak]);

  const onTyped = useCallback(() => {
    setTalking(false);
    clearTimeout(hideTimer.current);
    if (!openRef.current) hideTimer.current = setTimeout(() => setMsg(null), 4800);
  }, []);

  const startFit = useCallback(() => {
    const next = (outfitRef.current + 1) % OUTFITS.length;
    setMode("fit");
    setTimeout(() => { outfitRef.current = next; setOutfit(next); }, 1100);
    setTimeout(() => say(OUTFITS[next].say), 3000);
  }, [say]);

  // leap (3D front flip) onto a floating platform for the section, or back to the ground
  const leapTo = useCallback((id) => {
    const cfg = PERCHES[id];
    const vw = window.innerWidth; const vh = window.innerHeight;
    const w = Math.min(vw - 24, vw < 700 ? 180 : 240);
    const target = cfg ? { id, label: cfg.label, w, elev: Math.max(90, cfg.e * vh), left: Math.max(12, Math.min(vw - w - 12, cfg.x * vw)) } : null;
    const tx = target ? target.left + (w - WIDTH) / 2 : Math.min(Math.max(x.get(), 16), vw - WIDTH - 16);
    const ty = target ? -target.elev : 0;
    walkCtl.current?.stop(); jumpCtl.current.forEach((c) => c.stop());
    setPerch(null); perchRef.current = null; setBusy(true); setMode("leap");
    const y0 = y.get(); const apex = Math.min(y0, ty) - 120;
    jumpCtl.current = [
      animate(x, tx, { duration: 0.95, ease: "easeInOut" }),
      animate(y, [y0, apex, ty], { duration: 0.95, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"], onComplete: () => {
        perchRef.current = target; setPerch(target); setMode("idle"); setBusy(false);
      } }),
    ];
  }, [x, y]);

  const scrollTo = (sel) => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth" });

  // setup: mouse, focus, reduced motion
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (e) => { mx.set((e.clientX / window.innerWidth - 0.5) * 2); my.set((e.clientY / window.innerHeight - 0.5) * 2); };
    const fin = (e) => setTyping(!!e.target.matches?.("input, textarea"));
    const fout = () => setTyping(false);
    window.addEventListener("mousemove", move);
    document.addEventListener("focusin", fin);
    document.addEventListener("focusout", fout);
    return () => { window.removeEventListener("mousemove", move); document.removeEventListener("focusin", fin); document.removeEventListener("focusout", fout); window.speechSynthesis?.cancel(); };
  }, [mx, my]);

  // intro: walk in and greet
  useEffect(() => {
    let t1; let t2; let ctl;
    if (reduced.current) { x.set(24); setReady(true); return; }
    t1 = setTimeout(() => {
      setMode("walk"); setDir(1);
      ctl = animate(x, 24, { duration: 2.2, ease: "linear", onComplete: () => {
        setMode("wave"); setReady(true);
        say("Hi! I'm Srusti. Click me to chat, or drag me around!");
        t2 = setTimeout(() => setMode((m) => (m === "wave" ? "idle" : m)), 2600);
      } });
    }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); ctl?.stop(); };
  }, [x, say]);

  // choose something to do: walk somewhere or pick an activity
  useEffect(() => {
    if (!ready || reduced.current || open || dragging || typing || hidden || busy) return;
    let t; let stopped = false; let last = "";
    const rest = (lo, hi) => { t = setTimeout(next, lo + Math.random() * (hi - lo)); };
    const hop = () => {
      const pr = perchRef.current;
      const lo = pr ? pr.left : 16;
      const hi = pr ? pr.left + pr.w - WIDTH : window.innerWidth - WIDTH - 16;
      const target = lo + Math.random() * Math.max(0, hi - lo);
      const dist = Math.abs(target - x.get());
      if (dist < 90) { rest(300, 800); return; }
      setDir(target > x.get() ? 1 : -1); setMode("walk");
      walkCtl.current = animate(x, target, { duration: dist / 95, ease: "linear", onComplete: () => { setMode("idle"); rest(1200, 2600); } });
    };
    function next() {
      if (stopped) return;
      const act = pickAct(last);
      last = act;
      if (act === "walk") { hop(); return; }
      setMode(act);
      if (act === "fit") startFit();
      else if (ACT_SAY[act]) say(ACT_SAY[act]);
      t = setTimeout(() => { setMode("idle"); rest(1400, 3200); }, ACT_MS[act]);
    }
    t = setTimeout(next, 2500);
    return () => { stopped = true; clearTimeout(t); walkCtl.current?.stop(); setMode((m) => (m === "held" || m === "dance" || m === "fit" || m === "leap" ? m : "idle")); };
  }, [ready, open, dragging, typing, hidden, busy, x, say, startFit]);

  // jump from section to section; comment the first time each one is reached
  useEffect(() => {
    if (!ready) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const id = en.target.id;
        if (!en.isIntersecting || secRef.current === id) return;
        secRef.current = id;
        if (openRef.current || draggingRef.current || reduced.current) return;
        leapTo(id);
        if (sectionLines[id] && !seen.current.has(id)) { seen.current.add(id); setTimeout(() => { if (!openRef.current) say(sectionLines[id]); }, 1100); }
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    ["top", ...Object.keys(sectionLines)].forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ready, say, leapTo]);

  // keep bubble on screen
  useMotionValueEvent(x, "change", (v) => {
    const w = window.innerWidth;
    const a = v < 190 ? "l" : v > w - WIDTH - 190 ? "r" : "c";
    setAlign((p) => (p === a ? p : a));
  });

  const ask = (r) => {
    if (r.fit) { startFit(); setTimeout(() => setMode((m) => (m === "fit" ? "idle" : m)), ACT_MS.fit); return; }
    if (r.dance) { setMode("dance"); say("Ta-da! I practise between builds."); setTimeout(() => setMode("idle"), 3600); return; }
    if (r.joke) { say(jokes[Math.floor(Math.random() * jokes.length)]); return; }
    say(r.a);
    if (r.go) setTimeout(() => scrollTo(r.go), 500);
  };
  const toggleVoice = () => {
    const next = !voice; voiceRef.current = next; setVoice(next);
    if (next) speak("Voice is on."); else window.speechSynthesis?.cancel();
  };
  const hide = () => { say("See you soon!"); setTimeout(() => { setOpen(false); setMsg(null); setHidden(true); window.speechSynthesis?.cancel(); }, 1100); };

  const toggleOpen = () => {
    if (open) { setOpen(false); setMsg(null); window.speechSynthesis?.cancel(); setTalking(false); return; }
    if (window.innerWidth < 700) { walkCtl.current?.stop(); animate(x, 12, { duration: 0.4 }); }
    setOpen(true); say("Hi! What would you like to know?");
  };

  return (
    <div className="mascot-layer" ref={layer}>
      {hidden && <button className="mascot-call" onClick={() => { setHidden(false); setMode("wave"); setTimeout(() => setMode("idle"), 2200); say("I'm back!"); }} data-hover>Call Srusti back</button>}
      <AnimatePresence>
        {perch && !hidden && (
          <motion.div key={perch.id} className="perch" style={{ left: perch.left, width: perch.w, bottom: perch.elev - 12 }} initial={{ opacity: 0, scaleX: 0.3 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.3 }} transition={{ type: "spring", stiffness: 220, damping: 16 }}>
            <span>{perch.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!hidden && (
        <motion.div className="mascot-wrap" style={{ x, y, width: WIDTH }}>
            <AnimatePresence>
            {(open || msg) && (
              <motion.div key={open ? "panel" : "bubble"} className={`bubble ${align} ${open ? "panel" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                {open && <div className="panel-top"><b>Chat with Srusti</b><span><button type="button" className={voice ? "vbtn on" : "vbtn"} onClick={toggleVoice} aria-pressed={voice}>{voice ? "Voice on" : "Voice off"}</button><button type="button" className="xbtn" onClick={toggleOpen} aria-label="Close chat">×</button></span></div>}
                <p aria-live="polite">{msg && <Typed key={msg.id} text={msg.text} onDone={onTyped} />}</p>
                {open && (
                  <div className="replies">
                    {replies.map((r) => <button type="button" key={r.q} onClick={() => ask(r)}>{r.q}</button>)}
                    <button type="button" className="hide" onClick={hide}>Hide me</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {!hidden && (
        <motion.div className="mascot" style={{ x, y, width: WIDTH }} drag dragConstraints={layer} dragElastic={0} dragMomentum={false} data-hover
          role="button" tabIndex={0} aria-label="Chat with Srusti's assistant" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleOpen(); } }}
          onTap={toggleOpen}
          onDragStart={() => { walkCtl.current?.stop(); jumpCtl.current.forEach((c) => c.stop()); draggingRef.current = true; setDragging(true); setMode("held"); }}
          onDragEnd={() => {
            draggingRef.current = false; setDragging(false); setMode("idle");
            const pr = perchRef.current; const cx = x.get() + WIDTH / 2; const cy = y.get();
            const onPlatform = pr && cx > pr.left && cx < pr.left + pr.w && Math.abs(cy + pr.elev) < 90;
            if (!onPlatform) { perchRef.current = null; setPerch(null); }
            animate(y, onPlatform ? -pr.elev : 0, { type: "spring", stiffness: 260, damping: 11 });
          }}
          whileHover={{ scale: 1.04 }}>
          <MascotSVG mode={mode} talking={talking} px={px} py={py} tilt={tilt} dir={dir} o={OUTFITS[outfit]} />
        </motion.div>
      )}
    </div>
  );
}
