// /pages/api/unsplash-file.js

// ---------- CORS ----------
function parseCsv(str = "") {
  return str.split(",").map(s => s.trim()).filter(Boolean);
}

const DEFAULT_ALLOWED = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^https:\/\/cms\.dev\.wearevennture\.co\.uk$/i,
  /^https:\/\/cms\.wearevennture\.co\.uk$/i,
  /^https:\/\/.*\.wearevennture\.co\.uk$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const env = parseCsv(process.env.ALLOWED_ORIGINS_CSV || "");
  if (env.length && env.includes(origin)) return true;
  return DEFAULT_ALLOWED.some(rx => rx.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Venn-Client-Origin");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "null");
}

// ---------- Utils ----------
function timeout(ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error("ETIMEDOUT")), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

// ---------- Handler ----------
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string")
      return res.status(400).json({ error: "Missing url" });

    // Validate: must be a public image (Unsplash CDN)
    if (!url.startsWith("https://images.unsplash.com/")) {
      return res.status(400).json({
        error: "Invalid image URL",
        received: url,
      });
    }

    // Fetch the image bytes directly — no Unsplash API key needed
    const { signal, cancel } = timeout(15000);
    let upstream;
    try {
      upstream = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal,
        headers: { accept: "image/*" },
      });
    } catch (e) {
      cancel();
      if (e?.name === "AbortError" || e?.message === "ETIMEDOUT") {
        return res.status(504).json({ error: "Upstream timeout" });
      }
      throw e;
    }
    cancel();

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => "");
      return res.status(upstream.status).json({
        error: "Failed to fetch image bytes",
        bodyPreview: t.slice(0, 200),
      });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Repeat CORS for the actual binary response
    applyCors(req, res);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("[API] unsplash-file error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err?.message,
    });
  }
}
