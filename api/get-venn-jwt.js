// /pages/api/get-venn-jwt.js

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

  // ENV first (exact matches); fall back to sane defaults
  const allowedExact = parseCsv(process.env.ALLOWED_ORIGINS_CSV || "");
  if (allowedExact.length && allowedExact.includes(origin)) return true;

  const allowList = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https:\/\/cms\.wearevennture\.co\.uk$/,
    /^https:\/\/.*\.wearevennture\.co\.uk$/,
    // Add more defaults if needed
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

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const gatewayAuthUrl =
      process.env.GATEWAY_AUTH_URL || "https://gateway.dev.wearevennture.co.uk/auth";

    const clientOrigin = (getHeader(req, "x-venn-client-origin") || getHeader(req, "origin") || "")
      .trim();

    if (!clientOrigin) return res.status(400).json({ error: "Missing client origin" });

    // Validate against CORS allowlist (helps catch obvious misconfig early)
    if (!isAllowedOrigin(clientOrigin)) {
      return res.status(403).json({ error: "Client origin not allowed", clientOrigin });
    }

    // Forward multiple identity headers; different stacks validate different ones
    let proto = "https";
    try {
      const u = new URL(clientOrigin);
      proto = (u.protocol || "https:").replace(":", "");
    } catch {}

    const gwRes = await fetch(gatewayAuthUrl, {
      method: "GET",
      headers: {
        Referer: clientOrigin,
        Origin: clientOrigin,
        "X-Venn-Client-Origin": clientOrigin,
        "X-Forwarded-Proto": proto,
        "X-Forwarded-Host": getHeader(req, "host") || "",
        accept: "application/json",
      },
    });

    if (!gwRes.ok) {
      const text = await gwRes.text().catch(() => "");
      return res.status(gwRes.status).json({
        error: "Gateway auth failed",
        status: gwRes.status,
        bodyPreview: text.slice(0, 500),
        triedOrigin: clientOrigin,
      });
    }

    // Be tolerant to gateways that return text then JSON
    const raw = await gwRes.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return res
        .status(502)
        .json({ error: "Gateway returned invalid JSON", bodyPreview: raw.slice(0, 500) });
    }

    const token = json && (json.token || json.Token);
    if (typeof token !== "string" || !token) {
      return res.status(502).json({
        error: "Token missing or invalid",
        jsonPreview: JSON.stringify(json).slice(0, 500),
      });
    }

    return res.status(200).json({ token });
  } catch (err) {
    console.error("[API] get-venn-jwt error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
