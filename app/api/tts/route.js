import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { DEFAULT_NEURAL_VOICE, NEURAL_VOICE_IDS } from "@/lib/tts-voices";

const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });

const escapeXml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request");
  }

  const rawText = String(body?.text ?? "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);

  if (!rawText) return bad("Text is required");

  const requestedVoice = String(body?.voice ?? DEFAULT_NEURAL_VOICE).trim();
  const voice = NEURAL_VOICE_IDS.has(requestedVoice) ? requestedVoice : DEFAULT_NEURAL_VOICE;

  const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 15000 });
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(rawText));

    const audioBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const onAbort = () => {
        audioStream.destroy(new Error("aborted"));
      };
      request.signal?.addEventListener("abort", onAbort, { once: true });

      audioStream.on("data", (chunk) => chunks.push(chunk));
      audioStream.once("close", () => {
        request.signal?.removeEventListener("abort", onAbort);
        if (chunks.length > 0) resolve(Buffer.concat(chunks));
        else reject(new Error("Empty audio stream"));
      });
      audioStream.once("error", (err) => {
        request.signal?.removeEventListener("abort", onAbort);
        reject(err);
      });
    });

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (request.signal?.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error("TTS synthesis error:", err?.message || err);
    return bad("Speech synthesis unavailable", 502);
  } finally {
    tts.close();
  }
}
