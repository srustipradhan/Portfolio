"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const week = [["M", 40], ["T", 62], ["W", 48], ["T", 80], ["F", 56], ["S", 92], ["S", 70]];

export function EnergyScreen() {
  return (
    <div className="ps" style={{ background: "var(--white)" }}>
      <div className="ps-top"><span>Energy</span><span className="ps-chip">Nov</span></div>
      <div className="gauge">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="64" fill="none" stroke="#DDD8CB" strokeWidth="16" />
          <motion.circle cx="80" cy="80" r="64" fill="none" stroke="var(--orange)" strokeWidth="16" strokeLinecap="round"
            transform="rotate(-90 80 80)" initial={{ pathLength: 0 }} animate={{ pathLength: 0.72 }} transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }} />
        </svg>
        <div className="gauge-n"><b>248</b><small>kWh used</small></div>
      </div>
      <div className="wk">
        {week.map(([d, h], i) => (
          <div key={i}>
            <motion.i style={{ background: i === 5 ? "var(--orange)" : "var(--black)" }} initial={{ height: 0 }} animate={{ height: h }} transition={{ delay: 0.5 + i * 0.07, type: "spring", stiffness: 120, damping: 14 }} />
            <small>{d}</small>
          </div>
        ))}
      </div>
      <motion.div className="ps-btn" animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2 }}>Pay bill · ₹1,240</motion.div>
    </div>
  );
}

const partners = [["Aanya", "Hair stylist", "4.9", "var(--lime)"], ["Meera", "Makeup artist", "4.8", "var(--orange)"], ["Riya", "Skin care", "4.9", "var(--white)"]];

export function BeautyScreen() {
  return (
    <div className="ps dark">
      <div className="ps-top"><span>Discover</span><span className="ps-chip lime">12 near you</span></div>
      <div className="chips-row">
        {["Hair", "Makeup", "Skin", "Nails"].map((c, i) => <span key={c} className={i === 0 ? "on" : ""}>{c}</span>)}
      </div>
      {partners.map(([n, r, s, c], i) => (
        <motion.div className="pcard" key={n} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.14, type: "spring", stiffness: 110, damping: 14 }}>
          <span className="av" style={{ background: c }}>{n[0]}</span>
          <span className="pinfo"><b>{n}</b><small>{r} · ★ {s}</small></span>
          <span className="bk">Book</span>
        </motion.div>
      ))}
    </div>
  );
}

const chat = [
  { me: true, t: "Plan 3 days in Goa" },
  { me: false, t: "Day 1: Baga beach, Fort Aguada, sunset cruise." },
  { me: true, t: "हिंदी में बताओ" },
  { me: false, t: "दिन 1: बागा बीच, अगुआडा किला, सनसेट क्रूज़।" },
];

export function TravelScreen() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= chat.length + 1 ? 0 : v + 1)), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ps" style={{ background: "var(--lime)" }}>
      <div className="ps-top"><span>Trip guide</span><span className="ps-chip dk">EN · हिं</span></div>
      <div className="chat">
        {chat.slice(0, n).map((m, i) => (
          <motion.div key={i} className={`bub ${m.me ? "me" : "bot"}`} initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}>{m.t}</motion.div>
        ))}
        {n < chat.length && <div className="typing"><i /><i /><i /></div>}
      </div>
    </div>
  );
}
