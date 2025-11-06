// /pages/api/download-unsplash.js

function getHeader(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function isAllowedOrigin(origin) {
  const allowList = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https:\/\/cms\.wearevennture\.co\.uk$/,
    /^https:\/\/.*\.wearevennture\.co\.uk$/,
  ];
  return !!origin && allowList.some((rx) => rx.test(origin));
}

function applyCors(req, res) {
  const origin = getHeader(req, "origin") || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "null");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Venn-Client-Origin");
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

  try {
    const body = req.body || {};
    const url = body.url;
    if (!url) return res.status(400).json({ error: "Missing download URL" });

    const clientOrigin = (getHeader(req, "x-venn-client-origin") || getHeader(req, "origin") || "").trim();
    const selfBase = buildSelfBase(req);

    // --- Get JWT (forward client origin) with better error surfacing ---
    const authRes = await fetch(`${selfBase}/api/get-venn-jwt`, {
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
      return res.status(502).json({
        error: "Invalid JSON from get-venn-jwt",
        clientOrigin,
      });
    }

    const token = authJson && authJson.token;
    if (!token) {
      return res.status(502).json({
        error: "JWT missing from get-venn-jwt",
        authJsonPreview: JSON.stringify(authJson).slice(0, 500),
        clientOrigin,
      });
    }

    // --- Call the gateway download endpoint ---
    const gatewayUrl = "https://gateway.dev.wearevennture.co.uk/content-generation/download-unsplash";
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
      body: JSON.stringify({ url }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text().catch(() => "");
      return res.status(gwRes.status).json({
        error: "Download failed",
        bodyPreview: text.slice(0, 500),
      });
    }

    const json = await gwRes.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error("[API] download-unsplash error:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
