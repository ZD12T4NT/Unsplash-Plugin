// search-unsplash.js

export default async function handler(req, res) {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const authRes = await fetch(`${req.headers.origin}/api/get-venn-jwt`);
    const token = (await authRes.json()).token;

    const gwRes = await fetch(
      "https://gateway.wearevennture.co.uk/content-generation/search-unsplash",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!gwRes.ok) return res.status(gwRes.status).json({ error: "Search failed" });

    res.status(200).json(await gwRes.json());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
