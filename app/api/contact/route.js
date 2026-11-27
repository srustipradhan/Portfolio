// Receives the contact form. Delivery uses Web3Forms (free) when WEB3FORMS_ACCESS_KEY is set;
// otherwise it answers 501 and the browser falls back to opening the visitor's email app.
import { enquiryOptions } from "@/lib/data";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedIntents = new Set(enquiryOptions);
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad("Invalid request"); }
  if (body.company_hp) return Response.json({ ok: true }); // honeypot

  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const company = str(body.company, 150);
  const intent = str(body.intent, 80);

  if (!name) return bad("Please enter your name.");
  if (!emailRe.test(email)) return bad("Please enter a valid email.");
  if (phone.replace(/\D/g, "").length < 7) return bad("Please enter a valid phone number.");
  if (!allowedIntents.has(intent)) return bad("Please select one option for what you're looking for.");

  const lines = [`What they want: ${intent}`, `Name: ${name}`, `Email: ${email}`, `Phone number: ${phone}`];
  if (company) lines.push(`Company name: ${company}`);
  const message = lines.join("\n");

  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return Response.json({ ok: false, reason: "not-configured" }, { status: 501 });

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: key,
        name,
        email,
        subject: `New contact enquiry: ${intent} (${name})`,
        message,
        from_name: "Portfolio contact",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return bad("Could not send right now.", 502);
    return Response.json({ ok: true });
  } catch {
    return bad("Could not send right now.", 502);
  }
}
