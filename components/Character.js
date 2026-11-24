"use client";
import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const INK = "#0A0A0A";
const SKIN = "#F2B88C";
const HAIR = "#1E1511";
const HI = "#5E4333";
const fill = { transformBox: "fill-box" };
const sw = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" };
const STAR = "M0 -15 Q3 -3 15 0 Q3 3 0 15 Q-3 3 -15 0 Q-3 -3 0 -15 Z";

export default function Character() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  useEffect(() => {
    const m = (e) => { mx.set((e.clientX / window.innerWidth - 0.5) * 2); my.set((e.clientY / window.innerHeight - 0.5) * 2); };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, [mx, my]);
  const spring = { stiffness: 120, damping: 16 };
  const px = useSpring(useTransform(mx, [-1, 1], [-6, 6]), spring);
  const py = useSpring(useTransform(my, [-1, 1], [-4, 4]), spring);
  const tilt = useSpring(useTransform(mx, [-1, 1], [-4, 4]), spring);
  const blink = { animate: { scaleY: [1, 1, 0.1, 1, 1] }, transition: { duration: 4, repeat: Infinity, times: [0, 0.9, 0.94, 0.97, 1] }, style: { ...fill, originX: 0.5, originY: 0.5 } };

  return (
    <div className="char">
      <svg viewBox="0 0 400 500" role="img" aria-label="Cartoon illustration of Srusti, smiling in a lime hoodie and holding a phone">
        <defs>
          <clipPath id="mouth"><path d="M164 294 Q200 350 236 294 Z" /></clipPath>
        </defs>

        <circle cx="200" cy="290" r="176" fill="var(--orange)" {...sw} />

        {/* sparkles */}
        <g transform="translate(58 150)"><motion.path d={STAR} fill="var(--lime)" {...sw} strokeWidth="3.5" animate={{ scale: [1, 1.35, 1], rotate: [0, 90, 0] }} transition={{ duration: 2.6, repeat: Infinity }} style={{ ...fill, originX: 0.5, originY: 0.5 }} /></g>
        <g transform="translate(350 118)"><motion.path d={STAR} fill="#fff" {...sw} strokeWidth="3.5" animate={{ scale: [1.2, 0.8, 1.2], rotate: [0, -90, 0] }} transition={{ duration: 3.2, repeat: Infinity }} style={{ ...fill, originX: 0.5, originY: 0.5 }} /></g>

        <motion.g animate={{ y: [0, -7, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
          {/* hoodie body */}
          <path d="M88 500 C88 424 134 392 200 392 C266 392 312 424 312 500 Z" fill="var(--lime)" {...sw} />
          <path d="M150 404 C165 438 235 438 250 404" fill="none" {...sw} strokeWidth="4" />
          <path d="M184 428 L180 470 M216 428 L220 470" {...sw} strokeWidth="4" fill="none" />
          <rect x="172" y="440" width="56" height="34" rx="8" fill={INK} />
          <text x="200" y="464" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="18" fill="var(--lime)">&lt;/&gt;</text>
          <path d="M160 500 L160 484 Q200 478 240 484 L240 500" fill="none" {...sw} strokeWidth="3.5" opacity="0" />

          {/* neck */}
          <path d="M178 326 L222 326 L222 400 Q200 414 178 400 Z" fill={SKIN} {...sw} strokeWidth="4.5" />

          {/* head */}
          <g transform="translate(0 26)"><motion.g style={{ ...fill, originX: 0.5, originY: 1, rotate: tilt }}>
            {/* back hair */}
            <path d="M78 235 C66 120 128 62 200 62 C272 62 334 120 322 235 C324 285 330 312 336 336 C310 350 286 344 276 324 L124 324 C114 344 90 350 64 336 C70 312 76 285 78 235 Z" fill={HAIR} {...sw} />
            {/* face */}
            <ellipse cx="200" cy="238" rx="112" ry="104" fill={SKIN} {...sw} />
            {/* cheeks */}
            <ellipse cx="128" cy="286" rx="21" ry="13" fill="#FF6B4A" opacity="0.5" />
            <ellipse cx="272" cy="286" rx="21" ry="13" fill="#FF6B4A" opacity="0.5" />

            {/* eyes */}
            {[158, 242].map((x) => (
              <motion.g key={x} {...blink}>
                <motion.g style={{ x: px, y: py }}>
                  <ellipse cx={x} cy="248" rx="17" ry="22" fill={INK} />
                  <circle cx={x + 5} cy="240" r="7" fill="#fff" />
                  <circle cx={x - 6} cy="256" r="3.5" fill="#fff" />
                </motion.g>
              </motion.g>
            ))}
            <path d="M136 206 Q158 192 182 204" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
            <path d="M218 204 Q242 192 264 206" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
            <path d="M196 272 Q200 277 205 273" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />

            {/* mouth */}
            <path d="M164 294 Q200 350 236 294 Z" fill="#4A1410" />
            <g clipPath="url(#mouth)">
              <path d="M160 290 L240 290 L240 304 Q200 314 160 304 Z" fill="#fff" />
              <ellipse cx="200" cy="334" rx="22" ry="13" fill="#FF7A7A" />
            </g>
            <path d="M164 294 Q200 350 236 294 Z" fill="none" {...sw} strokeWidth="4.5" />

            {/* fringe (side-swept bangs) */}
            <path d="M80 238 C66 118 128 58 202 58 C280 58 336 118 320 238 C316 196 292 160 260 146 C234 134 204 128 182 130 C140 150 104 190 80 238 Z" fill={HAIR} {...sw} />
            <path d="M178 70 C168 92 168 112 182 128 M196 64 C220 88 250 118 276 164 M214 62 C244 84 276 112 298 156 M122 110 C106 140 98 180 98 214" fill="none" stroke={HI} strokeWidth="4" strokeLinecap="round" />
            {/* side locks */}
            <path d="M80 238 C78 280 74 308 64 336 C84 346 102 338 110 320 C113 294 109 266 105 240 Z" fill={HAIR} {...sw} />
            <path d="M320 238 C322 280 326 308 336 336 C316 346 298 338 290 320 C287 294 291 266 295 240 Z" fill={HAIR} {...sw} />
            {/* hair clip */}
            <g transform="rotate(-28 262 150)"><rect x="244" y="142" width="38" height="16" rx="8" fill="var(--lime)" {...sw} strokeWidth="3.5" /></g>
          </motion.g></g>
          {/* waving arm (left) */}
          <motion.g animate={{ rotate: [-12, 14, -12] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={{ ...fill, originX: 0.5, originY: 1 }}>
            <path d="M118 462 L78 392" stroke={INK} strokeWidth="46" strokeLinecap="round" />
            <path d="M118 462 L78 392" stroke="var(--lime)" strokeWidth="36" strokeLinecap="round" />
            <circle cx="70" cy="372" r="21" fill={SKIN} {...sw} />
            <path d="M62 354 L62 364 M72 352 L72 363 M82 354 L82 364" fill="none" {...sw} strokeWidth="3.5" />
          </motion.g>

          {/* phone arm (right) */}
          <rect x="316" y="296" width="62" height="112" rx="12" fill={INK} transform="rotate(10 347 352)" />
          <g transform="rotate(10 347 352)">
            <rect x="321" y="301" width="52" height="102" rx="8" fill="#fff" />
            <rect x="328" y="310" width="38" height="22" rx="5" fill="var(--orange)" />
            <motion.rect x="328" y="340" height="7" rx="3.5" fill={INK} animate={{ width: [14, 38, 14] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
            <rect x="328" y="354" width="30" height="7" rx="3.5" fill={INK} opacity="0.35" />
            <rect x="328" y="368" width="36" height="7" rx="3.5" fill={INK} opacity="0.35" />
            <rect x="328" y="382" width="38" height="14" rx="7" fill="var(--lime)" stroke={INK} strokeWidth="2.5" />
          </g>
          <path d="M290 462 L330 408" stroke={INK} strokeWidth="46" strokeLinecap="round" />
          <path d="M290 462 L330 408" stroke="var(--lime)" strokeWidth="36" strokeLinecap="round" />
          <circle cx="338" cy="396" r="19" fill={SKIN} {...sw} />

        </motion.g>
      </svg>
    </div>
  );
}
