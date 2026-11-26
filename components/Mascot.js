"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import Avatar3D from "./Avatar3D";
import { replyToChat } from "@/lib/chat";
import { scrollToSelector } from "@/lib/scroll";

const WIDTH = 130;

const replies = [
  {
    q: "Who are you?",
    a: "I'm Srusti — Mobile Full Stack Developer. I build apps with Flutter, Kotlin, SwiftUI & React Native, and keep Go/Node.js backends running smoothly.",
    go: "#about",
  },
  {
    q: "What can you build?",
    a: "Android & iOS apps, REST APIs, Go & Node.js backends — and yes, I even survive App Store review guidelines.",
    go: "#skills",
  },
  {
    q: "Show me your projects",
    a: "10+ projects shipped overall — three featured here: an Energy Monitoring app, a Beauty Marketplace on Go & PostgreSQL, and an AI Travel Assistant that speaks local languages better than I do.",
    go: "#work",
  },
  {
    q: "Where have you worked?",
    a: "Currently a Software Developer at Amplify Today in Bengaluru; before that, Software Analyst at Best Infra in Hyderabad. Zero prod databases harmed.",
    go: "#experience",
  },
  {
    q: "I want to hire you",
    a: "Great call! Fill out the 3-step enquiry form below — I reply faster than an async await.",
    go: "#contact",
  },
];

// Calm ambient animations (never flips, turns, or spams bubbles)
const ACTS = [
  ["idle", 34],
  ["code", 24],
  ["coffee", 18],
  ["phone", 14],
  ["walk", 10],
];
const ACT_MS = { idle: 4500, code: 8000, coffee: 6500, phone: 6500 };

const pickAct = (last) => {
  const pool = ACTS.filter(([n]) => n !== last);
  let r = Math.random() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [n, w] of pool) {
    r -= w;
    if (r <= 0) return n;
  }
  return "idle";
};

function useTypewriter(text, onDone) {
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        doneRef.current?.();
      }
    }, 24);
    return () => clearInterval(id);
  }, [text]);

  return text.slice(0, n);
}

function Typed({ text, onDone }) {
  return <span>{useTypewriter(text, onDone)}</span>;
}

export default function Mascot() {
  const x = useMotionValue(-200);
  const layer = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const [mode, setMode] = useState("idle");
  const [dir, setDir] = useState(1);
  const [msg, setMsg] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [talking, setTalking] = useState(false);
  const [open, setOpen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [align, setAlign] = useState("l");

  const draggingRef = useRef(false);
  const walkCtl = useRef(null);
  const hideTimer = useRef(null);
  const replyTimer = useRef(null);
  const talkTimer = useRef(null);
  const actTimer = useRef(null);
  const msgId = useRef(0);
  const openRef = useRef(false);
  const voiceRef = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    openRef.current = open;
    voiceRef.current = voice;
  }, [open, voice]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, botTyping, chatMode]);

  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!voiceRef.current) return;
    const u = new SpeechSynthesisUtterance(text);
    const vs = window.speechSynthesis.getVoices();
    const v =
      vs.find((c) => /^en/i.test(c.lang) && /female|samantha|zira|heera|veena|karen|moira|tessa|google/i.test(c.name)) ||
      vs.find((c) => /^en/i.test(c.lang));
    if (v) u.voice = v;
    u.pitch = 1.15;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }, []);

  const say = useCallback(
    (text) => {
      clearTimeout(hideTimer.current);
      msgId.current += 1;
      setMsg({ id: msgId.current, text });
      setTalking(true);
      speak(text);
    },
    [speak]
  );

  const onTyped = useCallback(() => {
    setTalking(false);
    clearTimeout(hideTimer.current);
    if (!openRef.current) hideTimer.current = setTimeout(() => setMsg(null), 4000);
  }, []);

  const scrollTo = useCallback((sel) => {
    scrollToSelector(sel);
  }, []);

  // Setup: focus, resize clamp & reduced motion
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fin = (e) => setTyping(!!e.target.matches?.("input, textarea"));
    const fout = () => setTyping(false);
    const onResize = () => {
      const vw = window.innerWidth;
      const w = vw < 700 ? 96 : WIDTH;
      const max = Math.max(12, vw - w - 12);
      const cur = x.get();
      if (cur > max) x.set(max);
      else if (cur >= 0 && cur < 12) x.set(12);
    };
    document.addEventListener("focusin", fin);
    document.addEventListener("focusout", fout);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      clearTimeout(hideTimer.current);
      clearTimeout(replyTimer.current);
      clearTimeout(talkTimer.current);
      clearTimeout(actTimer.current);
      document.removeEventListener("focusin", fin);
      document.removeEventListener("focusout", fout);
      window.removeEventListener("resize", onResize);
      window.speechSynthesis?.cancel();
    };
  }, [x]);

  // Brief welcome once on entry
  useEffect(() => {
    let t1;
    let t2;
    let ctl;
    if (reduced.current) {
      x.set(24);
      setReady(true);
      return;
    }
    t1 = setTimeout(() => {
      setMode("walk");
      setDir(1);
      ctl = animate(x, 24, {
        duration: 1.8,
        ease: "linear",
        onComplete: () => {
          setMode("wave");
          setReady(true);
          say("Hey, I'm Srusti — click me to chat.");
          t2 = setTimeout(() => setMode((m) => (m === "wave" ? "idle" : m)), 2200);
        },
      });
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ctl?.stop();
    };
  }, [x, say]);

  // Subtle ambient poses only (no random speech bubbles while reading)
  useEffect(() => {
    if (!ready || reduced.current || open || dragging || typing || hidden) return;
    let t;
    let stopped = false;
    let last = "";
    const rest = (lo, hi) => {
      t = setTimeout(next, lo + Math.random() * (hi - lo));
    };
    const stroll = () => {
      const vw = window.innerWidth;
      const isMob = vw < 700;
      const w = isMob ? 96 : WIDTH;
      const lo = isMob ? 12 : 20;
      const hi = isMob ? Math.min(90, Math.max(lo, vw - w - 16)) : Math.min(220, Math.max(lo, vw - w - 20));
      const target = lo + Math.random() * Math.max(0, hi - lo);
      const dist = Math.abs(target - x.get());
      if (dist < 40) {
        rest(2500, 4500);
        return;
      }
      setDir(target > x.get() ? 1 : -1);
      setMode("walk");
      walkCtl.current = animate(x, target, {
        duration: dist / 75,
        ease: "linear",
        onComplete: () => {
          if (stopped) return;
          setMode("idle");
          rest(3000, 5500);
        },
      });
    };
    function next() {
      if (stopped) return;
      const act = pickAct(last);
      last = act;
      if (act === "walk") {
        stroll();
        return;
      }
      setMode(act);
      t = setTimeout(() => {
        if (stopped) return;
        setMode("idle");
        rest(2800, 5200);
      }, ACT_MS[act] || 4500);
    }
    t = setTimeout(next, 3500);
    return () => {
      stopped = true;
      clearTimeout(t);
      walkCtl.current?.stop();
      if (!openRef.current && !draggingRef.current) {
        setMode((m) => (m === "held" ? m : "idle"));
      }
    };
  }, [ready, open, dragging, typing, hidden, x]);

  // Keep panel on screen
  useMotionValueEvent(x, "change", (v) => {
    const w = window.innerWidth;
    if (w < 700) {
      const a = openRef.current ? "l" : v < w / 2 - 48 ? "l" : "r";
      setAlign((p) => (p === a ? p : a));
      return;
    }
    const a = v < 190 ? "l" : v > w - WIDTH - 190 ? "r" : "c";
    setAlign((p) => (p === a ? p : a));
  });

  const ask = useCallback(
    (r) => {
      say(r.a);
      if (r.go) setTimeout(() => scrollTo(r.go), 450);
    },
    [say, scrollTo]
  );

  const sendMessage = useCallback(
    (text) => {
      const clean = text.trim();
      if (!clean) return;

      clearTimeout(replyTimer.current);
      clearTimeout(talkTimer.current);
      clearTimeout(actTimer.current);

      msgId.current += 1;
      const userMsg = { id: msgId.current, from: "me", text: clean };
      setMessages((prev) => [...prev, userMsg]);
      setDraft("");
      setChatMode(true);
      setBotTyping(true);

      const res = replyToChat(clean);
      replyTimer.current = setTimeout(() => {
        msgId.current += 1;
        setMessages((prev) => [
          ...prev,
          { id: msgId.current, from: "bot", text: res.text, go: res.go, goLabel: res.goLabel },
        ]);
        setBotTyping(false);
        setTalking(true);
        speak(res.text);
        talkTimer.current = setTimeout(() => setTalking(false), 1600);

        if (res.mood) {
          setMode(res.mood);
          actTimer.current = setTimeout(() => setMode("idle"), 2800);
        }
      }, 320);
    },
    [speak]
  );

  const toggleVoice = () => {
    const next = !voice;
    voiceRef.current = next;
    setVoice(next);
    if (next) speak("Voice is on.");
    else window.speechSynthesis?.cancel();
  };

  const hide = () => {
    setOpen(false);
    setChatMode(false);
    setMsg(null);
    setHidden(true);
    window.speechSynthesis?.cancel();
  };

  const toggleOpen = () => {
    if (open) {
      openRef.current = false;
      setOpen(false);
      setChatMode(false);
      setMsg(null);
      setMode("idle");
      setTalking(false);
      window.speechSynthesis?.cancel();
      return;
    }
    openRef.current = true;
    walkCtl.current?.stop();
    if (window.innerWidth < 700) {
      setAlign("l");
      animate(x, 16, { duration: 0.28 });
    }
    setChatMode(false);
    setOpen(true);
    setMode("wave");
    say("Ask away — pick a question or type below.");
  };

  return (
    <div className="mascot-layer" ref={layer}>
      {hidden && (
        <button
          className="mascot-call"
          onClick={() => {
            setHidden(false);
            setMode("wave");
            setTimeout(() => setMode("idle"), 1800);
          }}
          data-hover
        >
          Show Srusti
        </button>
      )}
      {!hidden && (
        <motion.div className="mascot-wrap" style={{ x, width: WIDTH }}>
          <AnimatePresence>
            {(open || msg) && (
              <motion.div
                key={open ? "panel" : "bubble"}
                className={`bubble ${align} ${open ? "panel" : ""}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                {open && (
                  <div className="panel-top">
                    <b>
                      {chatMode && (
                        <button type="button" className="chat-back" onClick={() => setChatMode(false)}>
                          ← Back
                        </button>
                      )}
                      {!chatMode && "Chat with Srusti"}
                    </b>
                    <span>
                      {!chatMode && messages.length > 0 && (
                        <button type="button" className="vbtn" onClick={() => setChatMode(true)}>
                          Chat
                        </button>
                      )}
                      <button type="button" className={voice ? "vbtn on" : "vbtn"} onClick={toggleVoice} aria-pressed={voice}>
                        {voice ? "Voice on" : "Voice off"}
                      </button>
                      <button type="button" className="xbtn" onClick={toggleOpen} aria-label="Close chat">
                        ×
                      </button>
                    </span>
                  </div>
                )}

                {open && chatMode ? (
                  <div className="chat-log" ref={logRef} aria-live="polite">
                    {messages.map((m) => (
                      <div key={m.id} className={`chat-msg ${m.from}`}>
                        <span>{m.text}</span>
                        {m.go && (
                          <button
                            type="button"
                            className="chat-go"
                            onClick={() => {
                              scrollTo(m.go);
                              if (window.innerWidth < 700) setOpen(false);
                            }}
                          >
                            {m.goLabel || "Go there"} →
                          </button>
                        )}
                      </div>
                    ))}
                    {botTyping && (
                      <div className="chat-typing" aria-label="Typing">
                        <i />
                        <i />
                        <i />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p aria-live="polite">{msg && <Typed key={msg.id} text={msg.text} onDone={onTyped} />}</p>
                    {open && (
                      <div className="replies">
                        {replies.map((r) => (
                          <button type="button" key={r.q} onClick={() => ask(r)}>
                            {r.q}
                          </button>
                        ))}
                        <button type="button" className="hide" onClick={hide}>
                          Hide me
                        </button>
                      </div>
                    )}
                  </>
                )}

                {open && (
                  <form
                    className="chat-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage(draft);
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={draft}
                      maxLength={240}
                      placeholder="Ask anything..."
                      aria-label="Message Srusti"
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button type="submit" disabled={!draft.trim() || botTyping}>
                      Send
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {!hidden && (
        <motion.div
          className="mascot"
          style={{ x, width: WIDTH }}
          drag={!open ? "x" : false}
          dragConstraints={layer}
          dragElastic={0}
          dragMomentum={false}
          data-hover
          role="button"
          tabIndex={0}
          aria-label="Chat with Srusti"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleOpen();
            }
          }}
          onTap={toggleOpen}
          onDragStart={() => {
            walkCtl.current?.stop();
            draggingRef.current = true;
            setDragging(true);
            setMode("held");
          }}
          onDragEnd={() => {
            draggingRef.current = false;
            setDragging(false);
            setMode("idle");
          }}
          onPointerCancel={() => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            setDragging(false);
            setMode("idle");
          }}
        >
          <div className="mascot-body">
            <Avatar3D mode={mode} talking={talking} dir={dir} outfit={0} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
