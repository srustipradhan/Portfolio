"use client";
import { motion } from "framer-motion";
import { experience, education } from "@/lib/data";

const cards = [
  ...experience.map((e) => ({ kind: "Work", ...e })),
  ...education.map((e) => ({ kind: "Education", ...e, points: [e.note] })),
];
const palette = [["var(--orange)", "var(--black)"], ["var(--lime)", "var(--black)"], ["var(--black)", "var(--white)"], ["var(--orange)", "var(--black)"]];

export default function Experience() {
  return (
    <section className="exp" id="experience">
      <div className="inner">
        <div className="label">( 04 ) Experience &amp; education</div>
        <h2 className="sec-title dark">THE <span>JOURNEY</span> SO FAR</h2>
        <div className="stack">
          {cards.map((c, i) => (
            <motion.article key={c.title} className="scard" style={{ background: palette[i][0], color: palette[i][1], top: 90 + i * 26 }}
              initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="sc-l">
                <span className="sc-kind">{c.kind}</span>
                <span className="sc-per">{c.period}</span>
              </div>
              <div className="sc-m">
                <h3>{c.title}</h3>
                <h4>{c.place}</h4>
                <small>{c.location}</small>
              </div>
              <ul className="sc-r">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
