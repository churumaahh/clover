// Shared handler: serves a public Apps Script list from Vercel's edge cache so visitors never wait on
// Apps Script (2-3s). Every dashboard save calls /api/refresh, which drops this cache (tag gas-lists),
// so the saved content shows right away; CACHE_SECONDS is only a safety net for edits made elsewhere.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
  || "https://script.google.com/macros/s/AKfycbwYFz09FT0JCho3Y8zruypmGp2V91cJ4ITRysfi39YVe-xqHzPFWRi2nSUYIaRTsc-_/exec";
const CACHE_SECONDS = 300;

module.exports = function cachedAppsScriptList(action, listKey) {
  return async function handler(req, res) {
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}&t=${Date.now()}`, { redirect: "follow" });
      const json = await response.json();
      if (!response.ok || !json || json.ok !== true || !Array.isArray(json[listKey])) throw new Error(`bad ${action} response`);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.setHeader("CDN-Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
      res.setHeader("Vercel-Cache-Tag", "gas-lists");
      res.status(200).send(JSON.stringify({ ok: true, [listKey]: json[listKey] }));
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      res.status(502).json({ ok: false, error: `${action} unavailable` });
    }
  };
};
