"use client";
import { motion } from "framer-motion";
import Avatar3D from "./Avatar3D";

const sw = { stroke: "#0A0A0A", strokeWidth: 3.5, strokeLinejoin: "round", strokeLinecap: "round" };
const STAR = "M0 -15 Q3 -3 15 0 Q3 3 0 15 Q-3 3 -15 0 Q-3 -3 0 -15 Z";

export default function Character() {
  return (
    <div className="char" role="img" aria-label="3D illustration of Srusti, smiling in a lime hoodie and holding a phone">
      {/* Neubrutalist orange circular backdrop matching original portrait */}
      <div className="char-disc" />

      {/* Decorative stars */}
      <svg viewBox="0 0 400 500" className="char-decor" aria-hidden="true">
        <g transform="translate(58 150)">
          <motion.path
            d={STAR}
            fill="var(--lime)"
            {...sw}
            animate={{ scale: [1, 1.35, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          />
        </g>
        <g transform="translate(350 118)">
          <motion.path
            d={STAR}
            fill="#fff"
            {...sw}
            animate={{ scale: [1.2, 0.8, 1.2], rotate: [0, -90, 0] }}
            transition={{ duration: 3.2, repeat: Infinity }}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          />
        </g>
      </svg>

      {/* True 3D character bust (no flipping or turning, exact face) */}
      <div className="char-canvas-wrap">
        <Avatar3D variant="bust" mode="bust" outfit={0} />
      </div>
    </div>
  );
}
