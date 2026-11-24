// Receives the freelance enquiry form. Delivery uses Web3Forms (free) when WEB3FORMS_ACCESS_KEY is set;
// otherwise it answers 501 and the browser falls back to opening the visitor's email app.
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad("Invalid request"); }
  if (body.company_hp) return Response.json({ ok: true }); // honeypot

  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const company = str(body.company, 150);
  const phone = str(body.phone, 40);
  const description = str(body.description, 3000);
  const budget = str(body.budget, 60);
  const timeline = str(body.timeline, 60);
  const types = Array.isArray(body.types) ? body.types.map((t) => str(t, 60)).filter(Boolean).slice(0, 10) : [];

  if (!types.length) return bad("Please choose at least one project type.");
  if (description.length < 20) return bad("Please describe your project in a little more detail (20+ characters).");
  if (!budget || !timeline) return bad("Please choose a budget and timeline.");
  if (!name) return bad("Please enter your name.");
  if (!emailRe.test(email)) return bad("Please enter a valid email.");

  const lines = [`Project type: ${types.join(", ")}`, `Budget: ${budget}`, `Timeline: ${timeline}`];
  if (company) lines.push(`Company / website: ${company}`);
  if (phone) lines.push(`Phone / WhatsApp: ${phone}`);
  const message = `${lines.join("\n")}\n\n${description}`;

  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return Response.json({ ok: false, reason: "not-configured" }, { status: 501 });

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: key, name, email, subject: `New project enquiry: ${types.join(", ")} (${name})`, message, from_name: "Portfolio enquiry" }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return bad("Could not send right now.", 502);
    return Response.json({ ok: true });
  } catch {
    return bad("Could not send right now.", 502);
  }
}
