"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Avatar3D from "./Avatar3D";
import { replyToChat } from "@/lib/chat";
import { speakText, stopSpeaking, voiceSupported } from "@/lib/voice";
import { scrollToSelector } from "@/lib/scroll";

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
    a: "Great call! Fill out the contact form below — I reply faster than an async await.",
    go: "#contact",
  },
];

// Calm stationary ambient poses (never walks away, flips, turns, or spams bubbles)
const ACTS = [
  ["idle", 38],
  ["code", 26],
  ["coffee", 18],
  ["phone", 18],
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
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const [mode, setMode] = useState("idle");
  const [msg, setMsg] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [talking, setTalking] = useState(false);
  const [open, setOpen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [canSpeak, setCanSpeak] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);

  const hideTimer = useRef(null);
  const replyTimer = useRef(null);
  const talkTimer = useRef(null);
  const actTimer = useRef(null);
  const msgId = useRef(0);
  const openRef = useRef(false);
  const hiddenRef = useRef(false);
  const voiceRef = useRef(false);
  const speakingRef = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setCanSpeak(voiceSupported()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    openRef.current = open;
    hiddenRef.current = hidden;
    voiceRef.current = voice;
  }, [open, hidden, voice]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, botTyping, chatMode]);

  const voiceMessage = (code) =>
    code === "not-allowed" ? "Your browser blocked audio. Click anywhere on the page, then switch the sound on again."
    : code === "no-audio" ? "The voice didn't start. Check your volume and that this browser has a speech voice installed."
    : `Voice problem (${code}).`;

  const speak = useCallback((text) => {
    if (!voiceRef.current) { stopSpeaking(); speakingRef.current = false; setSpeaking(false); return; }
    speakText(text, {
      onStart: () => { speakingRef.current = true; setSpeaking(true); setTalking(true); setVoiceNote(""); },
      onEnd: () => { speakingRef.current = false; setSpeaking(false); setTalking(false); },
      onError: (code) => { speakingRef.current = false; setSpeaking(false); setVoiceNote(voiceMessage(code)); },
    });
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
    if (!speakingRef.current) setTalking(false);
    clearTimeout(hideTimer.current);
    if (!openRef.current) hideTimer.current = setTimeout(() => setMsg(null), 4000);
  }, []);

  const scrollTo = useCallback((sel) => {
    scrollToSelector(sel);
  }, []);

  // Setup: focus & reduced motion
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fin = (e) => setTyping(!!e.target.matches?.("input, textarea"));
    const fout = () => setTyping(false);
    document.addEventListener("focusin", fin);
    document.addEventListener("focusout", fout);
    return () => {
      clearTimeout(hideTimer.current);
      clearTimeout(replyTimer.current);
      clearTimeout(talkTimer.current);
      clearTimeout(actTimer.current);
      document.removeEventListener("focusin", fin);
      document.removeEventListener("focusout", fout);
      stopSpeaking();
    };
  }, []);

  // Brief in-place welcome once on entry (stays firmly anchored at bottom-left)
  useEffect(() => {
    if (reduced.current) {
      const t = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(t);
    }
    let t2;
    const t1 = setTimeout(() => {
      setReady(true);
      if (openRef.current || hiddenRef.current) return;
      setMode("wave");
      say("Hey, I'm Srusti — click here to chat.");
      t2 = setTimeout(() => setMode((m) => (m === "wave" ? "idle" : m)), 2200);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [say]);

  // Subtle stationary ambient poses only (no movement across screen)
  useEffect(() => {
    if (!ready || reduced.current || open || typing || hidden) return;
    let t;
    let stopped = false;
    let last = "";
    const rest = (lo, hi) => {
      t = setTimeout(next, lo + Math.random() * (hi - lo));
    };
    function next() {
      if (stopped) return;
      const act = pickAct(last);
      last = act;
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
      if (!openRef.current) setMode("idle");
    };
  }, [ready, open, typing, hidden]);

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
        talkTimer.current = setTimeout(() => { if (!speakingRef.current) setTalking(false); }, 1600);

        if (res.mood) {
          setMode(res.mood);
          actTimer.current = setTimeout(() => setMode("idle"), 2800);
        }
      }, 320);
    },
    [speak]
  );

  const toggleVoice = () => {
    if (!voiceSupported()) { setVoiceNote("This browser can't do text-to-speech. Try Chrome, Edge or Safari."); return; }
    const next = !voice;
    voiceRef.current = next;
    setVoice(next);
    setVoiceNote("");
    if (next) {
      speak(msg?.text || "Hi, I'm Srusti. Click a question or ask anything!");
    } else {
      stopSpeaking();
      speakingRef.current = false;
      setSpeaking(false);
      setTalking(false);
    }
  };

  const hide = () => {
    hiddenRef.current = true;
    openRef.current = false;
    clearTimeout(hideTimer.current);
    clearTimeout(replyTimer.current);
    clearTimeout(talkTimer.current);
    clearTimeout(actTimer.current);
    setOpen(false);
    setChatMode(false);
    setMsg(null);
    setMode("idle");
    speakingRef.current = false;
    setSpeaking(false);
    setTalking(false);
    setHidden(true);
    stopSpeaking();
  };

  const openChat = () => {
    hiddenRef.current = false;
    openRef.current = true;
    setHidden(false);
    setChatMode(false);
    setOpen(true);
    setMode("wave");
    say("Ask away — pick a question or type below.");
  };

  const closeChat = () => {
    openRef.current = false;
    setOpen(false);
    setChatMode(false);
    setMsg(null);
    setMode("idle");
    speakingRef.current = false;
    setSpeaking(false);
    setTalking(false);
    stopSpeaking();
  };

  return (
    <div className={`mascot-layer${open ? " open" : ""}`}>
      {hidden && (
        <button type="button" className="mascot-call" onClick={openChat} data-hover>
          <i aria-hidden="true" />
          Chat with Srusti
        </button>
      )}
      {!hidden && (
        <motion.div
          className="mascot-dock"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence>
            {(open || msg) && (
              <motion.div
                key={open ? "panel" : "bubble"}
                className={`bubble l${open ? " panel" : " teaser"}`}
                role={!open ? "button" : undefined}
                tabIndex={!open ? 0 : undefined}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!open) openChat();
                }}
                onKeyDown={(e) => {
                  if (!open && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    openChat();
                  }
                }}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
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
                      <button
                        type="button"
                        className={`snd${voice ? " on" : ""}${speaking ? " speaking" : ""}`}
                        onClick={toggleVoice}
                        aria-pressed={voice}
                        aria-label={voice ? "Turn sound off" : "Turn sound on"}
                        title={!canSpeak ? "Speech isn't supported in this browser" : voice ? "Sound on (click to mute)" : "Sound off (click to hear her)"}
                        disabled={!canSpeak}
                      >
                        <svg viewBox="0 0 34 32" width="21" height="20" aria-hidden="true">
                          <g transform="rotate(-10 15 16)">
                            <path
                              d="M9.5 18.5 L8 25.5 C7.7 26.8 8.7 27.5 10 27.5 L11.4 27.5 C12.4 27.5 13.1 26.8 13.3 25.8 L14.4 19.5"
                              fill="#FF5A1F"
                              stroke="#0A0A0A"
                              strokeWidth="2.2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M4.5 15.2 C4.5 13.2 6 11.8 8 11.8 L11.8 11.8 L20.5 6.4 C21.8 5.6 23.4 6.5 23.4 8 L23.4 22.4 C23.4 23.9 21.8 24.8 20.5 24 L11.8 18.6 L8 18.6 C6 18.6 4.5 17.2 4.5 15.2 Z"
                              fill="#F4F1EA"
                              stroke="#0A0A0A"
                              strokeWidth="2.2"
                              strokeLinejoin="round"
                            />
                            <path d="M11.6 12 L11.6 18.4" stroke="#0A0A0A" strokeWidth="2.2" />
                            <path d="M14.2 12.2 L19.2 9.2" stroke="#FF5A1F" strokeWidth="2.2" strokeLinecap="round" opacity={voice ? 1 : 0.45} />
                            {voice ? (
                              <>
                                <path className="w1" d="M25.6 11.6 Q28.2 15.2 25.6 18.8" fill="none" stroke="#0A0A0A" strokeWidth="2.4" strokeLinecap="round" />
                                <path className="w2" d="M28.2 8.8 Q31.6 15.2 28.2 21.6" fill="none" stroke="#0A0A0A" strokeWidth="2.4" strokeLinecap="round" />
                              </>
                            ) : (
                              <path d="M25.4 12.2 L29.8 17.8 M29.8 12.2 L25.4 17.8" stroke="#FF5A1F" strokeWidth="2.8" strokeLinecap="round" />
                            )}
                          </g>
                        </svg>
                      </button>
                      <button type="button" className="xbtn" onClick={closeChat} aria-label="Close chat">
                        ×
                      </button>
                    </span>
                  </div>
                )}

                {open && voiceNote && <p className="vnote" role="status">{voiceNote}</p>}

                <div className="panel-body" ref={open && chatMode ? logRef : undefined}>
                  {open && chatMode ? (
                    <div className="chat-log" aria-live="polite">
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
                </div>

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

          <div
            className="mascot"
            data-hover
            role="button"
            tabIndex={0}
            aria-label="Hide character"
            title="Click character to hide"
            onClick={hide}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                hide();
              }
            }}
          >
            <div className="mascot-body">
              <Avatar3D mode={mode} talking={talking} dir={1} outfit={0} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
