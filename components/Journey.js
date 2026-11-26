"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import Phone from "./Phone";
import { EnergyScreen, BeautyScreen, TravelScreen } from "./Screens";
import { projects } from "@/lib/data";

const bgs = ["var(--orange)", "var(--lime)", "var(--white)"];
const screens = [EnergyScreen, BeautyScreen, TravelScreen];
const tilt = [-7, 6, -5];

// Phones: a horizontal swipe carousel. The phone swings and scales as you swipe, the text drifts at its own pace.
function Slide({ p, k, n, progress }) {
  const S = screens[k];
  const d = useTransform(progress, (v) => v * (n - 1) - k); // 0 = this slide is centred, ±1 = a full slide away
  const rotate = useTransform(d, [-1, 0, 1], [16, 0, -16]);
  const px = useTransform(d, [-1, 0, 1], [-80, 0, 80]);
  const scale = useTransform(d, [-1, 0, 1], [0.78, 1, 0.78]);
  const tx = useTransform(d, [-1, 0, 1], [70, 0, -70]);
  const fade = useTransform(d, [-1, -0.5, 0, 0.5, 1], [0, 0.5, 1, 0.5, 0]);
  return (
    <div className="jm hs-slide" style={{ background: bgs[k] }}>
      <div className="label">( 02 ) Selected Projects</div>
      <motion.div style={{ x: tx, opacity: fade }}><Info p={p} i={k} /></motion.div>
      <div className="jm-phone">
        <motion.div style={{ rotate, x: px, scale, width: "100%", height: "100%" }}>
          <div className="phone-fit"><Phone><S /></Phone></div>
        </motion.div>
      </div>
    </div>
  );
}

function MobileProjects() {
  const ref = useRef(null);
  const { scrollXProgress } = useScroll({ container: ref });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollXProgress, "change", (v) => setActive(Math.max(0, Math.min(projects.length - 1, Math.round(v * (projects.length - 1))))));
  const go = (k) => ref.current?.scrollTo({ left: k * ref.current.clientWidth, behavior: "smooth" });
  return (
    <>
      <div className="hs" ref={ref} aria-label="Projects, swipe sideways">
        {projects.map((p, k) => <Slide key={p.title} p={p} k={k} n={projects.length} progress={scrollXProgress} />)}
      </div>
      <motion.div className="hs-bar" animate={{ backgroundColor: bgs[active] }} transition={{ duration: 0.4 }}>
        <div className="hs-dots">
          {projects.map((p, k) => (
            <button key={p.title} type="button" aria-label={`Show ${p.title}`} aria-current={k === active} onClick={() => go(k)}>
              <motion.i animate={{ width: k === active ? 38 : 12, opacity: k === active ? 1 : 0.4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} />
            </button>
          ))}
        </div>
        <span className="hs-hint">
          {active === 0 ? <motion.b animate={{ x: [0, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>Swipe →</motion.b> : <b>0{active + 1} / 0{projects.length}</b>}
        </span>
      </motion.div>
    </>
  );
}

function ArchiveBanner() {
  return (
    <div className="pj-archive">
      <div className="inner">
        <motion.div
          className="pj-archive-card"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pj-archive-num">
            <span>( Beyond featured )</span>
            <b>07+</b>
          </div>
          <div className="pj-archive-body">
            <h3>More projects shipped.</h3>
            <p>Additional production deliveries across mobile applications, web platforms, REST APIs, and backend services.</p>
          </div>
          <a href="#contact" className="pj-archive-cta">
            Discuss a project <span aria-hidden="true">→</span>
          </a>
        </motion.div>
      </div>
    </div>
  );
}

function Info({ p, i }) {
  return (
    <>
      <div className="pj-meta"><span>Featured 0{i + 1} / 03</span><span>{p.type}</span><span>{p.period}</span></div>
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
          <div className="pj-label">( 02 ) Selected Projects</div>
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

      {/* phones: horizontal swipe carousel */}
      <div className="journey-m">
        <MobileProjects />
      </div>

      <ArchiveBanner />
    </section>
  );
}
