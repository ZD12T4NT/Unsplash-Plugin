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
    const gatewayAuthUrl = "https://gateway.dev.wearevennture.co.uk/auth";
const clientOrigin = (getHeader(req, "x-venn-client-origin") || getHeader(req, "origin") || "").trim();

if (!clientOrigin) return res.status(400).json({ error: "Missing client origin" });

    // Send explicit identity via multiple headers – different stacks validate different ones
    const url = new URL(clientOrigin);
    const hostOnly = url.host; // e.g. client.example.com
    const gwRes = await fetch(gatewayAuthUrl, {
      method: "GET",
      headers: {
        // Common checks
        Referer: clientOrigin,
        Origin: clientOrigin,
        // Pass through as a stable, explicit signal
        "X-Venn-Client-Origin": clientOrigin,
        // Some gateways/proxies look at these:
        "X-Forwarded-Proto": url.protocol.replace(":", ""), // http or https
        "X-Forwarded-Host": hostOnly,
        accept: "application/json",
     },
    });


if (!gwRes.ok) {
  const text = await gwRes.text();
  return res.status(gwRes.status).json({
    error: "Gateway auth failed",
    status: gwRes.status,
    bodyPreview: text.slice(0, 500),
       triedReferer: clientOrigin,
      note: "No CMS fallback used so you can fix allowlist/validation on the gateway.",
  });
}

const raw = await gwRes.text();
let json;
try { json = JSON.parse(raw); }
catch {
  return res.status(502).json({ error: "Gateway returned invalid JSON", bodyPreview: raw.slice(0, 500) });
}
const token = json && json.token;
if (typeof token !== "string" || !token) {
  return res.status(500).json({ error: "Token missing or invalid", jsonPreview: JSON.stringify(json).slice(0, 500) });
}
return res.status(200).json({ token });

  } catch (err) {
    console.error("[API] get-venn-jwt error:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
