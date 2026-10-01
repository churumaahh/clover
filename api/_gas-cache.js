// Shared handler for the public Apps Script lists. Apps Script can take 3-30s, so visitors never wait on it:
// the last good list is kept in Vercel's runtime cache and served from there; Apps Script is only asked
// when that copy is missing or older than REFRESH_MS (and then in the background if a copy exists).
// /api/refresh (called on every dashboard save) reloads the lists into this cache, then clears the CDN copy.
const { getCache, waitUntil } = require("@vercel/functions");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
  || "https://script.google.com/macros/s/AKfycbwYFz09FT0JCho3Y8zruypmGp2V91cJ4ITRysfi39YVe-xqHzPFWRi2nSUYIaRTsc-_/exec";
const CACHE_SECONDS = 300;
const REFRESH_MS = 5 * 60 * 1000;

async function loadFromAppsScript(action, listKey) {
  const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}&t=${Date.now()}`, { redirect: "follow" });
  const json = await response.json();
  if (!response.ok || !json || json.ok !== true || !Array.isArray(json[listKey])) throw new Error(`bad ${action} response`);
  const entry = { list: json[listKey], savedAt: Date.now() };
  await getCache().set(`gas:${action}`, entry, { ttl: 60 * 60 * 24 * 30 });
  return entry;
}

function cachedAppsScriptList(action, listKey) {
  return async function handler(req, res) {
    try {
      let entry = await getCache().get(`gas:${action}`).catch(() => null);
      if (!entry) entry = await loadFromAppsScript(action, listKey);
      else if (Date.now() - entry.savedAt > REFRESH_MS) waitUntil(loadFromAppsScript(action, listKey).catch(() => {}));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.setHeader("CDN-Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
      res.setHeader("Vercel-Cache-Tag", "gas-lists");
      res.status(200).send(JSON.stringify({ ok: true, [listKey]: entry.list }));
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      res.status(502).json({ ok: false, error: `${action} unavailable` });
    }
  };
}

cachedAppsScriptList.loadFromAppsScript = loadFromAppsScript;
module.exports = cachedAppsScriptList;
