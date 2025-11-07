// /pages/api/unsplash-file.js

// -------------------------
// CORS + allowlist
// -------------------------
function parseCsv(str = "") {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEFAULT_ALLOWED = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^https:\/\/cms\.dev\.wearevennture\.co\.uk$/i,
  /^https:\/\/cms\.wearevennture\.co\.uk$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const fromEnv = parseCsv(process.env.ALLOWED_ORIGINS_CSV || "");
  if (fromEnv.length && fromEnv.includes(origin)) return true;
  return DEFAULT_ALLOWED.some((rx) => rx.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Venn-Client-Origin"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader(
    "Access-Control-Allow-Origin",
    isAllowedOrigin(origin) ? origin : "null"
  );
}

// -------------------------
// Utils
// -------------------------
function getHeader(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function isSafeUnsplashUrl(href) {
  try {
    const u = new URL(href);
    return (
      u.protocol === "https:" &&
      (u.hostname === "api.unsplash.com" || u.hostname.endsWith("images.unsplash.com"))
    );
  } catch {
    return false;
  }
}

function timeout(ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error("ETIMEDOUT")), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

// -------------------------
// Handler
// -------------------------
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const downloadUrl = body.url;
    if (!downloadUrl || typeof downloadUrl !== "string")
      return res.status(400).json({ error: "Missing url" });

    if (!isSafeUnsplashUrl(downloadUrl))
      return res.status(400).json({ error: "URL must be Unsplash" });

    // Follow Unsplash redirect to the actual image bytes
    const { signal, cancel } = timeout(15000);
    let imgRes;
    try {
      imgRes = await fetch(downloadUrl, {
        redirect: "follow",
        signal,
        headers: {
          // Helpful accept header; Unsplash will 302 to images CDN
          accept: "image/*,application/octet-stream;q=0.9",
          "user-agent":
            "vennture-unsplash-upload/1.0 (+https://wearevennture.co.uk)",
        },
      });
    } catch (e) {
      cancel();
      if (e?.name === "AbortError" || e?.message === "ETIMEDOUT")
        return res.status(504).json({ error: "Upstream timeout" });
      throw e;
    }
    cancel();

    if (!imgRes.ok) {
      const t = await imgRes.text().catch(() => "");
      return res.status(imgRes.status).json({
        error: "Failed to fetch image",
        bodyPreview: t.slice(0, 300),
      });
    }

    // Content-Type from upstream; default to jpeg
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    const ab = await imgRes.arrayBuffer();
    const buf = Buffer.from(ab);

    // Repeat CORS on the final response (paranoid but safe)
    applyCors(req, res);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buf);
  } catch (err) {
    console.error("[API] unsplash-file error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
