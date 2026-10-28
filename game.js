(function () {
  "use strict";

  /* ================= Setup ================= */
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;   // 960
  var H = canvas.height;  // 540
  var GROUND = H - 78;    // y of the ground surface

  var kittensChip = document.getElementById("kittensChip");
  var timeChip = document.getElementById("timeChip");
  var foxChip = document.getElementById("foxChip");
  var distChip = document.getElementById("distChip");
  var startOverlay = document.getElementById("startOverlay");
  var endOverlay = document.getElementById("endOverlay");
  var nameInput = document.getElementById("nameInput");
  var endSummary = document.getElementById("endSummary");
  var endCardList = document.getElementById("endCardList");
  var startCard = document.getElementById("startCard");
  var startCardList = document.getElementById("startCardList");
  var soundBtn = document.getElementById("soundBtn");
  var bgSong = document.getElementById("bgSong");
  bgSong.volume = 0.04; // song sits very quietly under the action (halved again 2026-10-25 at the user's request)
  // Sakthidasan's OWN recorded praise clips for the kittens (7 takes,
  // recorded on his phone 2026-10-25). Played at random, less often.
  var PRAISE_CLIPS = [
    "media/praise-1.mp3", "media/praise-2.mp3", "media/praise-3.mp3",
    "media/praise-4.mp3", "media/praise-5.mp3", "media/praise-6.mp3",
    "media/praise-7.mp3"
  ];
  var praiseAudios = [];
  for (var pi = 0; pi < PRAISE_CLIPS.length; pi++) {
    try {
      var pa = new Audio(PRAISE_CLIPS[pi]);
      pa.preload = "auto";
      pa.volume = 0.9;
      praiseAudios.push(pa);
    } catch (e) { /* clip unavailable — praise just stays silent */ }
  }
  // Sakthidasan's OWN recorded MEOW clips (8 takes, recorded on his
  // phone 2026-10-25). One plays at random on EVERY kitten rescue.
  var MEOW_CLIPS = [
    "media/meow-1.mp3", "media/meow-2.mp3", "media/meow-3.mp3",
    "media/meow-4.mp3", "media/meow-5.mp3", "media/meow-6.mp3",
    "media/meow-7.mp3", "media/meow-8.mp3"
  ];
  var meowAudios = [];
  for (var mi = 0; mi < MEOW_CLIPS.length; mi++) {
    try {
      var ma = new Audio(MEOW_CLIPS[mi]);
      ma.preload = "auto";
      ma.volume = 0.9;
      meowAudios.push(ma);
    } catch (e) { /* clip unavailable — synthesized meow is the fallback */ }
  }
  // Sakthidasan's OWN recorded "Be careful!" clips (9 takes, recorded
  // on his phone 2026-10-25 — laughs and all). One plays at random
  // whenever a fox catches Inba.
  var CAREFUL_CLIPS = [
    "media/careful-1.mp3", "media/careful-2.mp3", "media/careful-3.mp3",
    "media/careful-4.mp3", "media/careful-5.mp3", "media/careful-6.mp3",
    "media/careful-7.mp3", "media/careful-8.mp3", "media/careful-9.mp3"
  ];
  var carefulAudios = [];
  for (var ci = 0; ci < CAREFUL_CLIPS.length; ci++) {
    try {
      var ca = new Audio(CAREFUL_CLIPS[ci]);
      ca.preload = "auto";
      ca.volume = 0.9;
      carefulAudios.push(ca);
    } catch (e) { /* clip unavailable — tone cue is the fallback */ }
  }
  function playRandomClip(pool) {
    if (!soundOn || !pool.length) return false;
    var clip = pool[Math.floor(Math.random() * pool.length)];
    try {
      clip.currentTime = 0;
      var p = clip.play();
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  /* ================= Sound effects (WebAudio) ================= */
  var audioCtx = null;
  var soundOn = true;
  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function tone(freqA, freqB, dur, type, vol, when) {
    if (!soundOn || !audioCtx) return;
    var t0 = audioCtx.currentTime + (when || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freqA, t0);
    if (freqB && freqB !== freqA) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqB, 1), t0 + dur);
    }
    gain.gain.setValueAtTime(vol || 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  function sfxJump(doubleJump) {
    // Whoosh up — higher and brighter for the cape double-jump.
    if (doubleJump) {
      tone(520, 1180, 0.15, "triangle", 0.17);
      tone(780, 1420, 0.12, "sine", 0.1, 0.03);
    } else {
      tone(300, 820, 0.15, "triangle", 0.16);
      tone(450, 900, 0.1, "sine", 0.08, 0.02);
    }
  }
  function sfxMeow(when) {
    // Synthesized "meow" — FALLBACK ONLY, used if none of his recorded
    // meow clips can play: rises then slides down (the classic me-ow
    // shape), then a shorter happy chirp.
    tone(620, 940, 0.09, "sawtooth", 0.075, when);
    tone(940, 480, 0.17, "sawtooth", 0.085, when + 0.09);
    tone(980, 720, 0.11, "triangle", 0.07, when + 0.3);
  }
  function sfxKittenVoice() {
    // A freed kitten praises Inba in Sakthidasan's OWN recorded voice:
    // one of his 7 praise clips ("Inba akka vaazhga!" and friends),
    // picked at random. Real recordings — never an automated voice.
    playRandomClip(praiseAudios);
  }
  function sfxRescue() {
    // Cage pop + one of his recorded meows (random, every rescue) +
    // sparkle arpeggio.
    tone(220, 440, 0.08, "square", 0.1);
    if (!playRandomClip(meowAudios)) sfxMeow(0.05);
    tone(523, 523, 0.11, "sine", 0.15, 0.05);
    tone(659, 659, 0.11, "sine", 0.15, 0.14);
    tone(784, 784, 0.12, "sine", 0.15, 0.23);
    tone(1047, 1047, 0.22, "sine", 0.16, 0.32);
  }
  function sfxCatch() {
    // The fox catches her: two sharp yips and a grab thud.
    tone(1150, 900, 0.07, "square", 0.11);
    tone(1250, 950, 0.07, "square", 0.11, 0.09);
    tone(160, 60, 0.22, "sawtooth", 0.16, 0.14);
  }
  function sfxCareful() {
    // Gentle "be careful!" tone cue — FALLBACK ONLY, if none of his
    // recorded careful clips can play. Two soft attention notes,
    // nothing scary and no penalty. (There are no lives/hearts to lose.)
    tone(740, 740, 0.1, "triangle", 0.12, 0.16);
    tone(880, 880, 0.14, "triangle", 0.12, 0.28);
  }
  function sfxHit() {
    // Fox-catch yips, then "be careful!" in his OWN recorded voice
    // (random one of 9 clips); the gentle tone cue is only a fallback.
    sfxCatch();
    if (!playRandomClip(carefulAudios)) sfxCareful();
  }

  /* ================= Game state ================= */
  // SIX kitten styles — Inba's three kittens plus three friends who
  // joined the game. Each has its own look AND its own escape style
  // and escape speed once freed:
  //   hop    = classic happy hops (medium)      zigzag = scamper (fast)
  //   tiny   = quick little hops (slower)       dash   = low fast run (fastest)
  //   leap   = big slow arcs (slower)           twirl  = spins as she hops (medium)
  var KITTENS = [
    { name: "Vellai", color: "#ffffff", ear: "#ffb6c9", scale: 1.0, escape: "hop", vx: 4.6 },
    { name: "Mittai", color: "#f5a623", ear: "#ffe0b2", scale: 1.0, escape: "zigzag", vx: 5.6 },
    { name: "Chinna", color: "#cfd8dc", ear: "#ffcdd2", scale: 0.78, escape: "tiny", vx: 3.8 },
    { name: "Karuppu", color: "#3b3b46", ear: "#8e8ea3", scale: 0.95, escape: "dash", vx: 6.4 },
    { name: "Pulli", color: "#f3e3c2", ear: "#ffb6c9", scale: 1.02, escape: "leap", vx: 3.9 },
    { name: "Neelam", color: "#8fa8c8", ear: "#cdd9ea", scale: 0.92, escape: "twirl", vx: 4.9 }
  ];

  // Snappier jump: strong gravity + slightly lower launch = high enough to
  // clear a tall fox (~89px), but airborne ~28 frames instead of ~46, so
  // Inba lands well past one fox and can jump again almost right away.
  var GRAVITY = 0.95;
  var JUMP_V = -13.2;
  var DOUBLE_JUMP_V = -11.2;

  var state = "ready"; // ready | playing | over — no lives and no
  // game over from foxes; a run ends only when the 2 minutes run out,
  // and then the scorecard shows (see RUN_SECONDS below).
  var inba, obstacles, freedKittens, floaters, particles;
  var rescued, speed, frame, spawnIn, kittenCycle, shake;
  var lastFoxGait = null; // a gallop widens the gap before the next obstacle

  /* ===== Timed runs + scorecard (added 2026-10-25 at the user's ask):
     type your name, run for 2 minutes, and the scorecard ranks players
     by how many foxes they SURVIVED (jumped/passed without a catch);
     distance breaks ties. The scorecard is SHARED across devices: it
     lives as one flat JSON file inside Cloudflare's storage, served by
     /api/scores (see functions/api/scores.js). If that endpoint is not
     reachable (site opened locally, storage not bound yet), the game
     quietly falls back to this browser's localStorage card, so play
     never breaks. ===== */
  var RUN_SECONDS = 120;
  var SCORES_API = "/api/scores";
  var playerName = "Player";
  var timeLeft = RUN_SECONDS, foxesDodged = 0, distanceM = 0, lastEntry = null;
  var sharedCard = null; // top scores from Cloudflare, once fetched

  function loadCard() {
    try {
      var raw = window.localStorage.getItem("inbaScorecardV1");
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCard(arr) {
    try { window.localStorage.setItem("inbaScorecardV1", JSON.stringify(arr)); } catch (e) {}
  }
  function sortCard(arr) {
    arr.sort(function (a, b) {
      return (b.foxes - a.foxes) || (b.dist - a.dist) || (b.kittens - a.kittens);
    });
    return arr;
  }
  // The best list we can show right now: the shared Cloudflare card if
  // we have it, otherwise this device's local card.
  function bestCard() {
    return sharedCard || sortCard(loadCard());
  }
  function fetchShared() {
    if (typeof fetch !== "function") return Promise.resolve(false);
    return fetch(SCORES_API, { headers: { "accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.scores)) {
          sharedCard = data.scores;
          return true;
        }
        return false;
      })
      .catch(function () { return false; });
  }
  function submitShared(entry) {
    if (typeof fetch !== "function") return Promise.resolve(false);
    return fetch(SCORES_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry)
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.scores)) {
          sharedCard = data.scores;
          return true;
        }
        return false;
      })
      .catch(function () { return false; });
  }
  function renderCard(listEl, cardEl, limit, source) {
    var arr = sortCard((source || bestCard()).slice()).slice(0, limit);
    listEl.innerHTML = "";
    if (!arr.length) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No runs yet — be the first! 🦊";
      listEl.appendChild(empty);
      if (cardEl) cardEl.hidden = false;
      return;
    }
    var medals = ["🥇", "🥈", "🥉"];
    for (var i = 0; i < arr.length; i++) {
      var en = arr[i];
      var li = document.createElement("li");
      if (lastEntry && en.ts === lastEntry.ts) li.className = "me";
      var rank = document.createElement("span");
      rank.textContent = medals[i] || (i + 1) + ".";
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = en.name;
      var stats = document.createElement("span");
      stats.textContent = "🦊 " + en.foxes + " · 🏃 " + en.dist + " m · 🐱 " + en.kittens;
      li.appendChild(rank); li.appendChild(who); li.appendChild(stats);
      listEl.appendChild(li);
    }
    if (cardEl) cardEl.hidden = false;
  }

  function reset() {
    inba = { x: 130, y: GROUND, vy: 0, grounded: true, runPhase: 0, invincible: 0, jumps: 0, jumpBuffer: 0, capeLift: 0, capeFlare: 0 };
    obstacles = [];
    freedKittens = [];
    floaters = [];
    particles = [];
    rescued = 0;
    speed = 5;
    frame = 0;
    spawnIn = 380;
    kittenCycle = 0;
    shake = 0;
    timeLeft = RUN_SECONDS;
    foxesDodged = 0;
    distanceM = 0;
    updateHUD();
  }

  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }
  function updateHUD() {
    timeChip.textContent = "⏱ " + fmtTime(timeLeft);
    foxChip.textContent = "🦊 Foxes: " + foxesDodged;
    kittensChip.textContent = "🐱 Rescued: " + rescued;
    distChip.textContent = "🏃 " + Math.floor(distanceM) + " m";
  }

  /* ================= Spawning ================= */
  function spawnNext() {
    // Alternate-ish pattern: mostly foxes, a cage every few spawns.
    var makeCage = (kittenCycle % 3 === 2) || Math.random() < 0.26;
    if (makeCage) {
      var k = KITTENS[kittenCycle % KITTENS.length];
      kittenCycle++;
      obstacles.push({
        type: "cage", x: W + 70, w: 74, h: 96,
        kitten: k, freed: false, door: 0
      });
    } else {
      var tall = Math.random() < 0.45;
      // THREE fox walking styles, each with its own speed range:
      //   sneak  — low crouch, quick small steps, SLOW (0.7–1.1)
      //   trot   — the classic run, MEDIUM (1.3–1.7)
      //   gallop — big bounding strides, FAST (1.9–2.3)
      var gaitRoll = Math.random();
      var gait = gaitRoll < 0.34 ? "sneak" : gaitRoll < 0.72 ? "trot" : "gallop";
      var gaitSpeed = gait === "sneak" ? 0.7 + Math.random() * 0.4
        : gait === "gallop" ? 1.9 + Math.random() * 0.4
        : 1.3 + Math.random() * 0.4;
      obstacles.push({
        type: "fox", kind: tall ? "neela" : "kuttai",
        x: W + 90, w: tall ? 88 : 66, h: tall ? 62 : 46,
        phase: Math.random() * 6.28, ownSpeed: gaitSpeed, gait: gait
      });
      lastFoxGait = gait;
    }
    // Wider gaps: after landing from one jump there is always room to
    // run a few steps and jump again before the next obstacle arrives.
    // A galloping fox earns the NEXT obstacle extra space, so a fast
    // fox is always followed by a fair jumping gap.
    spawnIn = (430 + Math.random() * 290) * (5.4 / speed) + 150
      + (lastFoxGait === "gallop" ? 120 : 0);
  }

  /* ================= Actions ================= */
  function jump() {
    if (state !== "playing") return;
    if (inba.grounded) {
      inba.vy = JUMP_V;
      inba.grounded = false;
      inba.jumps = 1;
      inba.jumpBuffer = 0;
      inba.capeFlare = 13; // cape snaps out as she leaves the ground
      sfxJump(false);
    } else if (inba.jumps < 2) {
      // Super Girl cape double-jump: if a jump looks like it would land
      // on a fox, she can jump again in mid-air and escape over it.
      inba.vy = DOUBLE_JUMP_V;
      inba.jumps = 2;
      inba.jumpBuffer = 0;
      inba.capeFlare = 20; // bigger flare for the cape boost
      sfxJump(true);
      burst(inba.x + 22, inba.y - 6, "#ff6b6b", 7);
    } else {
      // Pressed a touch too early — remember it, and jump the moment
      // she lands instead of dropping the input.
      inba.jumpBuffer = 9;
    }
  }

  function startGame() {
    ensureAudio();
    var n = (nameInput.value || "").trim();
    playerName = n ? n.slice(0, 14) : "Player";
    try { window.localStorage.setItem("inbaPlayerName", playerName); } catch (e) {}
    reset();
    state = "playing";
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    if (soundOn) { bgSong.currentTime = 0; bgSong.play().catch(function () {}); }
  }

  function showEndSummary(arr) {
    var rank = 0;
    for (var ri = 0; ri < arr.length; ri++) {
      if (arr[ri].ts === lastEntry.ts) { rank = ri + 1; break; }
    }
    endSummary.textContent = playerName + " survived 🦊 " + lastEntry.foxes +
      " foxes, ran 🏃 " + lastEntry.dist + " m and rescued 🐱 " + lastEntry.kittens +
      " kittens!" + (rank === 1 ? " 🏆 New top score!"
        : rank > 0 ? " (Scorecard rank #" + rank + ")"
        : " (just outside the top 10)");
  }

  function endRun() {
    state = "over";
    timeLeft = 0;
    updateHUD();
    bgSong.pause();
    lastEntry = {
      name: playerName, foxes: foxesDodged,
      dist: Math.floor(distanceM), kittens: rescued,
      ts: Date.now()
    };
    // Always keep this device's local mirror…
    var arr = loadCard();
    arr.push(lastEntry);
    saveCard(sortCard(arr).slice(0, 10));
    showEndSummary(sortCard(loadCard()));
    renderCard(endCardList, null, 10);
    endOverlay.hidden = false;
    // …and send the score to the shared Cloudflare file. When it
    // answers, refresh the scorecard + rank with the shared truth.
    submitShared(lastEntry).then(function (ok) {
      if (ok && state === "over") {
        showEndSummary(sharedCard);
        renderCard(endCardList, null, 10);
      }
    });
  }

  function hitFox(ob) {
    // A fox catch costs nothing — no lives, no hearts, no game over.
    // It just warns her to be careful, gives her a brief moment where
    // the same fox can't catch her again, and she keeps running.
    ob.counted = true; // one catch per fox
    inba.invincible = 80;
    shake = 6;
    sfxHit(); // fox-catch yips + the gentle "be careful" cue
    floaters.push({ text: "🦊 Oops — be careful, Inba!", x: inba.x + 30, y: inba.y - 120, life: 75 });
    burst(inba.x + 30, inba.y - 50, "#ff8fab", 8);
  }

  function freeKitten(ob) {
    ob.freed = true;
    rescued++;
    sfxRescue(); // includes the meow, every time
    var esc = ob.kitten.escape || "hop";
    freedKittens.push({
      kitten: ob.kitten, x: ob.x + 20, y: GROUND,
      vy: esc === "dash" ? -2.5 : esc === "leap" ? -11 : esc === "tiny" ? -6.5 : -9.5,
      vx: ob.kitten.vx || 4.6, escape: esc, phase: 0, spin: 0
    });
    floaters.push({ text: "🎉 " + ob.kitten.name + " saved!", x: ob.x, y: GROUND - 130, life: 70 });
    // Less often (about 1 rescue in 6) the kitten praises Inba with
    // one of his own recorded voice clips, picked at random.
    if (Math.random() < 0.17) {
      sfxKittenVoice();
      floaters.push({ text: "🐱💛 “Inba akka vaazhga!”", x: ob.x + 10, y: GROUND - 168, life: 80 });
    }
    burst(ob.x + 37, GROUND - 60, "#ffd166", 14);
    updateHUD();
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4 - 1,
        life: 26 + Math.random() * 18,
        color: color, r: 2 + Math.random() * 3
      });
    }
  }

  /* ================= Update ================= */
  function update(dt) {
    frame += dt;
    speed = Math.min(8.6, 5 + frame * 0.0013);

    // The 2-minute countdown and the distance marker
    timeLeft -= dt / 60;
    distanceM += speed * dt * 0.045;
    if (timeLeft <= 0) { endRun(); return; }
    updateHUD();

    // Inba physics
    inba.vy += GRAVITY * dt;
    inba.y += inba.vy * dt;
    if (inba.jumpBuffer > 0) inba.jumpBuffer -= dt;
    if (inba.y >= GROUND) {
      inba.y = GROUND; inba.vy = 0; inba.grounded = true; inba.jumps = 0;
      if (inba.jumpBuffer > 0) {
        inba.jumpBuffer = 0;
        inba.vy = JUMP_V;
        inba.grounded = false;
        inba.jumps = 1;
        inba.capeFlare = 13;
        sfxJump(false);
      }
    }
    // Fluid cape: lift eases toward 1 in the air (cape streams and
    // ripples) and settles back to 0 on the ground (cape hangs still).
    var capeTarget = inba.grounded ? 0 : 1;
    var capeRate = inba.grounded ? 0.06 : 0.14;
    inba.capeLift += (capeTarget - inba.capeLift) * Math.min(1, capeRate * dt);
    if (inba.capeFlare > 0) inba.capeFlare = Math.max(0, inba.capeFlare - dt);
    inba.runPhase += dt * (inba.grounded ? 0.32 : 0.08);
    if (inba.invincible > 0) inba.invincible -= dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 0.7);

    // Spawning
    spawnIn -= speed * dt;
    if (spawnIn <= 0) spawnNext();

    // Obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var ob = obstacles[i];
      ob.x -= speed * dt;
      if (ob.type === "fox") {
        ob.x -= ob.ownSpeed * dt;
        // Step rate per gait: sneak = quick little steps, gallop =
        // slower, bigger strides, trot in between.
        ob.phase += dt * (ob.gait === "sneak" ? 0.55 : ob.gait === "gallop" ? 0.26 : 0.35);
        // Collision (generously shrunk AABB — a near miss is a miss,
        // grazing a fox's tail or ears does not even count as a catch)
        if (!ob.counted && inba.invincible <= 0) {
          var ix = inba.x + 16, iy = inba.y - 80, iw = 26, ih = 80;
          var fx = ob.x + 15, fy = GROUND - ob.h + 15, fw = ob.w - 30, fh = ob.h - 17;
          if (ix < fx + fw && ix + iw > fx && iy < fy + fh && iy + ih > fy) hitFox(ob);
        }
        // Survived! The fox slipped past Inba without catching her —
        // that is the number the scorecard ranks by.
        if (!ob.counted && ob.x + ob.w < inba.x) {
          ob.counted = true;
          foxesDodged++;
          updateHUD();
        }
      } else if (ob.type === "cage") {
        if (ob.freed && ob.door < 1) ob.door = Math.min(1, ob.door + dt * 0.08);
        if (!ob.freed && ob.x + ob.w < inba.x + 46) freeKitten(ob);
      }
      if (ob.x < -130) obstacles.splice(i, 1);
    }

    // Freed kittens escape to the right — each in her OWN style:
    // hop (bouncy), zigzag (weaving scamper), tiny (quick mini-hops),
    // dash (low and flat-out), leap (big floaty arcs), twirl (spinning
    // hops). Speeds differ per kitten (see KITTENS vx values).
    for (var j = freedKittens.length - 1; j >= 0; j--) {
      var fk = freedKittens[j];
      fk.vy += (fk.escape === "leap" ? 0.38 : 0.55) * dt;
      fk.y += fk.vy * dt;
      var vxNow = fk.vx;
      if (fk.escape === "zigzag") vxNow = fk.vx + Math.sin(fk.phase * 2.4) * 1.7;
      fk.x += (vxNow - speed * 0.35) * dt;
      fk.phase += dt * (fk.escape === "tiny" ? 0.7 : 0.4);
      if (fk.escape === "twirl") fk.spin += dt * 0.22;
      if (fk.y >= GROUND) {
        fk.y = GROUND;
        if (fk.escape === "dash") fk.vy = 0; // stays low, just runs
        else if (fk.escape === "leap") fk.vy = fk.vy < -2 ? fk.vy * -0.4 : -10.5;
        else if (fk.escape === "tiny") fk.vy = fk.vy < -1.5 ? fk.vy * -0.4 : -3.0;
        else fk.vy = fk.vy < -2 ? fk.vy * -0.45 : -4.2;
      }
      if (fk.x > W + 60 || fk.x < -80) freedKittens.splice(j, 1);
    }

    // Floaters & particles
    for (var f = floaters.length - 1; f >= 0; f--) {
      floaters[f].y -= 0.7 * dt;
      floaters[f].life -= dt;
      if (floaters[f].life <= 0) floaters.splice(f, 1);
    }
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 0.16 * dt; pt.life -= dt;
      if (pt.life <= 0) particles.splice(p, 1);
    }
    updateHUD();
  }

  /* ================= Drawing ================= */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ============ Forest background — a modern oil-painting treatment:
     deep teal, olive and umber layers are broken with warm ochre and
     coral brush strokes, while Inba and the animals keep the cleanest,
     brightest colours so gameplay stays easy to read. ============ */
  function bgRand(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  // One visible "brush stroke": a soft, slightly tilted oval dab.
  function paintStroke(x, y, len, thick, color, alpha, tilt) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt || 0);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, len / 2, thick / 2, 0, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  // A cluster of broken-colour dabs, used for painted foliage and earth.
  function paintDabs(cx, cy, rx, ry, seed, colors, count, alpha) {
    for (var i = 0; i < count; i++) {
      var ang = bgRand(seed + i * 3.17) * 6.29;
      var dist = Math.sqrt(bgRand(seed + i * 4.31 + 9));
      paintStroke(
        cx + Math.cos(ang) * rx * dist,
        cy + Math.sin(ang) * ry * dist,
        8 + bgRand(seed + i * 5.13 + 21) * 19,
        3 + bgRand(seed + i * 6.29 + 33) * 5,
        colors[i % colors.length],
        alpha * (0.62 + bgRand(seed + i * 7.07 + 45) * 0.38),
        (bgRand(seed + i * 8.41 + 57) - 0.5) * 0.55
      );
    }
  }
  function drawPine(x, baseY, h, col) {
    ctx.fillStyle = "rgba(91,58,35,0.88)";
    ctx.fillRect(x - h * 0.045, baseY - h * 0.18, h * 0.09, h * 0.18);
    paintStroke(x - h * 0.01, baseY - h * 0.1, h * 0.055, h * 0.14, "#c08345", 0.34, 0.08);
    ctx.fillStyle = col;
    for (var t = 0; t < 3; t++) {
      var wTier = h * (0.62 - t * 0.15), yTier = baseY - h * 0.12 - t * h * 0.26;
      ctx.beginPath();
      ctx.moveTo(x - wTier / 2, yTier);
      ctx.lineTo(x, yTier - h * 0.34);
      ctx.lineTo(x + wTier / 2, yTier);
      ctx.closePath(); ctx.fill();
      // Broken warm light along one side of each tier, like a loaded brush.
      paintStroke(x - wTier * 0.18, yTier - h * 0.13, wTier * 0.34, h * 0.035,
        t % 2 ? "#d2ad58" : "#7fa06a", 0.30, -0.48);
    }
  }
  function drawLeafyTree(x, baseY, h, col, col2) {
    ctx.strokeStyle = "rgba(91,58,35,0.9)";
    ctx.lineWidth = h * 0.07; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + h * 0.05, baseY - h * 0.4, x, baseY - h * 0.58); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, baseY - h * 0.72, h * 0.3, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x - h * 0.24, baseY - h * 0.58, h * 0.2, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + h * 0.24, baseY - h * 0.6, h * 0.21, 0, 6.29); ctx.fill();
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.arc(x - h * 0.1, baseY - h * 0.8, h * 0.16, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x + h * 0.14, baseY - h * 0.68, h * 0.13, 0, 6.29); ctx.fill();
    // Impressionist broken colour over the canopy: moss, gold and teal.
    paintDabs(x, baseY - h * 0.69, h * 0.29, h * 0.22, 17.3,
      ["#d2ad58", "#315f4b", "#88a04f", "#477b6d"], 13, 0.42);
  }
  function drawPalmTree(x, baseY, h, col) {
    ctx.strokeStyle = "rgba(105,67,38,0.9)";
    ctx.lineWidth = h * 0.06; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + h * 0.1, baseY - h * 0.55, x + h * 0.24, baseY - h * 0.92); ctx.stroke();
    paintStroke(x + h * 0.08, baseY - h * 0.48, h * 0.035, h * 0.36, "#d09a55", 0.26, -0.18);
    var tx = x + h * 0.24, ty = baseY - h * 0.92;
    ctx.strokeStyle = col; ctx.lineWidth = h * 0.045;
    for (var f = 0; f < 5; f++) {
      var ang = -0.3 - f * 0.5;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(ang) * h * 0.3, ty + Math.sin(ang) * h * 0.22 - h * 0.06,
        tx + Math.cos(ang) * h * 0.44, ty + Math.sin(ang) * h * 0.3 + h * 0.12);
      ctx.stroke();
    }
  }
  function drawDeer(x, baseY, s, col) {
    ctx.save(); ctx.translate(x, baseY); ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, -20, 17, 10, 0, 0, 6.29); ctx.fill(); // body
    ctx.fillRect(-14, -20, 3.4, 18); ctx.fillRect(-8, -20, 3.4, 18);
    ctx.fillRect(8, -20, 3.4, 18); ctx.fillRect(13, -20, 3.4, 18);     // legs
    ctx.beginPath(); ctx.ellipse(16, -33, 6.5, 5, -0.5, 0, 6.29); ctx.fill(); // head
    ctx.fillRect(10, -30, 9, 4);                                        // neck
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = "round";    // antlers
    ctx.beginPath(); ctx.moveTo(18, -38); ctx.lineTo(21, -46); ctx.moveTo(19.5, -42); ctx.lineTo(24, -44); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";                            // spots
    ctx.beginPath(); ctx.arc(-4, -23, 1.8, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -19, 1.6, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  function drawRabbit(x, baseY, s, col, hop) {
    ctx.save(); ctx.translate(x, baseY - hop); ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, -7, 10, 6.5, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -12, 5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.5, -20, 1.9, 6, -0.15, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10.5, -20, 1.9, 6, 0.15, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath(); ctx.arc(-9.5, -8, 2.8, 0, 6.29); ctx.fill();       // tail
    ctx.restore();
  }
  function drawForestMan(x, baseY, shirt, cheer) {
    var bounce = cheer ? Math.abs(Math.sin(frame * 0.18)) * 4 : 0;
    ctx.save(); ctx.translate(x, baseY - bounce);
    ctx.fillStyle = "rgba(70,50,35,0.85)";
    ctx.fillRect(-2.4, -16, 4.8, 16);                                    // legs
    ctx.fillStyle = shirt;
    rr(-7, -34, 14, 20, 5); ctx.fill();                                 // tunic
    ctx.strokeStyle = shirt; ctx.lineWidth = 3.6; ctx.lineCap = "round";
    ctx.beginPath();
    if (cheer) { ctx.moveTo(-6, -30); ctx.lineTo(-12, -44); ctx.moveTo(6, -30); ctx.lineTo(12, -44); }
    else { ctx.moveTo(-6, -30); ctx.lineTo(-10, -18); ctx.moveTo(6, -30); ctx.lineTo(10, -18); }
    ctx.stroke();
    ctx.fillStyle = "#8a5a3b";
    ctx.beginPath(); ctx.arc(0, -41, 6.4, 0, 6.29); ctx.fill();         // head
    ctx.fillStyle = "rgba(60,40,25,0.9)";
    ctx.beginPath(); ctx.arc(0, -43.5, 6.4, Math.PI, 0); ctx.fill();    // hair cap
    ctx.restore();
  }
  function drawShoutBubble(x, y, text) {
    ctx.save();
    ctx.font = "700 15px Fredoka, sans-serif";
    var wText = ctx.measureText(text).width + 22;
    ctx.fillStyle = "rgba(255,243,214,0.96)";
    rr(x - wText / 2, y - 34, wText, 27, 9); ctx.fill();
    ctx.strokeStyle = "rgba(151,94,35,0.72)"; ctx.lineWidth = 1.5;
    rr(x - wText / 2, y - 34, wText, 27, 9); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 8); ctx.lineTo(x + 7, y - 8); ctx.lineTo(x + 1, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#713f1d";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y - 15);
    ctx.restore();
  }

  function drawBackground() {
    // Oil-painted dawn sky: petrol blue melts through sage into ochre.
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#2e5d70");
    sky.addColorStop(0.34, "#69908c");
    sky.addColorStop(0.68, "#a9ad7c");
    sky.addColorStop(1, "#e3b96d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Broad horizontal brushwork across the sky, drifting very slowly.
    var skScroll = frame * speed * 0.05, skTile = 360, skOff = -(skScroll % skTile), skBase = Math.floor(skScroll / skTile);
    for (var ski = -1; ski < W / skTile + 2; ski++) {
      var skt = skBase + ski, skx = skOff + ski * skTile;
      paintStroke(skx + 55 + bgRand(skt * 13 + 1) * 180, 42 + bgRand(skt * 13 + 2) * 90,
        95 + bgRand(skt * 13 + 3) * 95, 7 + bgRand(skt * 13 + 4) * 8,
        bgRand(skt * 13 + 5) > 0.5 ? "#f0c978" : "#376b78", 0.13, -0.04);
      paintStroke(skx + 185 + bgRand(skt * 13 + 6) * 120, 128 + bgRand(skt * 13 + 7) * 86,
        75 + bgRand(skt * 13 + 8) * 85, 6 + bgRand(skt * 13 + 9) * 7,
        bgRand(skt * 13 + 10) > 0.45 ? "#829d82" : "#d99a5b", 0.11, 0.03);
    }

    // Painted sun: layered ochre glazes rather than a flat disc.
    ctx.fillStyle = "rgba(224,164,62,0.20)";
    ctx.beginPath(); ctx.arc(862, 74, 57, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(240,185,82,0.46)";
    ctx.beginPath(); ctx.arc(862, 74, 41, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#f4c65f";
    ctx.beginPath(); ctx.arc(862, 74, 29, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffe5a3";
    ctx.beginPath(); ctx.arc(858, 70, 20, 0, 6.29); ctx.fill();
    paintStroke(862, 91, 48, 6, "#d98243", 0.30, 0.03);

    // Clouds in three glazes: slate shadow, warm ivory and peach light.
    var ci, cx;
    for (ci = 0; ci < 5; ci++) {
      cx = ((ci * 230 + 60 - frame * 0.35) % (W + 240) + (W + 240)) % (W + 240) - 120;
      var cy = 46 + (ci % 3) * 34;
      ctx.fillStyle = "rgba(65,91,105,0.32)";
      ctx.beginPath();
      ctx.arc(cx, cy + 7, 22, 0, 6.29);
      ctx.arc(cx + 24, cy + 11, 17, 0, 6.29);
      ctx.arc(cx - 25, cy + 12, 15, 0, 6.29);
      ctx.fill();
      ctx.fillStyle = "rgba(248,235,203,0.80)";
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, 6.29);
      ctx.arc(cx + 24, cy + 4, 17, 0, 6.29);
      ctx.arc(cx - 25, cy + 5, 15, 0, 6.29);
      ctx.fill();
      paintStroke(cx + 4, cy - 8, 48, 8, "#eeb26d", 0.28, -0.05);
    }
    // Birds — little ink-dark "m" shapes drifting by
    ctx.strokeStyle = "rgba(30,48,55,0.62)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    for (var bi = 0; bi < 3; bi++) {
      var bx = ((bi * 340 + 140 - frame * 0.55) % (W + 160) + (W + 160)) % (W + 160) - 80;
      var by = 60 + bi * 26 + Math.sin(frame * 0.05 + bi * 2) * 4, flap = Math.sin(frame * 0.3 + bi) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by + flap); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 3, bx + 8, by + flap);
      ctx.stroke();
    }

    // FAR MOUNTAINS — blue-grey, hazy, very slow
    var mScroll = frame * speed * 0.06, mTile = 620, mOff = -(mScroll % mTile), mBase = Math.floor(mScroll / mTile);
    for (var mi = -1; mi < W / mTile + 2; mi++) {
      var mt = mBase + mi, mx = mOff + mi * mTile;
      var h1 = 120 + bgRand(mt * 3 + 1) * 70, w1 = 300 + bgRand(mt * 3 + 2) * 80;
      ctx.fillStyle = "rgba(52,76,99,0.74)";
      ctx.beginPath();
      ctx.moveTo(mx, GROUND - 40); ctx.lineTo(mx + w1 / 2, GROUND - 40 - h1); ctx.lineTo(mx + w1, GROUND - 40); ctx.closePath(); ctx.fill();
      paintStroke(mx + w1 * 0.34, GROUND - 58 - h1 * 0.34, w1 * 0.25, 8, "#71808a", 0.26, -0.72);
      paintStroke(mx + w1 * 0.63, GROUND - 54 - h1 * 0.29, w1 * 0.22, 7, "#3d5d68", 0.32, 0.68);
      ctx.fillStyle = "rgba(255,239,196,0.62)";
      ctx.beginPath();
      ctx.moveTo(mx + w1 / 2 - w1 * 0.11, GROUND - 40 - h1 + h1 * 0.22);
      ctx.lineTo(mx + w1 / 2, GROUND - 40 - h1);
      ctx.lineTo(mx + w1 / 2 + w1 * 0.11, GROUND - 40 - h1 + h1 * 0.22);
      ctx.lineTo(mx + w1 / 2, GROUND - 40 - h1 + h1 * 0.13);
      ctx.closePath(); ctx.fill();
      var h2 = 80 + bgRand(mt * 5 + 3) * 50;
      ctx.fillStyle = "rgba(58,91,76,0.66)";
      ctx.beginPath();
      ctx.moveTo(mx + w1 * 0.45, GROUND - 40); ctx.lineTo(mx + w1 * 0.45 + 130, GROUND - 40 - h2); ctx.lineTo(mx + w1 * 0.45 + 260, GROUND - 40); ctx.closePath(); ctx.fill();
    }

    // LAKE — deep painted teal with broken gold reflections
    var lScroll = frame * speed * 0.12, lTile = 1500, lOff = -(lScroll % lTile);
    for (var li = -1; li < 2; li++) {
      var lx = lOff + li * lTile + 240;
      ctx.fillStyle = "rgba(31,82,91,0.84)";
      ctx.beginPath(); ctx.ellipse(lx + 260, GROUND - 26, 300, 26, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "rgba(91,139,130,0.50)";
      ctx.beginPath(); ctx.ellipse(lx + 250, GROUND - 29, 245, 17, 0, 0, 6.29); ctx.fill();
      for (var lw = 0; lw < 5; lw++) {
        var shimmer = Math.sin(frame * 0.04 + lw * 1.7) * 6;
        paintStroke(lx + 112 + lw * 82 + shimmer, GROUND - 36 + lw * 5,
          38 + (lw % 3) * 13, 3.2, lw % 2 ? "#f2cd78" : "#dce8d2", 0.42, 0.01);
      }
      // a deer drinking at the lake edge
      drawDeer(lx + 60, GROUND - 18, 0.9, "rgba(146,92,50,0.90)");
    }

    // FAR TREE LINE — soft green shapes, gentle parallax
    var fScroll = frame * speed * 0.2, fTile = 460, fOff = -(fScroll % fTile), fBase = Math.floor(fScroll / fTile);
    for (var fi = -1; fi < W / fTile + 2; fi++) {
      var ft = fBase + fi, fx0 = fOff + fi * fTile;
      drawPine(fx0 + 60 + bgRand(ft * 7 + 1) * 60, GROUND - 30, 120 + bgRand(ft * 7 + 2) * 40, "rgba(70,103,83,0.74)");
      drawLeafyTree(fx0 + 230 + bgRand(ft * 7 + 3) * 60, GROUND - 30, 105 + bgRand(ft * 7 + 4) * 35, "rgba(91,116,79,0.74)", "rgba(172,164,91,0.68)");
      drawPine(fx0 + 380 + bgRand(ft * 7 + 5) * 50, GROUND - 30, 135 + bgRand(ft * 7 + 6) * 40, "rgba(61,96,78,0.74)");
    }

    // NEAR FOREST — bigger trees (pine, leafy, palm), rabbits, and the
    // forest men who cheer for Inba. Still muted, slightly stronger.
    var nScroll = frame * speed * 0.45, nTile = 780, nOff = -(nScroll % nTile), nBase = Math.floor(nScroll / nTile);
    for (var ni = -1; ni < W / nTile + 2; ni++) {
      var nt = nBase + ni, nx = nOff + ni * nTile;
      drawPalmTree(nx + 90 + bgRand(nt * 11 + 1) * 50, GROUND - 6, 150 + bgRand(nt * 11 + 2) * 40, "rgba(69,104,61,0.92)");
      drawLeafyTree(nx + 330 + bgRand(nt * 11 + 3) * 60, GROUND - 6, 165 + bgRand(nt * 11 + 4) * 45, "rgba(48,91,58,0.92)", "rgba(139,148,76,0.90)");
      drawPine(nx + 560 + bgRand(nt * 11 + 5) * 60, GROUND - 6, 185 + bgRand(nt * 11 + 6) * 50, "rgba(35,80,59,0.94)");
      // a rabbit near the leafy tree, hopping softly
      var hop = Math.abs(Math.sin(frame * 0.09 + nt)) * 4;
      drawRabbit(nx + 265 + bgRand(nt * 11 + 7) * 30, GROUND - 4, 0.95, "rgba(174,151,126,0.92)", hop);
      // a forest man between the trees — he cheers in turns: his arms
      // go up and his shout bubble appears for a stretch each cycle
      var manX = nx + 665, shoutPhase = (frame + nt * 137) % 560;
      var cheering = shoutPhase < 170;
      drawForestMan(manX, GROUND - 4, ["#b6512f", "#276f6a", "#bd8136"][Math.abs(nt) % 3], cheering);
      if (cheering && manX > 40 && manX < W - 40) {
        drawShoutBubble(manX, GROUND - 66, "Inba akka vaazhga!");
      }
    }

    // Olive-gold hills rolling right behind the track
    ctx.fillStyle = "rgba(119,132,70,0.54)";
    var hx = -((frame * speed * 0.25) % 480);
    for (var hxi = hx; hxi < W + 480; hxi += 480) {
      ctx.beginPath();
      ctx.arc(hxi + 240, GROUND + 66, 250, Math.PI, 0);
      ctx.fill();
    }

    // Ground — deep olive earth with a warm painted running edge.
    var groundGrad = ctx.createLinearGradient(0, GROUND, 0, H);
    groundGrad.addColorStop(0, "#718044");
    groundGrad.addColorStop(0.28, "#5d703a");
    groundGrad.addColorStop(1, "#37492c");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#c39a4e";
    ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = "#879c48";
    ctx.fillRect(0, GROUND + 4, W, 6);

    // Broken strokes of moss, ochre, umber and teal across the earth.
    var gScroll = frame * speed, gTile = 190, gOff = -(gScroll % gTile), gBase = Math.floor(gScroll / gTile);
    var groundColors = ["#82954b", "#a98b45", "#466b4c", "#77663a", "#315f52"];
    for (var gi = -1; gi < W / gTile + 2; gi++) {
      var gt = gBase + gi, gx0 = gOff + gi * gTile;
      for (var gs = 0; gs < 5; gs++) {
        paintStroke(
          gx0 + 24 + bgRand(gt * 17 + gs * 3 + 1) * 145,
          GROUND + 18 + bgRand(gt * 17 + gs * 3 + 2) * 52,
          24 + bgRand(gt * 17 + gs * 3 + 3) * 38,
          3.5 + bgRand(gt * 17 + gs * 5 + 4) * 3.5,
          groundColors[(Math.abs(gt + gs) % groundColors.length)],
          0.22, (bgRand(gt * 19 + gs) - 0.5) * 0.12
        );
      }
    }
    // Grass tufts scrolling — darker ink-green against the earth
    ctx.strokeStyle = "rgba(31,61,35,0.78)";
    ctx.lineWidth = 2.5;
    var off = (frame * speed) % 52;
    for (var gx = -off; gx < W + 52; gx += 52) {
      ctx.beginPath();
      ctx.moveTo(gx, GROUND + 16);
      ctx.lineTo(gx + 4, GROUND + 5);
      ctx.moveTo(gx + 9, GROUND + 16);
      ctx.lineTo(gx + 13, GROUND + 4);
      ctx.stroke();
    }
    // Painted wildflowers: coral, gold and violet dabs
    var foff = (frame * speed) % 170;
    var flowerCols = ["rgba(224,112,76,0.88)", "rgba(240,195,92,0.9)", "rgba(151,119,178,0.82)"];
    for (var fx2 = -foff + 40, fi2 = 0; fx2 < W + 170; fx2 += 170, fi2++) {
      ctx.fillStyle = flowerCols[fi2 % 3];
      ctx.beginPath(); ctx.arc(fx2, GROUND + 34, 4, 0, 6.29); ctx.fill();
      ctx.fillStyle = flowerCols[(fi2 + 1) % 3];
      ctx.beginPath(); ctx.arc(fx2 + 26, GROUND + 52, 4, 0, 6.29); ctx.fill();
    }

    // Varnish: a gentle vignette concentrates the scene like a canvas.
    var vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, W * 0.72);
    vignette.addColorStop(0, "rgba(20,25,16,0)");
    vignette.addColorStop(1, "rgba(20,25,16,0.20)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  // Fur shading per kitten: main, shadow, stripe and belly tones.
  var KITTEN_FUR = {
    "Vellai": { shadow: "#d9dee6", stripe: null, belly: "#ffffff", spots: null },
    "Mittai": { shadow: "#d9820f", stripe: "#b96a08", belly: "#ffe7bd", spots: null },
    "Chinna": { shadow: "#a7b3bc", stripe: "#87969f", belly: "#eef3f6", spots: null },
    "Karuppu": { shadow: "#26262e", stripe: null, belly: "#55555f", spots: null },
    "Pulli": { shadow: "#dfc391", stripe: null, belly: "#fff6e0", spots: "#c98f4e" },
    "Neelam": { shadow: "#6d87ad", stripe: null, belly: "#dfe9f5", spots: null }
  };

  function drawKitten(x, baseY, k, phase, happy, rot) {
    var s = k.scale;
    var fur = KITTEN_FUR[k.name] || { shadow: k.color, stripe: null, belly: "#ffffff", spots: null };
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    if (rot) ctx.rotate(rot);
    // A freed kitten GALLOPS like a real animal: the whole body rocks
    // nose-down / nose-up on the stride (on top of any twirl spin).
    if (happy) ctx.rotate(Math.sin(phase) * 0.06);
    var bob = happy ? Math.abs(Math.sin(phase)) * 5 : 0;
    ctx.translate(0, -bob);
    // soft ground shadow
    ctx.fillStyle = "rgba(60,90,40,0.22)";
    ctx.beginPath(); ctx.ellipse(0, 1 + bob, 17, 3.5, 0, 0, 6.29); ctx.fill();
    // tail — curved, tapered, with stripes; tip curls up happily and
    // streams side to side a little while she gallops
    var tailTipX = 25 + (happy ? Math.sin(phase + 0.8) * 2.5 : 0);
    ctx.lineCap = "round";
    ctx.strokeStyle = fur.shadow;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(13, -10);
    ctx.quadraticCurveTo(27, -14, tailTipX, -30 - (happy ? 3 : 0));
    ctx.stroke();
    ctx.strokeStyle = k.color;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(13, -10);
    ctx.quadraticCurveTo(27, -14, tailTipX, -30 - (happy ? 3 : 0));
    ctx.stroke();
    // LEGS. In the cage she sits still on two quiet paws. Once freed she
    // runs like a real kitten: front pair reaches forward while the back
    // pair pushes off (a gallop), each leg a curved, bending shape whose
    // paw tucks up as it swings through. sf/sb = paw swing of the front
    // and back pairs; lf/lb = how tucked-up each pair is mid-swing.
    var sf = happy ? Math.sin(phase) * 5 : 0;
    var sb = happy ? Math.sin(phase + 2.4) * 5 : 0;
    var lf = happy ? Math.max(0, Math.cos(phase)) : 0;
    var lb = happy ? Math.max(0, Math.cos(phase + 2.4)) : 0;
    function kitLeg(hipX, swing, liftP, front) {
      ctx.beginPath();
      ctx.moveTo(hipX, -6);
      ctx.quadraticCurveTo(hipX + swing * 0.4 + (front ? 1.2 : -1.2), -3,
        hipX + swing, -0.4 - liftP * 2.4);
      ctx.stroke();
    }
    if (happy) {
      // far pair first (slightly faded, tucked behind the body)
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = fur.shadow; ctx.lineWidth = 3;
      kitLeg(-7.5, sf * 0.85, lf, true);
      kitLeg(11.5, sb * 0.85, lb, false);
      ctx.restore();
    } else {
      ctx.fillStyle = fur.shadow;
      ctx.beginPath(); ctx.ellipse(-8, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
    }
    // body with shaded underside and a cream chest — while galloping
    // the spine stretches and gathers a little on the stride
    var bodyGrad = ctx.createLinearGradient(0, -26, 0, 0);
    bodyGrad.addColorStop(0, k.color);
    bodyGrad.addColorStop(1, fur.shadow);
    ctx.fillStyle = bodyGrad;
    var bodyRx = 17 + (happy ? Math.sin(phase + 0.6) * 1.5 : 0);
    ctx.beginPath(); ctx.ellipse(0, -12, bodyRx, 11.5, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = fur.belly;
    ctx.beginPath(); ctx.ellipse(-6, -8.5, 9, 6, -0.25, 0, 6.29); ctx.fill();
    // tabby stripes on the back (Mittai & Chinna)
    if (fur.stripe) {
      ctx.strokeStyle = fur.stripe;
      ctx.lineWidth = 1.7;
      for (var st = -1; st <= 1; st++) {
        ctx.beginPath();
        ctx.moveTo(3 + st * 6, -22.5);
        ctx.quadraticCurveTo(5 + st * 6, -17, 3 + st * 6, -13);
        ctx.stroke();
      }
    }
    // spots on the back and flank (Pulli)
    if (fur.spots) {
      ctx.fillStyle = fur.spots;
      ctx.beginPath(); ctx.ellipse(6, -19, 3.4, 2.4, 0.4, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, -13, 2.6, 1.9, -0.3, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-1, -15.5, 2.2, 1.6, 0.2, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, -7.5, 2.4, 1.7, 0.5, 0, 6.29); ctx.fill();
    }
    // near pair of galloping legs, drawn over the body's lower edge so
    // the bend reads clearly (far pair went under the body, above)
    if (happy) {
      ctx.strokeStyle = fur.shadow; ctx.lineWidth = 3.4;
      kitLeg(-9.5, sf, lf, true);
      kitLeg(9.5, sb, lb, false);
    }
    // head with shaded cheek side
    var headGrad = ctx.createRadialGradient(-14, -31, 2, -10, -26, 13);
    headGrad.addColorStop(0, k.color);
    headGrad.addColorStop(1, fur.shadow);
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(-10, -26, 11.5, 0, 6.29); ctx.fill();
    // ears with pink inners and little tufts
    ctx.fillStyle = fur.shadow;
    ctx.beginPath();
    ctx.moveTo(-19.5, -32); ctx.lineTo(-17, -44); ctx.lineTo(-9.5, -36); ctx.closePath();
    ctx.moveTo(-10, -36.5); ctx.lineTo(-3.5, -44); ctx.lineTo(-0.5, -32.5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = k.ear;
    ctx.beginPath();
    ctx.moveTo(-17, -34); ctx.lineTo(-15.8, -40.5); ctx.lineTo(-12, -35.5); ctx.closePath();
    ctx.moveTo(-7.8, -35.8); ctx.lineTo(-4.8, -40.5); ctx.lineTo(-3.2, -34); ctx.closePath();
    ctx.fill();
    // tabby "M" on the forehead
    if (fur.stripe) {
      ctx.strokeStyle = fur.stripe; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-14, -34); ctx.lineTo(-13, -30.5);
      ctx.moveTo(-10, -34.5); ctx.lineTo(-10, -31);
      ctx.moveTo(-6, -34); ctx.lineTo(-7, -30.5);
      ctx.stroke();
    }
    // muzzle, pink nose and mouth
    ctx.fillStyle = fur.belly;
    ctx.beginPath(); ctx.ellipse(-10, -21.5, 5.5, 3.8, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#f2789f";
    ctx.beginPath();
    ctx.moveTo(-11.6, -23.6); ctx.lineTo(-8.4, -23.6); ctx.lineTo(-10, -21.9); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a5a63"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-11.8, -20.6, 1.9, 0.1 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8.2, -20.6, 1.9, 0.1 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // eyes — green/amber with pupils and a light sparkle; happy = closed arcs
    if (happy) {
      ctx.lineWidth = 1.8; ctx.strokeStyle = "#33302e";
      ctx.beginPath(); ctx.arc(-14.5, -27, 2.7, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.beginPath(); ctx.arc(-5.5, -27, 2.7, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    } else {
      ctx.fillStyle = k.name === "Mittai" ? "#e8a13a" : "#57a773";
      ctx.beginPath(); ctx.ellipse(-14.5, -27, 2.3, 2.9, 0, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-5.5, -27, 2.3, 2.9, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#1c1c1c";
      ctx.beginPath(); ctx.ellipse(-14.5, -27, 0.9, 2.3, 0, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-5.5, -27, 0.9, 2.3, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-15.2, -28.4, 0.8, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(-6.2, -28.4, 0.8, 0, 6.29); ctx.fill();
    }
    // whiskers
    ctx.strokeStyle = "rgba(90,90,90,0.65)"; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-16, -22); ctx.lineTo(-23, -23.5);
    ctx.moveTo(-16, -20.5); ctx.lineTo(-23, -19.5);
    ctx.moveTo(-4, -22); ctx.lineTo(3, -23.5);
    ctx.moveTo(-4, -20.5); ctx.lineTo(3, -19.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawCage(ob) {
    var x = ob.x, w = ob.w, h = ob.h, top = GROUND - h;
    // kitten waiting inside
    if (!ob.freed) {
      drawKitten(x + w / 2 + 8, GROUND - 2, ob.kitten, 0, false);
    }
    // cage frame
    ctx.strokeStyle = "#5d5546";
    ctx.lineWidth = 5;
    rr(x, top + 14, w, h - 14, 8);
    ctx.stroke();
    // dome
    ctx.beginPath();
    ctx.arc(x + w / 2, top + 16, w / 2, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#c9973f";
    ctx.beginPath(); ctx.arc(x + w / 2, top - 2, 6, 0, 6.29); ctx.fill();
    // bars (back set)
    ctx.strokeStyle = "#8d8271";
    ctx.lineWidth = 4;
    for (var bx = x + 12; bx < x + w - 4; bx += 13) {
      ctx.beginPath(); ctx.moveTo(bx, top + 18); ctx.lineTo(bx, GROUND - 3); ctx.stroke();
    }
    // door slides open when freed
    var dOff = ob.door * (w - 18);
    var dAlpha = 1 - ob.door * 0.75;
    ctx.save();
    ctx.globalAlpha = dAlpha;
    ctx.strokeStyle = "#4c463a";
    ctx.lineWidth = 4.5;
    for (var dx = x + 7 - dOff; dx < x + w - 22 - dOff + 26; dx += 13) {
      if (dx > x + 2 && dx < x + w - 3) {
        ctx.beginPath(); ctx.moveTo(dx, top + 18); ctx.lineTo(dx, GROUND - 3); ctx.stroke();
      }
    }
    ctx.restore();
    // base
    ctx.fillStyle = "#6d4c2c";
    rr(x - 4, GROUND - 6, w + 8, 9, 4);
    ctx.fill();
  }

  function drawFox(ob) {
    var s = ob.kind === "neela" ? 1.14 : 0.82;
    var x = ob.x + ob.w / 2, baseY = GROUND;
    // Walking style per gait: sneak crouches low with small quick leg
    // swings; gallop bounds with big same-direction leg swings and a
    // body bounce; trot is the classic alternating run. Every leg is
    // TWO segments now — it flexes as it swings through (paw tucks up
    // and folds) and straightens as it plants, like a real animal.
    // The whole body rides the stride too: a pitch rock plus a bob.
    var stride = ob.gait === "gallop" ? 12 : ob.gait === "sneak" ? 4.5 : 8;
    var bobY = ob.gait === "sneak" ? 3.5 + Math.sin(ob.phase * 2) * 0.4
      : ob.gait === "gallop" ? -Math.abs(Math.sin(ob.phase)) * 4.5
      : -Math.abs(Math.sin(ob.phase)) * 1.8;
    var pitch = ob.gait === "gallop" ? Math.sin(ob.phase) * 0.055
      : ob.gait === "trot" ? Math.sin(ob.phase) * 0.02
      : Math.sin(ob.phase * 2) * 0.008;
    ctx.save();
    ctx.translate(x, baseY + bobY);
    ctx.scale(s, s);
    ctx.rotate(pitch);
    var run = Math.sin(ob.phase) * stride;
    var run2 = ob.gait === "gallop" ? Math.sin(ob.phase) * stride * 0.85 : Math.sin(ob.phase + Math.PI) * stride;
    var tailWag = Math.sin(ob.phase * 0.7) * 3;
    // One bending leg. (hipX, -14) is the hip; s = this leg's paw swing;
    // pLeg = its phase — the leg flexes hardest mid-swing (cos peaks as
    // the paw comes through): front paws tuck back-up, hind paws fold
    // forward-up, then both extend to plant. Dark "sock" paw at the end.
    function foxLeg(hipX, s, pLeg, front, col, wdt) {
      var liftP = Math.max(0, Math.cos(pLeg));
      var pawX = hipX + s + (front ? -liftP * 4 : liftP * 3.5);
      var pawY = -2 - liftP * 3;
      var kneeX = hipX + s * 0.42 + (front ? 1 + liftP * 2 : 2 + liftP * 2);
      var kneeY = -8 - liftP * 1.5;
      ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hipX, -14); ctx.lineTo(kneeX, kneeY); ctx.lineTo(pawX, pawY);
      ctx.stroke();
      ctx.fillStyle = "#5f3a17";
      ctx.beginPath(); ctx.ellipse(pawX, pawY + 0.5, wdt * 0.85, 3, 0, 0, 6.29); ctx.fill();
    }
    var phNear = ob.phase;
    var phFar = ob.gait === "gallop" ? ob.phase : ob.phase + Math.PI;
    // ground shadow
    ctx.fillStyle = "rgba(28,42,24,0.32)";
    ctx.beginPath(); ctx.ellipse(2, 2, 36, 5, 0, 0, 6.29); ctx.fill();
    // bushy tail (behind, on the right — fox faces left): layered fur
    // with a dark base band and a cream tip
    ctx.fillStyle = "#b85a10";
    ctx.beginPath(); ctx.ellipse(36, -31 + tailWag, 22, 12, -0.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#cf7118";
    ctx.beginPath(); ctx.ellipse(35, -33 + tailWag, 20, 10.5, -0.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath();
    ctx.moveTo(44, -42 + tailWag);
    ctx.quadraticCurveTo(56, -38 + tailWag, 53, -30 + tailWag);
    ctx.quadraticCurveTo(50, -24 + tailWag, 42, -26 + tailWag);
    ctx.quadraticCurveTo(48, -33 + tailWag, 44, -42 + tailWag);
    ctx.fill();
    // far legs (darker, opposite phase, bending at the knee/hock)
    foxLeg(-10, run2, phFar, true, "#9c4f0e", 6);
    foxLeg(16, run, phNear, false, "#9c4f0e", 6);
    // body — russet gradient, darker saddle on the back, cream belly
    var bodyGrad = ctx.createLinearGradient(0, -48, 0, -8);
    bodyGrad.addColorStop(0, "#c4680f");
    bodyGrad.addColorStop(0.45, "#dd7f1e");
    bodyGrad.addColorStop(1, "#e89b3c");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(2, -28, 31, 17.5, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(255,233,201,0.95)";
    ctx.beginPath(); ctx.ellipse(-3, -21, 19, 9.5, 0, 0, 6.29); ctx.fill();
    // jagged chest fur
    ctx.beginPath();
    ctx.moveTo(-24, -34); ctx.lineTo(-19, -27); ctx.lineTo(-25, -24);
    ctx.lineTo(-18, -19); ctx.lineTo(-26, -17);
    ctx.quadraticCurveTo(-30, -25, -24, -34);
    ctx.fill();
    // near legs (brighter, bending at the knee/hock)
    foxLeg(-16, run, phNear, true, "#c4680f", 6.5);
    foxLeg(10, run2, phFar, false, "#c4680f", 6.5);
    // ears first (behind head): tall, pointed, dark-backed, cream inner
    ctx.fillStyle = "#9c4f0e";
    ctx.beginPath();
    ctx.moveTo(-39, -50); ctx.lineTo(-37, -68); ctx.lineTo(-27, -54); ctx.closePath();
    ctx.moveTo(-25, -53); ctx.lineTo(-16, -66); ctx.lineTo(-11, -49); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe9c9";
    ctx.beginPath();
    ctx.moveTo(-36.5, -53); ctx.lineTo(-35.8, -63); ctx.lineTo(-29.5, -54); ctx.closePath();
    ctx.moveTo(-22.5, -53.5); ctx.lineTo(-17.5, -61.5); ctx.lineTo(-14.5, -51); ctx.closePath();
    ctx.fill();
    // head — russet top fading to cream cheeks, spiky cheek fur
    var headGrad = ctx.createLinearGradient(0, -58, 0, -28);
    headGrad.addColorStop(0, "#c96a12");
    headGrad.addColorStop(0.65, "#dd7f1e");
    headGrad.addColorStop(1, "#f2b25e");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(-27, -42, 15.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffe9c9";
    ctx.beginPath();
    ctx.moveTo(-38, -36); ctx.lineTo(-33, -30); ctx.lineTo(-36, -27);
    ctx.quadraticCurveTo(-28, -25, -20, -29);
    ctx.quadraticCurveTo(-24, -33, -24, -37);
    ctx.quadraticCurveTo(-32, -39, -38, -36);
    ctx.fill();
    // long tapered snout with a glossy black nose and a sly grin
    ctx.fillStyle = "#ffedd0";
    ctx.beginPath();
    ctx.moveTo(-39, -47); ctx.lineTo(-54, -39); ctx.lineTo(-53, -35.5);
    ctx.lineTo(-38, -33.5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#22201e";
    ctx.beginPath(); ctx.ellipse(-53.5, -37.5, 3.4, 2.8, -0.4, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(-54.5, -38.6, 1, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#7a4416"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(-44, -32.5, 5, 0.15 * Math.PI, 0.6 * Math.PI); ctx.stroke();
    // eye — amber with a dark pupil, sparkle, and a mischievous brow
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(-30, -44, 3.6, 3, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#e8a13a";
    ctx.beginPath(); ctx.arc(-30.5, -44, 2.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath(); ctx.ellipse(-31, -44, 1.1, 2, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-31.6, -45.2, 0.8, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#7a4416"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-36, -50.5); ctx.lineTo(-26, -49); ctx.stroke();
    // Neela Nari's blue bandana — wrap, knot and spotted tail-end
    if (ob.kind === "neela") {
      ctx.fillStyle = "#177e78";
      ctx.beginPath();
      ctx.moveTo(-23, -33); ctx.lineTo(-5, -29); ctx.lineTo(-8, -21);
      ctx.lineTo(-20, -23); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -27, 3.6, 0, 6.29); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, -25); ctx.lineTo(3, -18); ctx.lineTo(-3, -14); ctx.lineTo(-6, -21);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d8f3ee";
      ctx.beginPath(); ctx.arc(-15, -27.5, 1.4, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(-10, -24.5, 1.2, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }

  function drawInba() {
    var x = inba.x, feet = inba.y;
    // shadow
    var hgt = Math.min(1, (GROUND - feet) / 150);
    ctx.fillStyle = "rgba(28,42,24,0.36)";
    ctx.beginPath();
    ctx.ellipse(x + 24, GROUND + 8, 30 - hgt * 10, 6, 0, 0, 6.29);
    ctx.fill();

    if (inba.invincible > 0 && Math.floor(frame / 4) % 2 === 0 && state === "playing") return;

    ctx.save();
    ctx.translate(x, feet);
    var ph = inba.runPhase;
    var liftA = inba.capeLift || 0; // eases 0 (ground) -> 1 (air): blends run pose into jump pose
    var bounce = inba.grounded ? Math.abs(Math.sin(ph)) * 2.4 : 0;
    ctx.translate(0, -bounce);
    ctx.lineCap = "round";

    // RUN CYCLE — each leg on its own phase. A leg bends most while it
    // swings forward through the air: liftP peaks mid-swing, the knee
    // drives forward of the straight hip->foot line and the foot tucks
    // up. The planted leg stays nearly straight, like real running.
    function runLeg(hipX, p) {
      var sw = Math.sin(p), liftP = Math.max(0, Math.cos(p));
      var footX = hipX + sw * 13;
      var footY = -2 - liftP * 7;
      var bend = 0.15 + liftP * 0.85;
      return [footX, footY,
        (hipX + footX) / 2 + bend * 6.5,
        (-34 + footY) / 2 - bend * 2.5 - 1];
    }
    // JUMP POSE — rising: front knee tucked high, back leg trailing;
    // falling: both legs reach down, ready to land. airT: 0 rise -> 1 fall.
    var airT = Math.max(0, Math.min(1, (inba.vy + 12) / 24));
    function jumpLeg(front) {
      var rise = front ? [30, -18, 34, -30] : [8, -10, 16, -22];
      var fall = front ? [30, -6, 30, -20] : [14, -4, 20, -18];
      var o = [];
      for (var q = 0; q < 4; q++) o.push(rise[q] + (fall[q] - rise[q]) * airT);
      return o;
    }
    function blendPose(a, b) {
      var o = [];
      for (var q = 0; q < 4; q++) o.push(a[q] + (b[q] - a[q]) * liftA);
      return o;
    }
    var fPose = blendPose(runLeg(23, ph), jumpLeg(true));
    var bPose = blendPose(runLeg(20, ph + Math.PI), jumpLeg(false));
    var fFootX = fPose[0], fFootY = fPose[1], fKneeX = fPose[2], fKneeY = fPose[3];
    var bFootX = bPose[0], bFootY = bPose[1], bKneeX = bPose[2], bKneeY = bPose[3];

    // One arm with a BENT elbow. (sx, sy) = shoulder; s = swing value
    // -1..1 (arms pump opposite to the leg on the same side, like real
    // running). In the air the pose blends to: front arm reaching up,
    // back arm trailing down, with a soft flutter.
    function drawArm(sx, sy, s, front, col) {
      var ex = sx + s * 2.5, ey = sy + 11 - Math.abs(s) * 1.5;
      var hx = ex + 2 + s * 6, hy = ey + 3 - Math.max(0, s) * 4;
      if (liftA > 0) {
        var ax = front ? 34 : 13, ay = front ? -58 : -56;
        var ahx = front ? 41 : 5, ahy = front ? -73 : -45;
        var wob = Math.sin(frame * 0.3 + (front ? 0 : 2)) * 1.6 * liftA;
        ex += (ax - ex) * liftA; ey += (ay - ey) * liftA;
        hx += (ahx + wob - hx) * liftA; hy += (ahy - hy) * liftA;
      }
      ctx.strokeStyle = col; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(hx, hy + 0.5, 3.5, 0, 6.29); ctx.fill();
    }

    // Cape — fluid cloth, driven by inba.capeLift (0 = on the ground,
    // 1 = flying). On the ground it just hangs down her back, nearly
    // still. In the air it streams out behind her, lengthens, and a
    // ripple travels from her shoulders to the tip, growing as it goes;
    // a jump (capeFlare) makes it snap out with an extra billow.
    var lift = inba.capeLift || 0;
    var flare = (inba.capeFlare || 0) / 20; // 0..1, decays after a jump
    var SEG = 7, topPts = [], botPts = [], ci2, tt;
    for (ci2 = 0; ci2 <= SEG; ci2++) {
      tt = ci2 / SEG;
      // Spine of the cape: hangs down when grounded, levels out and
      // stretches back as lift rises.
      var spineX = 19 - tt * (13 + 46 * lift + 10 * flare);
      var spineY = -71 + tt * (36 * (1 - lift) - 3 * lift)
        + Math.sin(frame * 0.34 - tt * 5.4) * (0.7 + 6.5 * lift + 3 * flare) * tt
        + Math.sin(frame * 0.13 - tt * 2.2) * 1.1 * tt * (1 - lift);
      // Rising stretches it up a touch; falling lets the tip billow up.
      spineY += inba.grounded ? 0 : (inba.vy > 2 ? -3.5 * tt * lift : 1.5 * tt * lift);
      var thick = 30 * (1 - tt * 0.45); // cape width, tapering to the tip
      topPts.push([spineX, spineY]);
      botPts.push([spineX + 2, spineY + thick]);
    }
    var capeGrad = ctx.createLinearGradient(20, -72, topPts[SEG][0], topPts[SEG][1]);
    capeGrad.addColorStop(0, "#c8443c");
    capeGrad.addColorStop(0.55, "#a62b2e");
    capeGrad.addColorStop(1, "#701e26");
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(topPts[0][0], topPts[0][1]);
    for (ci2 = 1; ci2 <= SEG; ci2++) ctx.lineTo(topPts[ci2][0], topPts[ci2][1]);
    for (ci2 = SEG; ci2 >= 0; ci2--) ctx.lineTo(botPts[ci2][0], botPts[ci2][1]);
    ctx.closePath();
    ctx.fill();
    // Fold lines follow the same ripple, so the cloth looks layered.
    ctx.strokeStyle = "rgba(74,14,20,0.50)"; ctx.lineWidth = 1.5;
    var foldF;
    for (foldF = 0.33; foldF < 0.9; foldF += 0.28) {
      ctx.beginPath();
      for (ci2 = 0; ci2 <= SEG; ci2++) {
        tt = ci2 / SEG;
        var fx2 = topPts[ci2][0] + (botPts[ci2][0] - topPts[ci2][0]) * foldF;
        var fy2 = topPts[ci2][1] + (botPts[ci2][1] - topPts[ci2][1]) * foldF;
        if (ci2 === 0) ctx.moveTo(fx2, fy2); else ctx.lineTo(fx2, fy2);
      }
      ctx.stroke();
    }
    // Bright rim along the flying top edge.
    if (lift > 0.05) {
      ctx.strokeStyle = "rgba(255,183,140," + (0.55 * lift).toFixed(2) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      for (ci2 = 1; ci2 <= SEG; ci2++) ctx.lineTo(topPts[ci2][0], topPts[ci2][1]);
      ctx.stroke();
    }

    // back arm (slightly darker skin, pumps opposite to the front arm)
    drawArm(17, -65, Math.sin(ph), false, "#8a4b23");

    // legs — two segments each (thigh + shin) so the knees bend as she runs
    ctx.strokeStyle = "#a05c2c";
    ctx.lineWidth = 7;
    ctx.beginPath(); // back leg
    ctx.moveTo(20, -34); ctx.lineTo(bKneeX, bKneeY); ctx.lineTo(bFootX, bFootY - 2);
    ctx.stroke();
    ctx.strokeStyle = "#b06a34";
    ctx.beginPath(); // front leg
    ctx.moveTo(23, -34); ctx.lineTo(fKneeX, fKneeY); ctx.lineTo(fFootX, fFootY - 2);
    ctx.stroke();
    // shoes — red with a white sole and toe highlight
    function shoe(sx, sy) {
      ctx.fillStyle = "#c1272d";
      ctx.beginPath(); ctx.ellipse(sx + 1, sy - 1, 6.5, 4.2, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(sx + 1, sy + 1.8, 6.5, 1.8, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.ellipse(sx + 3.5, sy - 2.4, 2.4, 1.2, -0.3, 0, 6.29); ctx.fill();
    }
    shoe(bFootX, bFootY);
    shoe(fFootX, fFootY);

    // dress — peacock-teal gradient, soft fold lines, gold waist band
    var dressGrad = ctx.createLinearGradient(5, -72, 40, -30);
    dressGrad.addColorStop(0, "#2f8f83");
    dressGrad.addColorStop(1, "#175e5a");
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(12, -70);
    ctx.lineTo(33, -70);
    ctx.lineTo(41, -31);
    ctx.quadraticCurveTo(22, -26, 4, -31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(9,52,55,0.50)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -58); ctx.quadraticCurveTo(19, -44, 15, -32);
    ctx.moveTo(29, -58); ctx.quadraticCurveTo(30, -44, 32, -32);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(5, -38, 35, 5);
    ctx.fillStyle = "#d9962c";
    ctx.fillRect(5, -34.5, 35, 1.6);

    // front arm (sleeve puff, then the bent-elbow arm — it swings
    // opposite to the front leg, the way arms really pump when running)
    ctx.fillStyle = "#20736b";
    ctx.beginPath(); ctx.arc(30, -65, 5.5, 0, 6.29); ctx.fill();
    drawArm(30, -64, -Math.sin(ph), true, "#b06a34");

    // neck + head — warm skin gradient, ear, soft jaw shading
    ctx.fillStyle = "#a05c2c";
    ctx.fillRect(19, -76, 8, 7);
    var skinGrad = ctx.createRadialGradient(27, -88, 3, 23, -84, 15);
    skinGrad.addColorStop(0, "#c07c44");
    skinGrad.addColorStop(1, "#a05c2c");
    ctx.fillStyle = skinGrad;
    ctx.beginPath(); ctx.arc(23, -84, 13.5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(11.5, -83, 2.8, 0, 6.29); ctx.fill(); // ear
    ctx.fillStyle = "#8a4b23";
    ctx.beginPath(); ctx.arc(11.5, -83, 1.3, 0, 6.29); ctx.fill();
    // hair — cap with a side part, long ponytail with highlight strands
    ctx.fillStyle = "#232228";
    ctx.beginPath(); ctx.arc(21.5, -87.5, 13.8, Math.PI * 0.88, Math.PI * 2.02); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -92);
    ctx.quadraticCurveTo(4, -78 + Math.sin(frame * 0.18) * 2, 8, -64 + Math.sin(frame * 0.18) * 3);
    ctx.quadraticCurveTo(13, -62, 14, -74);
    ctx.quadraticCurveTo(14, -86, 12, -93);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,120,150,0.6)"; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(16, -96); ctx.quadraticCurveTo(10, -88, 11, -78);
    ctx.moveTo(21, -97); ctx.quadraticCurveTo(17, -90, 18, -82);
    ctx.stroke();
    ctx.fillStyle = "#ffd166"; // hair tie
    ctx.beginPath(); ctx.arc(12.5, -91, 3.4, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath(); ctx.arc(12.5, -91, 1.4, 0, 6.29); ctx.fill();
    // face — brow, eye with lashes and sparkle, nose, smile, blush
    ctx.strokeStyle = "#4a2c14"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(25.5, -90.5); ctx.quadraticCurveTo(29, -92, 32, -90.5); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(28.5, -85.5, 3.1, 2.6, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#3a2410";
    ctx.beginPath(); ctx.arc(29.3, -85.5, 1.9, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#120d08";
    ctx.beginPath(); ctx.arc(29.6, -85.5, 1, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(30.2, -86.4, 0.7, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#120d08"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(31.5, -87.5); ctx.lineTo(33.5, -88.5); // lash flick
    ctx.stroke();
    ctx.strokeStyle = "#8a4b23"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(34.5, -82, 2.2, Math.PI * 0.35, Math.PI * 0.95); ctx.stroke(); // nose
    ctx.strokeStyle = "#7a3410";
    ctx.beginPath(); ctx.moveTo(26, -78.5); ctx.quadraticCurveTo(28.5, -76.8, 31.5, -78); ctx.stroke(); // smile
    ctx.fillStyle = "rgba(255,120,130,0.35)"; // blush
    ctx.beginPath(); ctx.ellipse(25, -79.5, 3.2, 1.9, 0, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    var i;
    for (i = 0; i < obstacles.length; i++) {
      if (obstacles[i].type === "cage") drawCage(obstacles[i]);
    }
    for (i = 0; i < obstacles.length; i++) {
      if (obstacles[i].type === "fox") drawFox(obstacles[i]);
    }
    for (i = 0; i < freedKittens.length; i++) {
      var fk = freedKittens[i];
      var rot = fk.escape === "twirl" ? Math.sin(fk.spin || 0) * 0.45 : 0;
      drawKitten(fk.x, fk.y, fk.kitten, fk.phase, true, rot);
    }
    drawInba();
    // particles
    for (i = 0; i < particles.length; i++) {
      var pt = particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / 30);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // floaters
    ctx.font = "700 24px Fredoka, sans-serif";
    ctx.textAlign = "center";
    for (i = 0; i < floaters.length; i++) {
      var fl = floaters[i];
      ctx.globalAlpha = Math.min(1, fl.life / 30);
      ctx.fillStyle = "rgba(35,32,18,0.88)";
      ctx.fillText(fl.text, fl.x + 2, fl.y + 2);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(fl.text, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ================= Main loop ================= */
  var last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 16.667, 2.2);
    last = ts;
    if (state === "playing") update(dt);
    else frame += dt * 0.4; // gentle background drift on menu screens
    draw();
  }

  /* ================= Input ================= */
  document.addEventListener("keydown", function (e) {
    // Typing a name must never trigger a jump or a start (Space included)
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (state === "playing") jump();
      else if (state === "ready") startGame();
    }
  });
  document.getElementById("stage").addEventListener("pointerdown", function (e) {
    if (state === "playing") { e.preventDefault(); jump(); }
  });
  document.getElementById("playBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);
  document.getElementById("againBtn").addEventListener("click", startGame);
  document.getElementById("changeNameBtn").addEventListener("click", function () {
    endOverlay.hidden = true;
    state = "ready";
    renderCard(startCardList, startCard, 5);
    startOverlay.hidden = false;
    fetchShared().then(function (ok) {
      if (ok && state === "ready") renderCard(startCardList, startCard, 5);
    });
    try { nameInput.focus(); nameInput.select(); } catch (e) {}
  });
  // Enter inside the name box starts the run right away
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); startGame(); }
  });
  // Full screen: fill the whole phone screen with the stage and try to
  // lock landscape (the game is wide). Failures are fine — the button
  // simply does its best on whatever browser allows it.
  var fullBtn = document.getElementById("fullBtn");
  if (fullBtn) {
    fullBtn.addEventListener("click", function () {
      var stageEl = document.getElementById("stage");
      try {
        if (document.fullscreenElement) { document.exitFullscreen(); return; }
        var p = stageEl.requestFullscreen ? stageEl.requestFullscreen({ navigationUI: "hide" }) : null;
        if (p && p.catch) p.catch(function () { stageEl.requestFullscreen(); });
        if (screen.orientation && screen.orientation.lock) {
          var lp = screen.orientation.lock("landscape");
          if (lp && lp.catch) lp.catch(function () {});
        }
      } catch (err) { /* fullscreen not available — layout already fills the screen */ }
    });
    document.addEventListener("fullscreenchange", function () {
      fullBtn.textContent = document.fullscreenElement ? "✕ Exit full" : "⛶ Full screen";
    });
  }
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊 Sound: On" : "🔇 Sound: Off";
    if (!soundOn) {
      bgSong.pause();
      try {
        for (var qi = 0; qi < praiseAudios.length; qi++) praiseAudios[qi].pause();
        for (var qj = 0; qj < meowAudios.length; qj++) meowAudios[qj].pause();
        for (var qk = 0; qk < carefulAudios.length; qk++) carefulAudios[qk].pause();
      } catch (e) {}
    }
    else if (state === "playing") { ensureAudio(); bgSong.play().catch(function () {}); }
  });

  /* ================= Boot ================= */
  reset();
  // Remember the last player's name and show the scorecard on the
  // start screen, so the competition is visible before the run.
  try {
    var savedName = window.localStorage.getItem("inbaPlayerName");
    if (savedName) nameInput.value = savedName;
  } catch (e) {}
  renderCard(startCardList, startCard, 5);
  // Then swap in the shared Cloudflare scorecard as soon as it arrives.
  fetchShared().then(function (ok) {
    if (ok && state === "ready") renderCard(startCardList, startCard, 5);
  });
  requestAnimationFrame(loop);
})();
