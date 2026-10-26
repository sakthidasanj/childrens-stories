# Shared scorecard — one-time Cloudflare setup (5 minutes)

The game "Inba: Kitten Rescue" keeps its scorecard as **one flat JSON
file inside Cloudflare's own storage** (a KV namespace), so every
player on every device sees — and competes on — the same scorecard.
The game talks to it through `/api/scores`, a small Cloudflare Pages
Function in this repo at `functions/api/scores.js`.

The code is already in the repo. **One manual step remains**, because
only the account owner can create storage and bind it to the project:

## Step 1 — Create the storage

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in
   (the account the Story Land site is on).
2. In the left menu open **Storage & Databases → KV**
   (older dashboards: **Workers & Pages → KV**).
3. Click **Create namespace** and name it exactly: `storyland-scores`
4. Click **Add**.

## Step 2 — Connect it to the Story Land project

1. Go to **Workers & Pages** and open the Story Land Pages project.
2. Open **Settings → Functions** (newer dashboards: **Settings → Bindings**).
3. Find **KV namespace bindings** → **Add binding**:
   - **Variable name:** `SCORES`  ← must be exactly this, capitals
   - **KV namespace:** `storyland-scores`
4. Save.

## Step 3 — Redeploy

Deploy the site once more (a new deployment from your usual method —
Git push if the project is connected to this repo, or a fresh upload
that includes the `functions/` folder). The binding only takes effect
on a new deployment.

## How to know it worked

- Open the game, finish a 2-minute run on one device, then open the
  game on a *different* device — your score is on its scorecard too.
- Or visit `https://<your-site-address>/api/scores` in a browser: it
  should answer with JSON like `{"ok":true,"scores":[…]}`.
  If it returns a 404 page instead, the `functions/` folder was not
  part of the deployment (dashboard drag-and-drop uploads can skip
  it — connect the project to this GitHub repo, or deploy with
  Wrangler, and it will work).

## Safety notes

- The function accepts only small, capped numbers (a real 2-minute
  run cannot exceed them) and trims names to 14 friendly characters.
- The scorecard keeps the best 200 runs; the game shows the top 10.
- If the storage is ever unbound or unreachable, the game quietly
  falls back to a per-device scorecard stored in the browser — play
  never breaks.
- To wipe the scorecard: KV → `storyland-scores` → delete the key
  named `scores.json` (or edit its JSON in place).
