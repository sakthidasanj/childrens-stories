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
- **Two tabs on the home page** — 📖 *Stories* and 🎮 *Game*: the game
  tab embeds *Inba: Kitten Rescue* right in the page (loaded only when
  the tab is opened), with a full-page option too.
- **A game!** — *Inba: Kitten Rescue* (`game.html`): a Mario-style runner
  where Inba jumps over the funny foxes and frees her kittens from cages,
  with "Inba Super Girl Paattu" playing very softly and distinct sound
  effects for jumping, kitten rescues and fox catches.
  She runs through a soft, muted forest — mountains, a lake with a
  deer, pine, leafy and palm trees, rabbits and birds — where the
  forest men cheer "Inba akka vaazhga!" from between the trees.
  All background colours are kept pale so the gameplay stands out.
  Snappy jumps and a cape double-jump. There are no lives or hearts —
  the run is endless, and a fox catch just tells Inba to be careful —
  in Sakthidasan's own recorded voice, one of his 9 "be careful!"
  clips (`media/careful-1.mp3` … `media/careful-9.mp3`) at random.
  Inba's cape hangs
  still while she runs and streams out fluidly when she jumps; every
  freed kitten meows with one of Sakthidasan's own recorded meow
  clips (`media/meow-1.mp3` … `media/meow-8.mp3`, a random one every
  rescue), and less often one praises her in his own recorded voice —
  one of his 7 praise clips (`media/praise-1.mp3` …
  `media/praise-7.mp3`), also picked at random.
  Six kitten styles — Vellai, Mittai, Chinna plus Karuppu, Pulli and
  Neelam — each escaping in her own way (hop, zigzag, tiny hops, dash,
  big leaps, twirl) at her own speed. The foxes walk three ways too —
  sneak (slow), trot, gallop (fast) — with extra jumping space after
  a galloping fox.
  Linked from the home page and from Inba's story page.
- **Animations everywhere** — drifting clouds, twinkling stars, bobbing
  balloons, bouncing titles, wiggling "Read me" arrows, and a shiny sweep
  across every story picture. Respects `prefers-reduced-motion`.

## The stories

All stories are original, written for this site, for ages 3–8:

1. **Inba, the Brave Little Fox** — being brave for a friend.
2. **Inba, the Singing Turtle** — everyone's song is special.
3. **Inba and the Rainbow Kite** — sharing doubles happiness.
4. **Inba and the Moon's Lost Star** — small friends, big teamwork.
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
