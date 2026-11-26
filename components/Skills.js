"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { skillGroups } from "@/lib/data";

const ease = [0.16, 1, 0.3, 1];

// True only when NO input on the device can hover (a phone). A touchscreen laptop with a mouse is not "touch only".
function useTouchOnly() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(any-hover: hover)");
    const upd = () => setV(!q.matches);
    upd();
    q.addEventListener("change", upd);
    return () => q.removeEventListener("change", upd);
  }, []);
  return v;
}

const rowV = { hidden: { opacity: 0, x: -50 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease, when: "beforeChildren" } } };
const listV = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } };
const chipV = { hidden: { opacity: 0, y: 14, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } } };

function Row({ g, i, touchOnly }) {
  const ref = useRef(null);
  const centred = useInView(ref, { margin: "-40% 0px -40% 0px" });
  const [hov, setHov] = useState(false);
  const on = hov || (touchOnly && centred); // mouse hover, or the row in the middle of the screen on a phone
  return (
    <motion.div ref={ref} className={`srow${on ? " on" : ""}`} data-hover
      variants={rowV} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}>
      <motion.span className="srow-bg" initial={false} animate={{ scaleY: on ? 1 : 0 }} transition={{ duration: 0.35, ease }} />
      <span className="srow-n">0{i + 1}</span>
      <h3>{g.title}</h3>
      <motion.p variants={listV}>
        {g.items.map((s) => <motion.span key={s} variants={chipV}>{s}</motion.span>)}
      </motion.p>
    </motion.div>
  );
}

export default function Skills() {
  const touchOnly = useTouchOnly();
  const titleRef = useRef(null);
  const titleIn = useInView(titleRef, { once: true, margin: "-60px" });
  return (
    <section className="skills" id="skills">
      <div className="inner">
        <div className="label">( 03 ) Technical skills</div>
        <div className="mask" ref={titleRef}>
          <motion.h2 className="sec-title" initial={{ y: "110%" }} animate={{ y: titleIn ? 0 : "110%" }} transition={{ duration: 0.9, ease }}>
            THE <span>TOOLBOX</span>
          </motion.h2>
        </div>
        <div className="srows">
          {skillGroups.map((g, i) => <Row key={g.title} g={g} i={i} touchOnly={touchOnly} />)}
        </div>
      </div>
    </section>
  );
}
