// /pages/api/unsplash-file.js

// ---------- CORS ----------
function parseCsv(str = "") {
  return str.split(",").map(s => s.trim()).filter(Boolean);
}
const DEFAULT_ALLOWED = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^https:\/\/cms\.dev\.wearevennture\.co\.uk$/i,
  /^https:\/\/cms\.wearevennture\.co\.uk$/i,
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
function isSafeUnsplashUrl(href) {
  try {
    const u = new URL(href);
    return u.protocol === "https:" &&
      (u.hostname === "api.unsplash.com" || u.hostname.endsWith("images.unsplash.com"));
  } catch { return false; }
}
function timeout(ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error("ETIMEDOUT")), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

// ---------- Handler ----------
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") return res.status(400).json({ error: "Missing url" });
    if (!isSafeUnsplashUrl(url)) return res.status(400).json({ error: "URL must be Unsplash" });

    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    if (!UNSPLASH_ACCESS_KEY) {
      return res.status(500).json({ error: "UNSPLASH_ACCESS_KEY not configured" });
    }

    // GET the download_location with auth → counts as download + redirects to images CDN
    const { signal, cancel } = timeout(15000);
    let upstream;
    try {
      upstream = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal,
        headers: {
          accept: "image/*,application/octet-stream;q=0.9",
          authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          "user-agent": "vennture-unsplash-upload/1.0",
        },
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
        error: "Failed to fetch image",
        bodyPreview: t.slice(0, 300),
      });
    }

    const ct = upstream.headers.get("content-type") || "image/jpeg";
    const ab = await upstream.arrayBuffer();

    // Repeat CORS on final response
    applyCors(req, res);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(ab));
  } catch (err) {
    console.error("[API] unsplash-file error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
