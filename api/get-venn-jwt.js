// /pages/api/get-venn-jwt.js

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

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const gatewayAuthUrl = "https://gateway.wearevennture.co.uk/auth";

    const clientOrigin = (getHeader(req, "x-venn-client-origin") || getHeader(req, "origin") || "").trim();
    if (!clientOrigin) return res.status(400).json({ error: "Missing client origin" });

    const gwRes = await fetch(gatewayAuthUrl, {
      method: "GET",
      headers: { Referer: clientOrigin },
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      return res.status(gwRes.status).json({
        error: "Gateway auth failed",
        status: gwRes.status,
        bodyPreview: text.slice(0, 300),
      });
    }

    const raw = await gwRes.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Gateway returned invalid JSON", bodyPreview: raw.slice(0, 200) });
    }

    const token = json && json.token;
    if (typeof token !== "string" || !token) {
      return res.status(500).json({ error: "Token missing or invalid" });
    }

    return res.status(200).json({ token });
  } catch (err) {
    console.error("[API] get-venn-jwt error:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
