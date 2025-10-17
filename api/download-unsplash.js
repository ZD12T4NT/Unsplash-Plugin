// download-unsplash

export default async function handler(req, res) {

    // --- CORS Fix ---
  res.setHeader("Access-Control-Allow-Origin", "https://cms.wearevennture.co.uk");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "Missing download URL" });
    }

    // Get JWT first
    const authRes = await fetch(`${req.headers.origin}/api/get-venn-jwt`);
    const authJson = await authRes.json();
    const token = authJson.token;

    if (!token) {
      return res.status(500).json({ error: "Failed to get JWT" });
    }

    // Call real gateway
    const gatewayUrl = "https://gateway.wearevennture.co.uk/content-generation/download-unsplash";

    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error("[API] download-unsplash failed:", gwRes.status, text);
      return res.status(gwRes.status).json({ error: "Download failed", text });
    }

    const json = await gwRes.json();
    return res.status(200).json(json);
  } catch (err) {
  console.error("[API] downloadunsplash error:", err);
  return res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: err.stack,
  });
}

}
