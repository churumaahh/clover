// Called by the dashboard right after a save: reloads the lists from Apps Script into the runtime cache,
// then drops the CDN copy, so the next visitor gets what was just saved without waiting on Apps Script.
const { dangerouslyDeleteByTag } = require("@vercel/functions");
const { loadFromAppsScript } = require("./_gas-cache");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  await Promise.all([
    loadFromAppsScript("eventList", "events"),
    loadFromAppsScript("heroList", "slides"),
    loadFromAppsScript("schedulePostList", "posts")
  ].map((job) => job.catch(() => {})));
  await dangerouslyDeleteByTag("gas-lists");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
};
