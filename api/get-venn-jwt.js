// get-venn-jwt.js

export default async function handler(req, res) {
  try {
    const gatewayAuthUrl = "https://gateway.wearevennture.co.uk/auth";

    const referer =
      process.env.NODE_ENV === "development"
        ? (req.headers.origin || "")
        : "https://cms.wearevennture.co.uk"; // the domain the gateway expects

    const gwRes = await fetch(gatewayAuthUrl, {
      method: "GET",
      headers: {
        Referer: referer,
      },
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error("[API] Gateway auth failed:", gwRes.status, text);
      return res.status(gwRes.status).json({ error: "Gateway auth failed" });
    }

    const json = await gwRes.json();

    if (!json.token) {
      console.error("[API] No token in response:", json);
      return res.status(500).json({ error: "Token missing" });
    }

    return res.status(200).json({ token: json.token });
  } catch (err) {
    console.error("[API] Error fetching JWT:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
