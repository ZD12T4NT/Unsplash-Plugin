export default async function handler(req, res) {
  // --- CORS Fix ---
  res.setHeader("Access-Control-Allow-Origin", "https://cms.wearevennture.co.uk");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const gatewayAuthUrl = "https://gateway.wearevennture.co.uk/auth";

    // Always tell the gateway where this request came from
    const referer =
      process.env.NODE_ENV === "development"
        ? req.headers.origin || "http://localhost:5173"
        : "https://cms.wearevennture.co.uk";

    console.log("[API] Fetching JWT from gateway:", gatewayAuthUrl);
    console.log("[API] Using Referer:", referer);

    const gwRes = await fetch(gatewayAuthUrl, {
      method: "GET",
      headers: { Referer: referer },
    });

    // Gateway didn’t respond OK — capture its raw HTML
    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error("[API] Gateway auth failed:", gwRes.status, text.slice(0, 300));
      return res.status(gwRes.status).json({
        error: "Gateway auth failed",
        status: gwRes.status,
        bodyPreview: text.slice(0, 300),
      });
    }

    // Try to parse JSON safely
    const text = await gwRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[API] Gateway returned non-JSON:", text.slice(0, 200));
      return res.status(502).json({
        error: "Gateway returned invalid JSON",
        bodyPreview: text.slice(0, 200),
      });
    }

    // Validate token
    if (!json.token || typeof json.token !== "string") {
      console.error("[API] No valid token in response:", json);
      return res.status(500).json({ error: "Token missing or invalid" });
    }

    console.log("[API] Token retrieved successfully");
    return res.status(200).json({ token: json.token });

  } catch (err) {
    console.error("[API] Error fetching JWT:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
      stack: err.stack,
    });
  }
}
