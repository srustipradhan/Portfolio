"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Phone from "./Phone";
import { EnergyScreen, BeautyScreen, TravelScreen } from "./Screens";
import { projects } from "@/lib/data";

const bgs = ["var(--orange)", "var(--lime)", "var(--white)"];
const screens = [EnergyScreen, BeautyScreen, TravelScreen];
const tilt = [-7, 6, -5];

function Info({ p, i }) {
  return (
    <>
      <div className="pj-meta"><span>0{i + 1} / 03</span><span>{p.type}</span><span>{p.period}</span></div>
      <h2 className="pj-title">{p.title}</h2>
      <ul className="pj-points">{p.points.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className="pj-stack">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
    </>
  );
}

export default function Journey() {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setI(Math.max(0, Math.min(2, Math.floor(v * 3)))));
  const Screen = screens[i];

  return (
    <section id="work">
      {/* desktop: pinned, scroll-driven */}
      <motion.div className="journey" ref={ref} animate={{ backgroundColor: bgs[i] }} transition={{ duration: 0.5 }}>
        <div className="pin">
          <div className="pj-label">( 02 ) Projects</div>
          <div className="pj-text">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.4 }}>
                <Info p={projects[i]} i={i} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="pj-phone">
            <motion.div animate={{ rotate: tilt[i], y: [0, -10, 0] }} transition={{ rotate: { type: "spring", stiffness: 70, damping: 12 }, y: { duration: 4, repeat: Infinity } }}>
              <AnimatePresence mode="wait">
                <Phone key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.3 }}>
                  <Screen />
                </Phone>
              </AnimatePresence>
            </motion.div>
          </div>
          <div className="dots">{[0, 1, 2].map((k) => <motion.i key={k} animate={{ width: k === i ? 54 : 14, opacity: k === i ? 1 : 0.35 }} />)}</div>
        </div>
      </motion.div>

      {/* mobile: simple stacked list */}
      <div className="journey-m">
        {projects.map((p, k) => {
          const S = screens[k];
          return (
            <div key={p.title} className="jm" style={{ background: bgs[k] }}>
              {k === 0 && <div className="label">( 02 ) Projects</div>}
              <Info p={p} i={k} />
              <div className="jm-phone">
                <div className="phone-fit">
                  <Phone><S /></Phone>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
