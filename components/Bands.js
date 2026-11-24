"use client";
import { motion } from "framer-motion";
import { marquee } from "@/lib/data";

function Band({ reverse, bg, rot }) {
  const row = marquee.map((s) => <span key={s}>{s}<i>✺</i></span>);
  return (
    <div className="band" style={{ background: bg, transform: `rotate(${rot}deg)` }}>
      <motion.div className="band-track" animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}>
        <div>{row}</div><div>{row}</div>
      </motion.div>
    </div>
  );
}

export default function Bands() {
  return (
    <div className="bands" aria-label="Skills">
      <Band bg="var(--lime)" rot={-2.5} />
      <Band bg="var(--orange)" rot={2.5} reverse />
    </div>
  );
}
