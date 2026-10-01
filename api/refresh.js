// Called by the dashboard right after a save: drops Vercel's cached lists so the very next visitor
// gets what was just saved instead of waiting for the cache to expire.
const { dangerouslyDeleteByTag } = require("@vercel/functions");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  await dangerouslyDeleteByTag("gas-lists");
  // Refill the cache right away so visitors never wait on Apps Script themselves.
  const origin = `https://${req.headers.host}`;
  await Promise.all(["/api/events", "/api/hero", "/api/posts"].map((path) => fetch(origin + path).catch(() => {})));
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
};
