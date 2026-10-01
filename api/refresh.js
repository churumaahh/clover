// Called by the dashboard right after a save: drops Vercel's cached lists so the very next visitor
// gets what was just saved instead of waiting for the cache to expire.
const { dangerouslyDeleteByTag } = require("@vercel/functions");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  await dangerouslyDeleteByTag("gas-lists");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
};
