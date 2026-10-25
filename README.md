# 📚 Story Land — Children's Stories

A colorful, animated website where children can browse a shelf of short,
original stories and read them one by one.

## What it has

- **Story shelf** — a home page listing every story as a card with its own
  picture, a one-line teaser, the age range, and the reading time.
- **Story pages** — click a story and it opens with a big floating picture,
  the story text in friendly rounded cards that fade in as you scroll, and a
  "moral of the story" box at the end.
- **Read it to me** — a button that reads the story aloud using the
  browser's built-in speech voice, highlighting each paragraph as it goes.
- **A game!** — *Inba: Kitten Rescue* (`game.html`): a Mario-style runner
  where Inba jumps over the funny foxes and frees her kittens from cages,
  with "Inba Super Girl Paattu" playing very softly and distinct sound
  effects for jumping, kitten rescues, fox catches and lost hearts.
  Snappy jumps, a cape double-jump, and 10 hearts. Linked from the home
  page and from Inba's story page.
- **Animations everywhere** — drifting clouds, twinkling stars, bobbing
  balloons, bouncing titles, wiggling "Read me" arrows, and a shiny sweep
  across every story picture. Respects `prefers-reduced-motion`.

## The stories

All stories are original, written for this site, for ages 3–8:

1. **Milo, the Brave Little Fox** — being brave for a friend.
2. **Tito, the Singing Turtle** — everyone's song is special.
3. **Pippa and the Rainbow Kite** — sharing doubles happiness.
4. **Nila and the Moon's Lost Star** — small friends, big teamwork.
5. **Inba and Her Poonai Kutties** — Super Girl Inba saves her three kittens
   from two funny foxes. This story also has **three short videos** and a
   **Tamil sing-along song** ("Inba Super Girl Paattu") on its page.

## Run it

It is a plain static site — no build step.

- Open `index.html` in a browser, **or**
- serve it: `python3 -m http.server` and visit <http://localhost:8000>, **or**
- enable **GitHub Pages** (repo Settings → Pages → deploy from `main`
  branch, root folder) to publish it on the web.

## Add a new story

1. Add an entry to `stories.js` (title, tagline, age, minutes, image path,
   moral, and the story text as a list of paragraphs in `scenes`).
2. Drop a picture for it into `images/`.
3. Done — the home page card and the story page are generated automatically.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure (home shelf + story view) |
| `styles.css` | Colors, layout, and all animations |
| `stories.js` | The story library (edit this to add stories) |
| `app.js` | Card rendering, story view, read-aloud |
| `game.html` / `game.js` | Inba: Kitten Rescue game |
| `images/` | One illustration per story |
