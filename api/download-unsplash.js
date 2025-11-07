// api/download-unsplash.js

function getHeader(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function parseCsv(str = "") {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const allowedExact = parseCsv(process.env.ALLOWED_ORIGINS_CSV || "");
  if (allowedExact.length && allowedExact.includes(origin)) return true;

  const allowList = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https:\/\/cms\.wearevennture\.co\.uk$/,
    /^https:\/\/.*\.wearevennture\.co\.uk$/,
  ];
  return allowList.some((rx) => rx.test(origin));
}

function applyCors(req, res) {
  const origin = getHeader(req, "origin") || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "null");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Venn-Client-Origin"
  );
}

function buildSelfBase(req) {
  const host = getHeader(req, "host") || "localhost:3000";
  const xfProto = getHeader(req, "x-forwarded-proto");
  const scheme = xfProto || (host.startsWith("localhost") ? "http" : "https");
  return `${scheme}://${host}`;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const downloadUrl = body.url; // <-- rename for clarity
    if (!downloadUrl) return res.status(400).json({ error: "Missing download URL" });

    const clientOrigin = (getHeader(req, "x-venn-client-origin") || getHeader(req, "origin") || "").trim();
    const selfBase = buildSelfBase(req);

    // Get JWT
    const authRes = await fetch(`${selfBase}/api/get-venn-jwt`, {
      method: "GET",
      headers: { "X-Venn-Client-Origin": clientOrigin },
    });

    if (!authRes.ok) {
      const text = await authRes.text().catch(() => "");
      return res.status(502).json({
        error: "Failed to get JWT (proxy)",
        status: authRes.status,
        bodyPreview: text.slice(0, 500),
        clientOrigin,
      });
    }

    let authJson = {};
    try {
      authJson = await authRes.json();
    } catch {
      return res.status(502).json({ error: "Invalid JSON from get-venn-jwt", clientOrigin });
    }

    // Accept both token and jwt
    const token = authJson?.token || authJson?.Token || authJson?.jwt || authJson?.JWT;
    if (!token) {
      return res.status(502).json({
        error: "JWT missing from get-venn-jwt",
        authJsonPreview: JSON.stringify(authJson).slice(0, 500),
        clientOrigin,
      });
    }

    const gatewayUrl =
      process.env.GATEWAY_DOWNLOAD_URL ||
      "https://gateway.dev.wearevennture.co.uk/content-generation/download-unsplash";

    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Venn-Client-Origin": clientOrigin,
        Origin: clientOrigin,
        Referer: clientOrigin,
      },
      body: JSON.stringify({ url: downloadUrl }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text().catch(() => "");
      return res.status(gwRes.status).json({
        error: "Download failed (gateway)",
        bodyPreview: text.slice(0, 500),
      });
    }

    const json = await gwRes.json().catch(() => ({}));
    // Normalize possible shapes
    const data = json?.data ?? json ?? {};
    const id =
      data.id || data.Id || data.mediaId || data.MediaId || data.assetId || data.AssetId || null;
    const cdnUrl = data.url || data.Url || data.src || data.sourceUrl || null;

    if (!id) {
      return res.status(502).json({
        error: "Gateway did not return an asset id",
        preview: JSON.stringify(json).slice(0, 500),
      });
    }

    return res.status(200).json({ id, url: cdnUrl, raw: json });
  } catch (err) {
    console.error("[API] download-unsplash error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

