// Shared scorecard for "Inba: Kitten Rescue" — Cloudflare Pages Function.
//
//   GET  /api/scores                          -> { ok: true, scores: [top 10] }
//   POST /api/scores  {name, foxes, dist, kittens, ts}
//                                             -> validates, saves, returns
//                                                { ok: true, scores: [top 10] }
//
// The whole scorecard is ONE JSON document stored in Cloudflare KV under
// the key "scores.json" — the flat file, living inside Cloudflare's own
// storage, shared by every player on every device.
//
// Needs a KV namespace bound to this Pages project with the variable
// name SCORES (see SCORECARD-SETUP.md at the repo root). Without the
// binding the function answers 501 and the game quietly falls back to
// its per-device local scorecard, so nothing ever breaks.

var KEY = "scores.json";
var MAX_KEEP = 200;      // stored entries (only the top 10 are shown)
var MAX_FOXES = 160;     // sanity caps: the most a real 2-minute run can
var MAX_DIST = 8000;     // physically produce — anything above is fake
var MAX_KITTENS = 140;   // and gets clipped instead of leading the board

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function sortCard(arr) {
  arr.sort(function (a, b) {
    return (b.foxes - a.foxes) || (b.dist - a.dist) || (b.kittens - a.kittens);
  });
  return arr;
}

async function readAll(env) {
  if (!env.SCORES) return null;
  var raw = await env.SCORES.get(KEY);
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function cleanEntry(body) {
  if (!body || typeof body !== "object") return null;
  var name = String(body.name == null ? "" : body.name).trim().slice(0, 14);
  if (!name) name = "Player";
  // Keep names friendly: letters, numbers, spaces and a few safe marks.
  name = name.replace(/[^\p{L}\p{N} ._'-]/gu, "").trim() || "Player";
  var foxes = Math.floor(Number(body.foxes));
  var dist = Math.floor(Number(body.dist));
  var kittens = Math.floor(Number(body.kittens));
  var ts = Math.floor(Number(body.ts));
  if (!isFinite(foxes) || !isFinite(dist) || !isFinite(kittens)) return null;
  foxes = Math.min(Math.max(foxes, 0), MAX_FOXES);
  dist = Math.min(Math.max(dist, 0), MAX_DIST);
  kittens = Math.min(Math.max(kittens, 0), MAX_KITTENS);
  if (!isFinite(ts) || ts <= 0) ts = Date.now();
  return { name: name, foxes: foxes, dist: dist, kittens: kittens, ts: ts };
}

export async function onRequestGet(context) {
  var arr = await readAll(context.env);
  if (arr === null) return json({ ok: false, error: "storage-not-bound" }, 501);
  return json({ ok: true, scores: sortCard(arr).slice(0, 10) });
}

export async function onRequestPost(context) {
  var arr = await readAll(context.env);
  if (arr === null) return json({ ok: false, error: "storage-not-bound" }, 501);
  var body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ ok: false, error: "bad-json" }, 400);
  }
  var entry = cleanEntry(body);
  if (!entry) return json({ ok: false, error: "bad-entry" }, 400);
  arr.push(entry);
  arr = sortCard(arr).slice(0, MAX_KEEP);
  await context.env.SCORES.put(KEY, JSON.stringify(arr));
  return json({ ok: true, scores: arr.slice(0, 10), saved: entry });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
