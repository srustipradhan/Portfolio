"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { profile, enquiryOptions, services, techStackSummary } from "@/lib/data";

const ease = [0.16, 1, 0.3, 1];
const up = (d = 0) => ({ initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.7, delay: d, ease } });

const Ico = {
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>,
  in: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 8.7a1.9 1.9 0 110-3.8 1.9 1.9 0 010 3.8zM4.8 10h3.4v9.2H4.8zM10.2 10h3.2v1.3c.5-.9 1.6-1.5 3-1.5 3 0 3.6 1.9 3.6 4.4v4.9h-3.4v-4.3c0-1 0-2.4-1.5-2.4s-1.7 1.1-1.7 2.3v4.4h-3.4z" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
};

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch {}
  };
  return <button type="button" className="copy" onClick={copy}>{done ? "Copied ✓" : "Copy"}</button>;
}

const tiles = [
  { cls: "lime wide", ico: "mail", label: "Email", value: profile.email, href: `mailto:${profile.email}`, copy: true },
  { cls: "orange", ico: "phone", label: "Phone", value: profile.phone, href: `tel:${profile.phone}`, copy: true },
  { cls: "white", ico: "in", label: "LinkedIn", value: "Srusti Saranjana Pradhan", href: profile.linkedin, external: true },
  { cls: "dark wide", ico: "pin", label: "Based in", value: profile.location },
];

const EMPTY = { name: "", email: "", phone: "", company: "", intent: "", company_hp: "" };

function Form() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | mailto | error
  const [err, setErr] = useState("");
  const [d, setD] = useState(EMPTY);
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); setErr(""); };

  const validate = () => {
    if (!d.name.trim()) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Please enter a valid email.";
    if (d.phone.replace(/\D/g, "").length < 7) return "Please enter a valid phone number.";
    if (!d.intent) return "Please select one option for what you're looking for.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const m = validate();
    if (m) return setErr(m);
    setStatus("sending"); setErr("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (res.status === 501) {
        const subject = encodeURIComponent(`New enquiry: ${d.intent} (${d.name.trim()})`);
        const lines = [
          `What I'm looking for: ${d.intent}`,
          `Name: ${d.name.trim()}`,
          `Email: ${d.email.trim()}`,
          `Phone number: ${d.phone.trim()}`,
        ];
        if (d.company.trim()) lines.push(`Company name: ${d.company.trim()}`);
        window.location.href = `mailto:${profile.email}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
        return setStatus("mailto");
      }
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Something went wrong.");
      setStatus("sent");
    } catch (e) {
      setErr(e.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const reset = () => { setD(EMPTY); setStatus("idle"); setErr(""); };
  const done = status === "sent" || status === "mailto";
  const first = d.name.trim().split(" ")[0];

  return (
    <motion.div className="form-card" {...up(0.15)}>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="ok" className="form-ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 160, damping: 16 }}>
            <div className="ok-ring">
              <svg viewBox="0 0 80 80" width="60" height="60"><motion.path d="M20 42 L34 56 L60 26" fill="none" stroke="var(--black)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }} /></svg>
            </div>
            <h3>{status === "sent" ? `Thanks${first ? `, ${first}` : ""}!` : "Almost there!"}</h3>
            <p>{status === "sent" ? `I've received your details (${d.intent}) and will reply to ${d.email} shortly.` : "Your email app should have opened with your details. Just press send."}</p>
            <button type="button" className="again" onClick={reset}>Send another message</button>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="ct-form-wrap">
            <div className="form-head">
              <h3>Get in touch</h3>
              <p>Fill in your contact details and choose what you need.</p>
            </div>

            <form onSubmit={submit} className="ct-form" noValidate>
              <div className="row2">
                <label className="field">
                  <span>Your name</span>
                  <input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={100} placeholder="Jane Doe" autoComplete="name" required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} maxLength={200} placeholder="jane@company.com" autoComplete="email" required />
                </label>
              </div>

              <div className="row2">
                <label className="field">
                  <span>Phone number</span>
                  <input type="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} placeholder="+91 98765 43210" autoComplete="tel" required />
                </label>
                <label className="field">
                  <span>Company name <em>(optional)</em></span>
                  <input value={d.company} onChange={(e) => set("company", e.target.value)} maxLength={150} placeholder="Company name" autoComplete="organization" />
                </label>
              </div>

              <div className="field">
                <span>What are you looking for? <em>(select one)</em></span>
                <div className="chips" role="radiogroup" aria-label="What are you looking for?">
                  {enquiryOptions.map((o) => {
                    const on = d.intent === o;
                    return (
                      <motion.button
                        type="button"
                        key={o}
                        role="radio"
                        aria-checked={on}
                        className={on ? "chip on" : "chip"}
                        onClick={() => set("intent", o)}
                        whileTap={{ scale: 0.95 }}
                      >
                        {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="tick">✓</motion.span>}
                        {o}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <input tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" value={d.company_hp} onChange={(e) => set("company_hp", e.target.value)} />

              <AnimatePresence>
                {err && <motion.p className="form-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{err}{status === "error" && <> You can also email <a href={`mailto:${profile.email}`}>{profile.email}</a>.</>}</motion.p>}
              </AnimatePresence>

              <motion.button type="submit" className="send" disabled={status === "sending"} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                {status === "sending" ? <span className="spin" /> : <>Send message <span>↗</span></>}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Contact() {
  return (
    <>
      <section className="contact" id="contact">
        <div className="inner">
          <div className="label">( 05 ) Contact</div>
          <div className="ct-head">
            <motion.h2 className="ct-title" {...up()}>Let&apos;s work<br /><span>together.</span></motion.h2>
            <motion.div className="ct-avail" {...up(0.1)}><i /> Open to roles &amp; opportunities</motion.div>
          </div>

          <div className="ct-grid">
            <div className="ct-tiles">
              <motion.p className="ct-intro" {...up()}>Looking to hire, collaborate, or work together? Leave your details or reach me directly.</motion.p>
              {tiles.map((t, i) => {
                const inner = (
                  <>
                    <div className="tile-ico">{Ico[t.ico]}</div>
                    <div><small>{t.label}</small><b>{t.value}</b></div>
                  </>
                );
                return (
                  <motion.div key={t.label} className={`tile ${t.cls}`} {...up(0.08 * i)} whileHover={t.href ? { y: -6 } : undefined} whileTap={t.href ? { scale: 0.97 } : undefined}>
                    {t.href ? (
                      <a className="tile-main" href={t.href} target={t.external ? "_blank" : undefined} rel="noreferrer">{inner}<span className="go">↗</span></a>
                    ) : <div className="tile-main">{inner}</div>}
                    {t.copy && <CopyBtn text={t.value} />}
                  </motion.div>
                );
              })}
              <motion.div className="tile services wide" {...up(0.3)}>
                <small>What I can build for you</small>
                <p className="svc-sub">From concept to launch, across every layer.</p>
                <div className="svc">{services.map((x) => <span key={x}>{x}</span>)}</div>
                <div className="svc-stack">
                  <small>Tech Stack</small>
                  <p>{techStackSummary}</p>
                </div>
              </motion.div>
            </div>
            <Form />
          </div>
        </div>
      </section>
      <footer className="foot"><span>© {profile.name}</span><span>Built with Next.js &amp; Framer Motion</span></footer>
    </>
  );
}
