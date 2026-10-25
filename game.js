(function () {
  "use strict";

  /* ================= Setup ================= */
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;   // 960
  var H = canvas.height;  // 540
  var GROUND = H - 78;    // y of the ground surface

  var kittensChip = document.getElementById("kittensChip");
  var scoreChip = document.getElementById("scoreChip");
  var startOverlay = document.getElementById("startOverlay");
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
  var KITTENS = [
    { name: "Vellai", color: "#ffffff", ear: "#ffb6c9", scale: 1.0 },
    { name: "Mittai", color: "#f5a623", ear: "#ffe0b2", scale: 1.0 },
    { name: "Chinna", color: "#cfd8dc", ear: "#ffcdd2", scale: 0.78 }
  ];

  // Snappier jump: strong gravity + slightly lower launch = high enough to
  // clear a tall fox (~89px), but airborne ~28 frames instead of ~46, so
  // Inba lands well past one fox and can jump again almost right away.
  var GRAVITY = 0.95;
  var JUMP_V = -13.2;
  var DOUBLE_JUMP_V = -11.2;

  var state = "ready"; // ready | playing — no lives, so no game over:
  // the run is endless until the player restarts it themselves.
  var inba, obstacles, freedKittens, floaters, particles;
  var rescued, score, speed, frame, spawnIn, kittenCycle, shake;

  function reset() {
    inba = { x: 130, y: GROUND, vy: 0, grounded: true, runPhase: 0, invincible: 0, jumps: 0, jumpBuffer: 0, capeLift: 0, capeFlare: 0 };
    obstacles = [];
    freedKittens = [];
    floaters = [];
    particles = [];
    rescued = 0;
    score = 0;
    speed = 5;
    frame = 0;
    spawnIn = 380;
    kittenCycle = 0;
    shake = 0;
    updateHUD();
  }

  function updateHUD() {
    kittensChip.textContent = "🐱 Rescued: " + rescued;
    scoreChip.textContent = "⭐ Score: " + Math.floor(score);
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
      obstacles.push({
        type: "fox", kind: tall ? "neela" : "kuttai",
        x: W + 90, w: tall ? 88 : 66, h: tall ? 62 : 46,
        phase: Math.random() * 6.28, ownSpeed: 1.4 + Math.random() * 0.5
      });
    }
    // Wider gaps: after landing from one jump there is always room to
    // run a few steps and jump again before the next obstacle arrives.
    spawnIn = (430 + Math.random() * 290) * (5.4 / speed) + 150;
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
    reset();
    state = "playing";
    startOverlay.hidden = true;
    if (soundOn) { bgSong.currentTime = 0; bgSong.play().catch(function () {}); }
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
    score += 100;
    sfxRescue(); // includes the meow, every time
    freedKittens.push({
      kitten: ob.kitten, x: ob.x + 20, y: GROUND, vy: -9.5, vx: 4.6, phase: 0
    });
    floaters.push({ text: "🎉 " + ob.kitten.name + " saved! +100", x: ob.x, y: GROUND - 130, life: 70 });
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

    // Distance score
    score += speed * dt * 0.055;

    // Obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var ob = obstacles[i];
      ob.x -= speed * dt;
      if (ob.type === "fox") {
        ob.x -= ob.ownSpeed * dt;
        ob.phase += dt * 0.35;
        // Collision (generously shrunk AABB — a near miss is a miss,
        // grazing a fox's tail or ears does not even count as a catch)
        if (!ob.counted && inba.invincible <= 0) {
          var ix = inba.x + 16, iy = inba.y - 80, iw = 26, ih = 80;
          var fx = ob.x + 15, fy = GROUND - ob.h + 15, fw = ob.w - 30, fh = ob.h - 17;
          if (ix < fx + fw && ix + iw > fx && iy < fy + fh && iy + ih > fy) hitFox(ob);
        }
      } else if (ob.type === "cage") {
        if (ob.freed && ob.door < 1) ob.door = Math.min(1, ob.door + dt * 0.08);
        if (!ob.freed && ob.x + ob.w < inba.x + 46) freeKitten(ob);
      }
      if (ob.x < -130) obstacles.splice(i, 1);
    }

    // Freed kittens hop out and run happily to the right
    for (var j = freedKittens.length - 1; j >= 0; j--) {
      var fk = freedKittens[j];
      fk.vy += 0.55 * dt;
      fk.y += fk.vy * dt;
      fk.x += (fk.vx - speed * 0.35) * dt;
      fk.phase += dt * 0.4;
      if (fk.y >= GROUND) { fk.y = GROUND; fk.vy = fk.vy < -2 ? fk.vy * -0.45 : -4.2; }
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

  function drawBackground() {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8fd6ff");
    sky.addColorStop(0.7, "#cdeffb");
    sky.addColorStop(1, "#fdf3c9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun
    ctx.fillStyle = "#ffd93b";
    ctx.beginPath(); ctx.arc(862, 74, 34, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffe97a";
    ctx.beginPath(); ctx.arc(862, 74, 26, 0, 6.29); ctx.fill();

    // Clouds (slow parallax)
    ctx.fillStyle = "#ffffff";
    var ci, cx;
    for (ci = 0; ci < 5; ci++) {
      cx = ((ci * 230 + 60 - frame * 0.35) % (W + 240) + (W + 240)) % (W + 240) - 120;
      var cy = 46 + (ci % 3) * 34;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, 6.29);
      ctx.arc(cx + 24, cy + 4, 17, 0, 6.29);
      ctx.arc(cx - 25, cy + 5, 15, 0, 6.29);
      ctx.fill();
    }

    // Hills (slower scroll)
    ctx.fillStyle = "#b5e48c";
    var hx = -((frame * speed * 0.25) % 480);
    for (var hxi = hx; hxi < W + 480; hxi += 480) {
      ctx.beginPath();
      ctx.arc(hxi + 240, GROUND + 66, 250, Math.PI, 0);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = "#7ec850";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#68b53e";
    ctx.fillRect(0, GROUND, W, 8);
    // Grass tufts scrolling
    ctx.strokeStyle = "#4f9c2f";
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
    // Little flowers
    var foff = (frame * speed) % 170;
    ctx.fillStyle = "#ff8fab";
    for (var fx2 = -foff + 40; fx2 < W + 170; fx2 += 170) {
      ctx.beginPath(); ctx.arc(fx2, GROUND + 34, 4, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath(); ctx.arc(fx2 + 26, GROUND + 52, 4, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ff8fab";
    }
  }

  // Fur shading per kitten: main, shadow, stripe and belly tones.
  var KITTEN_FUR = {
    "Vellai": { shadow: "#d9dee6", stripe: null, belly: "#ffffff" },
    "Mittai": { shadow: "#d9820f", stripe: "#b96a08", belly: "#ffe7bd" },
    "Chinna": { shadow: "#a7b3bc", stripe: "#87969f", belly: "#eef3f6" }
  };

  function drawKitten(x, baseY, k, phase, happy) {
    var s = k.scale;
    var fur = KITTEN_FUR[k.name] || { shadow: k.color, stripe: null, belly: "#ffffff" };
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    var bob = happy ? Math.abs(Math.sin(phase)) * 5 : 0;
    ctx.translate(0, -bob);
    // soft ground shadow
    ctx.fillStyle = "rgba(60,90,40,0.22)";
    ctx.beginPath(); ctx.ellipse(0, 1 + bob, 17, 3.5, 0, 0, 6.29); ctx.fill();
    // tail — curved, tapered, with stripes; tip curls up happily
    ctx.lineCap = "round";
    ctx.strokeStyle = fur.shadow;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(13, -10);
    ctx.quadraticCurveTo(27, -14, 25, -30 - (happy ? 3 : 0));
    ctx.stroke();
    ctx.strokeStyle = k.color;
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(13, -10);
    ctx.quadraticCurveTo(27, -14, 25, -30 - (happy ? 3 : 0));
    ctx.stroke();
    // paws
    ctx.fillStyle = fur.shadow;
    ctx.beginPath(); ctx.ellipse(-8, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
    // body with shaded underside and a cream chest
    var bodyGrad = ctx.createLinearGradient(0, -26, 0, 0);
    bodyGrad.addColorStop(0, k.color);
    bodyGrad.addColorStop(1, fur.shadow);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, -12, 17, 11.5, 0, 0, 6.29); ctx.fill();
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
    ctx.strokeStyle = "#7a7f8a";
    ctx.lineWidth = 5;
    rr(x, top + 14, w, h - 14, 8);
    ctx.stroke();
    // dome
    ctx.beginPath();
    ctx.arc(x + w / 2, top + 16, w / 2, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.arc(x + w / 2, top - 2, 6, 0, 6.29); ctx.fill();
    // bars (back set)
    ctx.strokeStyle = "#9aa0ab";
    ctx.lineWidth = 4;
    for (var bx = x + 12; bx < x + w - 4; bx += 13) {
      ctx.beginPath(); ctx.moveTo(bx, top + 18); ctx.lineTo(bx, GROUND - 3); ctx.stroke();
    }
    // door slides open when freed
    var dOff = ob.door * (w - 18);
    var dAlpha = 1 - ob.door * 0.75;
    ctx.save();
    ctx.globalAlpha = dAlpha;
    ctx.strokeStyle = "#5f646e";
    ctx.lineWidth = 4.5;
    for (var dx = x + 7 - dOff; dx < x + w - 22 - dOff + 26; dx += 13) {
      if (dx > x + 2 && dx < x + w - 3) {
        ctx.beginPath(); ctx.moveTo(dx, top + 18); ctx.lineTo(dx, GROUND - 3); ctx.stroke();
      }
    }
    ctx.restore();
    // base
    ctx.fillStyle = "#8a6d4a";
    rr(x - 4, GROUND - 6, w + 8, 9, 4);
    ctx.fill();
  }

  function drawFox(ob) {
    var s = ob.kind === "neela" ? 1.14 : 0.82;
    var x = ob.x + ob.w / 2, baseY = GROUND;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    var run = Math.sin(ob.phase) * 8;
    var run2 = Math.sin(ob.phase + Math.PI) * 8;
    var tailWag = Math.sin(ob.phase * 0.7) * 3;
    // ground shadow
    ctx.fillStyle = "rgba(60,90,40,0.25)";
    ctx.beginPath(); ctx.ellipse(2, 2, 36, 5, 0, 0, 6.29); ctx.fill();
    // bushy tail (behind, on the right — fox faces left): layered fur
    // with a dark base band and a cream tip
    ctx.fillStyle = "#c96a12";
    ctx.beginPath(); ctx.ellipse(36, -31 + tailWag, 22, 12, -0.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#e8821e";
    ctx.beginPath(); ctx.ellipse(35, -33 + tailWag, 20, 10.5, -0.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath();
    ctx.moveTo(44, -42 + tailWag);
    ctx.quadraticCurveTo(56, -38 + tailWag, 53, -30 + tailWag);
    ctx.quadraticCurveTo(50, -24 + tailWag, 42, -26 + tailWag);
    ctx.quadraticCurveTo(48, -33 + tailWag, 44, -42 + tailWag);
    ctx.fill();
    // far legs (darker, opposite phase) with dark "sock" paws
    ctx.strokeStyle = "#b35c0d";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, -15); ctx.lineTo(-10 + run2, -4);
    ctx.moveTo(16, -15); ctx.lineTo(16 + run, -4);
    ctx.stroke();
    ctx.fillStyle = "#5f3a17";
    ctx.beginPath(); ctx.ellipse(-10 + run2, -2, 5, 3, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16 + run, -2, 5, 3, 0, 0, 6.29); ctx.fill();
    // body — russet gradient, darker saddle on the back, cream belly
    var bodyGrad = ctx.createLinearGradient(0, -48, 0, -8);
    bodyGrad.addColorStop(0, "#d97a16");
    bodyGrad.addColorStop(0.45, "#f08c1e");
    bodyGrad.addColorStop(1, "#f6a83e");
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
    // near legs
    ctx.strokeStyle = "#d97a16";
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-16, -14); ctx.lineTo(-16 + run, -4);
    ctx.moveTo(10, -14); ctx.lineTo(10 + run2, -4);
    ctx.stroke();
    ctx.fillStyle = "#5f3a17";
    ctx.beginPath(); ctx.ellipse(-16 + run, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10 + run2, -2, 5.5, 3, 0, 0, 6.29); ctx.fill();
    // ears first (behind head): tall, pointed, dark-backed, cream inner
    ctx.fillStyle = "#b35c0d";
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
    headGrad.addColorStop(0, "#e07f18");
    headGrad.addColorStop(0.65, "#f08c1e");
    headGrad.addColorStop(1, "#f9bd6d");
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
      ctx.fillStyle = "#2b6cb0";
      ctx.beginPath();
      ctx.moveTo(-23, -33); ctx.lineTo(-5, -29); ctx.lineTo(-8, -21);
      ctx.lineTo(-20, -23); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -27, 3.6, 0, 6.29); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, -25); ctx.lineTo(3, -18); ctx.lineTo(-3, -14); ctx.lineTo(-6, -21);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#bee3f8";
      ctx.beginPath(); ctx.arc(-15, -27.5, 1.4, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(-10, -24.5, 1.2, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }

  function drawInba() {
    var x = inba.x, feet = inba.y;
    // shadow
    var hgt = Math.min(1, (GROUND - feet) / 150);
    ctx.fillStyle = "rgba(60,90,40,0.30)";
    ctx.beginPath();
    ctx.ellipse(x + 24, GROUND + 8, 30 - hgt * 10, 6, 0, 0, 6.29);
    ctx.fill();

    if (inba.invincible > 0 && Math.floor(frame / 4) % 2 === 0 && state === "playing") return;

    ctx.save();
    ctx.translate(x, feet);
    var ph = inba.runPhase;
    var legSwing = inba.grounded ? Math.sin(ph) * 13 : 6;
    var armSwing = inba.grounded ? Math.sin(ph) * 9 : -6;
    var bounce = inba.grounded ? Math.abs(Math.sin(ph)) * 2.4 : 0;
    ctx.translate(0, -bounce);
    ctx.lineCap = "round";

    // Foot positions for this stride (front foot strides, back foot trails)
    var fFootX = 24 + legSwing, fFootY = inba.grounded ? -1 : -9;
    var bFootX = 20 - legSwing, bFootY = inba.grounded ? -3 : -2;
    var fKneeX = 26 + legSwing * 0.45, fKneeY = -19;
    var bKneeX = 18 - legSwing * 0.35, bKneeY = -18;

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
    capeGrad.addColorStop(0, "#ef4444");
    capeGrad.addColorStop(0.55, "#d92b2b");
    capeGrad.addColorStop(1, "#a31616");
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(topPts[0][0], topPts[0][1]);
    for (ci2 = 1; ci2 <= SEG; ci2++) ctx.lineTo(topPts[ci2][0], topPts[ci2][1]);
    for (ci2 = SEG; ci2 >= 0; ci2--) ctx.lineTo(botPts[ci2][0], botPts[ci2][1]);
    ctx.closePath();
    ctx.fill();
    // Fold lines follow the same ripple, so the cloth looks layered.
    ctx.strokeStyle = "rgba(120,10,10,0.45)"; ctx.lineWidth = 1.5;
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
      ctx.strokeStyle = "rgba(255,150,150," + (0.55 * lift).toFixed(2) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      for (ci2 = 1; ci2 <= SEG; ci2++) ctx.lineTo(topPts[ci2][0], topPts[ci2][1]);
      ctx.stroke();
    }

    // back arm (slightly darker skin, swings opposite)
    ctx.strokeStyle = "#8a4b23";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(17, -65); ctx.lineTo(13 - armSwing * 0.8, -49);
    ctx.stroke();
    ctx.fillStyle = "#8a4b23";
    ctx.beginPath(); ctx.arc(13 - armSwing * 0.8, -48, 3.4, 0, 6.29); ctx.fill();

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

    // dress — purple gradient, soft fold lines, gold waist band
    var dressGrad = ctx.createLinearGradient(5, -72, 40, -30);
    dressGrad.addColorStop(0, "#8a5fe0");
    dressGrad.addColorStop(1, "#6840b8");
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(12, -70);
    ctx.lineTo(33, -70);
    ctx.lineTo(41, -31);
    ctx.quadraticCurveTo(22, -26, 4, -31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(60,30,110,0.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -58); ctx.quadraticCurveTo(19, -44, 15, -32);
    ctx.moveTo(29, -58); ctx.quadraticCurveTo(30, -44, 32, -32);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(5, -38, 35, 5);
    ctx.fillStyle = "#e8a90c";
    ctx.fillRect(5, -34.5, 35, 1.6);

    // front arm (sleeve puff, forearm, hand)
    ctx.fillStyle = "#7b4fd0";
    ctx.beginPath(); ctx.arc(30, -65, 5.5, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#b06a34";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, -64); ctx.lineTo(35 + armSwing, -49);
    ctx.stroke();
    ctx.fillStyle = "#b06a34";
    ctx.beginPath(); ctx.arc(35 + armSwing, -48, 3.6, 0, 6.29); ctx.fill();

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
      drawKitten(fk.x, fk.y, fk.kitten, fk.phase, true);
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
      ctx.fillStyle = "#14467f";
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
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (state === "playing") jump();
      else startGame();
    }
  });
  document.getElementById("stage").addEventListener("pointerdown", function (e) {
    if (state === "playing") { e.preventDefault(); jump(); }
  });
  document.getElementById("playBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);
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
  requestAnimationFrame(loop);
})();
