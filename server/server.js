// // server/server.js
// import express from "express";
// import cors from "cors";
// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(cors());

// // --------------------------------------
// // Config
// // --------------------------------------
// const PORT = process.env.PORT || 8787;
// const GATEWAY_BASE = process.env.GATEWAY_BASE || "https://gateway.dev.wearevennture.co.uk";
// const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS_CSV || "")
//   .split(",")
//   .map((x) => x.trim())
//   .filter(Boolean);

// // --------------------------------------
// // Helpers
// // --------------------------------------
// function isAllowedOrigin(origin) {
//   if (!origin) return false;
//   if (ALLOWED_ORIGINS.length && ALLOWED_ORIGINS.includes(origin)) return true;
//   const rx = [
//     /^http:\/\/localhost(:\d+)?$/i,
//     /^https:\/\/cms\.dev\.wearevennture\.co\.uk$/i,
//     /^https:\/\/cms\.wearevennture\.co\.uk$/i,
//     /^https:\/\/.*\.wearevennture\.co\.uk$/i,
//   ];
//   return rx.some((r) => r.test(origin));
// }

// app.use((req, res, next) => {
//   const origin = req.headers.origin || "";
//   res.setHeader("Vary", "Origin");
//   res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "null");
//   res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Venn-Client-Origin");
//   if (req.method === "OPTIONS") return res.status(200).end();
//   next();
// });

// // --------------------------------------
// //  Get JWT from Gateway
// // --------------------------------------
// app.get("/api/get-venn-jwt", async (req, res) => {
//   try {
//     const origin =
//       req.headers["x-venn-client-origin"] || req.headers.origin || "https://cms.wearevennture.co.uk";

//     const response = await axios.get(`${GATEWAY_BASE}/auth`, {
//       headers: { Referer: origin },
//       validateStatus: () => true,
//     });

//     if (response.status !== 200) {
//       return res.status(401).json({
//         error: "Gateway auth failed",
//         status: response.status,
//         bodyPreview: response.data,
//         triedOrigin: origin,
//       });
//     }

//     const token =
//       response.data?.token || response.data?.jwt || response.data?.Token || response.data?.JWT;
//     if (!token) return res.status(500).json({ error: "No token in gateway response" });

//     res.json({ token });
//   } catch (err) {
//     console.error("[get-venn-jwt]", err.message);
//     res.status(500).json({ error: "Internal error fetching JWT" });
//   }
// });

// // --------------------------------------
// //  Register Unsplash Download (Gateway)
// // --------------------------------------
// app.post("/api/download-unsplash", async (req, res) => {
//   try {
//     const { url } = req.body || {};
//     if (!url) return res.status(400).json({ error: "Missing url" });

//     // Get a JWT first
//     const jwtResp = await axios.get(`${req.protocol}://${req.get("host")}/api/get-venn-jwt`, {
//       headers: { "X-Venn-Client-Origin": req.headers["x-venn-client-origin"] || "" },
//       validateStatus: () => true,
//     });
//     if (jwtResp.status !== 200) return res.status(401).json(jwtResp.data);
//     const token = jwtResp.data?.token;

//     // Call the gateway
//     const gwUrl = `${GATEWAY_BASE}/content-generation/download-unsplash`;
//     const gwRes = await axios.post(
//       gwUrl,
//       { url },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//         validateStatus: () => true,
//       }
//     );

//     if (gwRes.status >= 400) {
//       return res
//         .status(gwRes.status)
//         .json({ error: "Gateway error", bodyPreview: gwRes.data });
//     }

//     const data = gwRes.data?.data ?? gwRes.data;
//     const cdnUrl = data?.url || data?.Url || null;
//     if (!cdnUrl) return res.json(data);
//     res.json({ url: cdnUrl });
//   } catch (err) {
//     console.error("[download-unsplash]", err.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// // --------------------------------------
// //  Unsplash File Proxy (CORS-safe)
// // --------------------------------------
// app.post("/api/unsplash-file", async (req, res) => {
//   try {
//     const { url } = req.body || {};
//     if (!url) return res.status(400).json({ error: "Missing url" });

//     const u = new URL(url);
//     if (!u.hostname.endsWith("images.unsplash.com"))
//       return res.status(400).json({ error: "URL must be Unsplash CDN" });

//     const response = await axios.get(url, {
//       responseType: "arraybuffer",
//       validateStatus: () => true,
//     });

//     if (response.status !== 200)
//       return res.status(response.status).json({
//         error: "Failed to fetch image",
//         status: response.status,
//       });

//     res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
//     res.setHeader("Cache-Control", "no-store");
//     res.send(response.data);
//   } catch (err) {
//     console.error("[unsplash-file]", err.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// // --------------------------------------
// app.listen(PORT, () => {
//   console.log(`[Azure Unsplash Plugin API] Listening on port ${PORT}`);
// });
