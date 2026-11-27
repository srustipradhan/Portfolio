import { profile, skillGroups, projects, experience, education, services } from "./data.js";

const has = (q, words) => words.some((w) => q.includes(w));
const word = (q, words) => new RegExp(`\\b(?:${words.join("|")})\\b`, "i").test(q);

// Generate a concise, accurate response from Srusti's portfolio data with light personality.
export function replyToChat(input) {
  const raw = String(input || "").trim();
  const q = raw.toLowerCase();

  if (!q) {
    return { text: "Type anything about my skills, projects, experience, or hiring!" };
  }

  // Greetings & small talk
  if (/^(hi|hey|hello|hola|namaste|yo|sup|good\s*(morning|afternoon|evening))\b/.test(q)) {
    return {
      text: `Hey! I'm ${profile.firstName}. Ask me about my mobile apps, backend stack, or how we can work together.`,
      mood: "wave",
    };
  }
  if (has(q, ["how are you", "how r u", "whats up", "what's up", "how's it going"])) {
    return {
      text: "Doing great — running on coffee and clean builds. What would you like to know about my work?",
      mood: "coffee",
    };
  }
  if (has(q, ["thank", "thx", "appreciate"]) || word(q, ["ty"])) {
    return {
      text: "Anytime! Let me know if you want to check out my projects or start an enquiry.",
      mood: "wave",
    };
  }
  if (word(q, ["bye", "goodbye", "cya"]) || has(q, ["see ya", "see you"])) {
    return {
      text: "See you around! Feel free to reach out anytime via the contact form.",
      mood: "wave",
    };
  }
  if (word(q, ["coffee", "tea", "chai"])) {
    return {
      text: "Always ready for coffee — half my Go services were designed over a good cup.",
      mood: "coffee",
    };
  }
  if (word(q, ["dance", "party", "celebrate"])) {
    return {
      text: "Brief post-deploy celebration — zero build errors!",
      mood: "dance",
    };
  }

  // Hiring, availability, freelance, roles
  if (has(q, ["hire", "freelance", "availab", "rate", "price", "cost", "budget", "quote", "contract", "opportunity"]) || word(q, ["job", "role"])) {
    return {
      text: "I'm open to full-time roles, freelance work, and new projects. Drop your contact details in the form below and I'll reply shortly.",
      go: "#contact",
      goLabel: "Open Contact Form",
      mood: "wave",
    };
  }

  // Contact details & location
  if (has(q, ["contact", "email", "mail", "phone", "whatsapp", "linkedin", "location", "bengaluru", "bangalore", "india"]) || word(q, ["call", "reach", "where", "city"])) {
    return {
      text: `I'm based in ${profile.location}. You can email ${profile.email}, call ${profile.phone}, or connect on LinkedIn.`,
      go: "#contact",
      goLabel: "Go to Contact",
    };
  }

  // Specific projects
  if (has(q, ["energy", "electricity", "ticket"]) || word(q, ["bill", "bills"])) {
    const p = projects[0];
    return {
      text: `${p.title} (${p.period}): built with ${p.stack.join(", ")} for electricity usage tracking, bill payments, and service tickets.`,
      go: "#work",
      goLabel: "View Projects",
    };
  }
  if (has(q, ["beauty", "marketplace", "salon", "postgres"])) {
    const p = projects[1];
    return {
      text: `${p.title} (${p.period}): ${p.stack.join(", ")} app connecting users with beauty professionals across Play Store & App Store.`,
      go: "#work",
      goLabel: "View Projects",
    };
  }
  if (word(q, ["travel", "trip", "language", "languages", "ai"])) {
    const p = projects[2];
    return {
      text: `${p.title} (${p.period}): conversational trip planner with local language support so users can plan itineraries effortlessly.`,
      go: "#work",
      goLabel: "View Projects",
    };
  }

  // Website / 3D meta (before "built" in projects)
  if (has(q, ["website"]) || word(q, ["3d", "site", "next", "three"])) {
    return {
      text: "This portfolio is built with Next.js, Framer Motion, and Three.js (React Three Fiber) — zero build errors harmed in the making.",
      mood: "code",
    };
  }

  // Experience & companies (check before generic "work"/"projects")
  if (has(q, ["experience", "compan", "amplify", "best infra", "worked", "career", "resume"]) || word(q, ["years", "cv"])) {
    const cur = experience[0];
    const prev = experience[1];
    return {
      text: `1+ years of experience — currently ${cur.title} at ${cur.place} (${cur.location}, ${cur.period}), and previously ${prev.title} at ${prev.place} (${prev.location}).`,
      go: "#experience",
      goLabel: "View Experience",
    };
  }

  // Projects overview
  if (has(q, ["project", "portfolio", "built"]) || word(q, ["apps", "app", "work"])) {
    return {
      text: "10+ projects shipped across mobile, backend & client work. Three featured here: an Energy Monitoring app (Flutter + REST), a Beauty Marketplace (Flutter + Go + PostgreSQL), and a multilingual AI Travel Assistant.",
      go: "#work",
      goLabel: "See Projects",
      mood: "phone",
    };
  }

  // Education
  if (has(q, ["education", "college", "university", "degree", "cgpa", "study", "utkal", "gandhi"]) || word(q, ["bsc", "b\\.sc", "mca"])) {
    const bsc = education[0];
    const mca = education[1];
    return {
      text: `Completed ${bsc.title} at ${bsc.place} (${bsc.note}, ${bsc.period}), and currently pursuing an MCA at ${mca.place} (${mca.period}).`,
      go: "#experience",
      goLabel: "View Education",
    };
  }

  // Specific technologies
  if (has(q, ["flutter", "dart"])) {
    return {
      text: "Flutter & Dart are my core mobile stack — I've shipped production Android/iOS apps with clean state management, async workflows, and REST API integration.",
      go: "#skills",
      goLabel: "See All Skills",
      mood: "code",
    };
  }
  if (has(q, ["kotlin", "android"])) {
    return {
      text: "I build native Android features in Kotlin and cross-platform Android apps in Flutter & React Native, including Google Play Console releases.",
      go: "#skills",
      goLabel: "See All Skills",
      mood: "code",
    };
  }
  if (has(q, ["swift", "swiftui"]) || word(q, ["ios", "apple"])) {
    return {
      text: "I develop iOS interfaces with Swift & SwiftUI as well as Flutter, and manage releases via Apple App Store Connect.",
      go: "#skills",
      goLabel: "See All Skills",
      mood: "code",
    };
  }
  if (has(q, ["react native", "javascript", "typescript"]) || word(q, ["js", "ts"])) {
    return {
      text: "Yes! I have production experience with React Native, JavaScript, TypeScript, and Node.js/Express.js.",
      go: "#skills",
      goLabel: "See All Skills",
      mood: "code",
    };
  }
  if (word(q, ["go", "golang", "node", "nodejs", "node\\.js", "express", "backend", "api", "apis", "rest", "postgresql", "mysql", "sql", "database", "databases", "aws", "cloud"])) {
    return {
      text: "On the backend I work with Go (Golang), Node.js, Express.js, REST APIs, PostgreSQL, MySQL, and AWS deployments.",
      go: "#skills",
      goLabel: "See Backend Stack",
      mood: "code",
    };
  }

  // General skills / services
  if (has(q, ["skill", "stack", "tech", "tool", "language", "service"]) || word(q, ["build", "do"])) {
    return {
      text: `${skillGroups[0].items.slice(0, 5).join(", ")} on mobile; Go, Node.js, PostgreSQL & AWS on the backend — plus ${services[services.length - 1].toLowerCase()}.`,
      go: "#skills",
      goLabel: "Explore Skills",
      mood: "code",
    };
  }

  // Identity / About
  if (has(q, ["who", "about", "srusti", "yourself", "intro"]) || word(q, ["name"])) {
    return {
      text: `I'm ${profile.name}, a ${profile.role} in ${profile.location}. ${profile.tagline}`,
      go: "#about",
      goLabel: "About Me",
      mood: "wave",
    };
  }

  // Helpful fallback
  return {
    text: "I can answer questions about Srusti's mobile & backend stack (Flutter, Kotlin, SwiftUI, React Native, Go, Node.js), projects, experience, or freelance availability — or you can send an enquiry directly!",
    go: "#contact",
    goLabel: "Message Srusti",
  };
}
