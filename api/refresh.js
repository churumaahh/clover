// Called by the dashboard right after a save: reloads the lists from Apps Script into the runtime cache,
// then drops the CDN copy, so the next visitor gets what was just saved without waiting on Apps Script.
const { dangerouslyDeleteByTag, getCache } = require("@vercel/functions");
const { loadFromAppsScript } = require("./_gas-cache");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  // Apps Script sometimes stalls right after a save (it answered 404 after ~40s in testing). So first mark every
  // cached list stale (the next visit then reloads it in the background even if this function dies), then reload
  // each one, retrying once. A successful reload stores a fresh copy again.
  const lists = [["eventList", "events"], ["heroList", "slides"], ["schedulePostList", "posts"]];
  await Promise.all(lists.map(async ([action]) => {
    const entry = await getCache().get(`gas:${action}`).catch(() => null);
    if (entry) await getCache().set(`gas:${action}`, { ...entry, savedAt: 0 }, { ttl: 60 * 60 * 24 * 30 }).catch(() => {});
  }));
  await Promise.all(lists.map(([action, listKey]) =>
    loadFromAppsScript(action, listKey).catch(() => loadFromAppsScript(action, listKey)).catch(() => {})));
  await dangerouslyDeleteByTag("gas-lists");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
};
