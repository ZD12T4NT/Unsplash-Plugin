// search-unsplash.js

export default async function handler(req, res) {
  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // First, get a JWT via the auth route
    const authRes = await fetch(`${req.headers.origin}/api/get-venn-jwt`);
    const authJson = await authRes.json();
    const token = authJson.token;

    if (!token) {
      return res.status(500).json({ error: "Failed to get JWT" });
    }

    // Now, call the real gateway
    const gatewayUrl = "https://gateway.wearevennture.co.uk/content-generation/search-unsplash";

    const gwRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error("[API] search-unsplash failed:", gwRes.status, text);
      return res.status(gwRes.status).json({ error: "Search failed", text });
    }

    const json = await gwRes.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error("[API] search-unsplash error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
