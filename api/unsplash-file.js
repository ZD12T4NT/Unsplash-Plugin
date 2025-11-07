// api/unsplash-file.js

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = /^https:\/\/(cms|.*)\.wearevennture\.co\.uk$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "null");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Venn-Client-Origin");
}


function getHeader(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}
function buildSelfBase(req) {
  const host = getHeader(req, "host") || "localhost:3000";
  const xfProto = getHeader(req, "x-forwarded-proto");
  const scheme = xfProto || (host.startsWith("localhost") ? "http" : "https");
  return `${scheme}://${host}`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  
  try {
    const { url: downloadUrl } = req.body || {};
    if (!downloadUrl) return res.status(400).json({ error: "Missing url" });

    // (Optional but recommended) register the download / get JWT provenance
    // If you need JWT, you can reuse your /api/get-venn-jwt as you did before.

    // 1) Resolve Unsplash to a direct image URL (if your gateway already gives direct URL, you can skip)
    // Here we assume `downloadUrl` already points to Unsplash's "download_location".
    // Unsplash will redirect to the actual CDN URL; follow it:
    const imgRes = await fetch(downloadUrl, { redirect: "follow" });
    if (!imgRes.ok) {
      const t = await imgRes.text().catch(() => "");
      return res.status(imgRes.status).json({ error: "Failed to fetch image", bodyPreview: t.slice(0, 200) });
    }

    // 2) Stream bytes to the browser
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    // Let the browser create a File from it:
    res.status(200).send(buf);
  } catch (err) {
    console.error("[API] unsplash-file error:", err?.message || err);
    res.status(500).json({ error: "Internal server error" });
  }
}
