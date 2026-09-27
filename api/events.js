// Serves the public event list from Vercel's edge cache so visitors never wait on Apps Script (2-3s).
// The cache refreshes itself in the background: after CACHE_SECONDS the next visitor still gets the
// cached copy instantly while Vercel fetches a fresh one from Apps Script for everyone after them.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
  || "https://script.google.com/macros/s/AKfycbwYFz09FT0JCho3Y8zruypmGp2V91cJ4ITRysfi39YVe-xqHzPFWRi2nSUYIaRTsc-_/exec";
const CACHE_SECONDS = 30;

module.exports = async function handler(req, res) {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=eventList&t=${Date.now()}`, { redirect: "follow" });
    const json = await response.json();
    if (!response.ok || !json || json.ok !== true || !Array.isArray(json.events)) throw new Error("bad eventList response");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("CDN-Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
    res.status(200).send(JSON.stringify({ ok: true, events: json.events }));
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ ok: false, error: "eventList unavailable" });
  }
};
