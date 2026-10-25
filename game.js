(function () {
  "use strict";

  /* ================= Setup ================= */
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;   // 960
  var H = canvas.height;  // 540
  var GROUND = H - 78;    // y of the ground surface

  var heartsChip = document.getElementById("heartsChip");
  var kittensChip = document.getElementById("kittensChip");
  var scoreChip = document.getElementById("scoreChip");
  var startOverlay = document.getElementById("startOverlay");
  var overOverlay = document.getElementById("overOverlay");
  var overTitle = document.getElementById("overTitle");
  var overStats = document.getElementById("overStats");
  var soundBtn = document.getElementById("soundBtn");
  var bgSong = document.getElementById("bgSong");
  bgSong.volume = 0.22;

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
  function sfxJump() { tone(280, 720, 0.16, "triangle", 0.16); }
  function sfxRescue() {
    tone(523, 523, 0.11, "sine", 0.16);
    tone(659, 659, 0.11, "sine", 0.16, 0.09);
    tone(784, 784, 0.12, "sine", 0.16, 0.18);
    tone(1047, 1047, 0.2, "sine", 0.17, 0.27);
  }
  function sfxHit() { tone(190, 55, 0.28, "sawtooth", 0.14); }
  function sfxOver() {
    tone(659, 659, 0.16, "triangle", 0.15);
    tone(523, 523, 0.16, "triangle", 0.15, 0.15);
    tone(392, 392, 0.16, "triangle", 0.15, 0.3);
    tone(330, 330, 0.3, "triangle", 0.15, 0.45);
  }

  /* ================= Game state ================= */
  var KITTENS = [
    { name: "Vellai", color: "#ffffff", ear: "#ffb6c9", scale: 1.0 },
    { name: "Mittai", color: "#f5a623", ear: "#ffe0b2", scale: 1.0 },
    { name: "Chinna", color: "#cfd8dc", ear: "#ffcdd2", scale: 0.78 }
  ];

  var state = "ready"; // ready | playing | over
  var inba, obstacles, freedKittens, floaters, particles;
  var hearts, rescued, score, speed, frame, spawnIn, kittenCycle, shake;
  var best = 0;
  try { best = parseInt(localStorage.getItem("inbaGameBest") || "0", 10) || 0; } catch (e) { best = 0; }

  function reset() {
    inba = { x: 130, y: GROUND, vy: 0, grounded: true, runPhase: 0, invincible: 0 };
    obstacles = [];
    freedKittens = [];
    floaters = [];
    particles = [];
    hearts = 3;
    rescued = 0;
    score = 0;
    speed = 5;
    frame = 0;
    spawnIn = 320;
    kittenCycle = 0;
    shake = 0;
    updateHUD();
  }

  function updateHUD() {
    var h = "";
    for (var i = 0; i < 3; i++) h += i < hearts ? "❤️" : "🤍";
    heartsChip.textContent = h;
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
    // Gap shrinks slightly as speed grows, but always leaves jump room.
    spawnIn = (330 + Math.random() * 260) * (5.4 / speed) + 120;
  }

  /* ================= Actions ================= */
  function jump() {
    if (state !== "playing") return;
    if (inba.grounded) {
      inba.vy = -14.2;
      inba.grounded = false;
      sfxJump();
    }
  }

  function startGame() {
    ensureAudio();
    reset();
    state = "playing";
    startOverlay.hidden = true;
    overOverlay.hidden = true;
    if (soundOn) { bgSong.currentTime = 0; bgSong.play().catch(function () {}); }
  }

  function gameOver() {
    state = "over";
    sfxOver();
    var final = Math.floor(score);
    if (final > best) {
      best = final;
      try { localStorage.setItem("inbaGameBest", String(best)); } catch (e) {}
    }
    overTitle.textContent = rescued >= 6 ? "🌟 Super Girl Inba wins!" : "Great running, Inba!";
    overStats.textContent =
      "⭐ Score: " + final + " · 🐱 Kittens rescued: " + rescued + " · 🏆 Best: " + best;
    overOverlay.hidden = false;
  }

  function hitFox(ob) {
    ob.counted = true; // one hit per fox
    hearts--;
    inba.invincible = 95;
    shake = 9;
    sfxHit();
    updateHUD();
    burst(inba.x + 30, inba.y - 50, "#ff8fab", 10);
    if (hearts <= 0) gameOver();
  }

  function freeKitten(ob) {
    ob.freed = true;
    rescued++;
    score += 100;
    sfxRescue();
    freedKittens.push({
      kitten: ob.kitten, x: ob.x + 20, y: GROUND, vy: -9.5, vx: 4.6, phase: 0
    });
    floaters.push({ text: "🎉 " + ob.kitten.name + " saved! +100", x: ob.x, y: GROUND - 130, life: 70 });
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
    speed = Math.min(9.6, 5 + frame * 0.0016);

    // Inba physics
    inba.vy += 0.62 * dt;
    inba.y += inba.vy * dt;
    if (inba.y >= GROUND) { inba.y = GROUND; inba.vy = 0; inba.grounded = true; }
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
        // Collision (shrunk AABB for fairness)
        if (!ob.counted && inba.invincible <= 0) {
          var ix = inba.x + 12, iy = inba.y - 84, iw = 34, ih = 84;
          var fx = ob.x + 8, fy = GROUND - ob.h + 8, fw = ob.w - 14, fh = ob.h - 10;
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

  function drawKitten(x, baseY, k, phase, happy) {
    var s = k.scale;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    var bob = happy ? Math.abs(Math.sin(phase)) * 5 : 0;
    ctx.translate(0, -bob);
    // tail
    ctx.strokeStyle = k.color === "#ffffff" ? "#e8e8e8" : k.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, -12);
    ctx.quadraticCurveTo(26, -20, 22, -32);
    ctx.stroke();
    // body
    ctx.fillStyle = k.color;
    ctx.beginPath(); ctx.ellipse(0, -12, 16, 11, 0, 0, 6.29); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(-10, -26, 11, 0, 6.29); ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(-19, -33); ctx.lineTo(-16, -43); ctx.lineTo(-10, -36); ctx.closePath();
    ctx.moveTo(-9, -36); ctx.lineTo(-3, -43); ctx.lineTo(-1, -33); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = k.ear;
    ctx.beginPath();
    ctx.moveTo(-16.5, -34.5); ctx.lineTo(-15, -39.5); ctx.lineTo(-12, -35.5); ctx.closePath();
    ctx.moveTo(-7.5, -35.5); ctx.lineTo(-4.5, -39.5); ctx.lineTo(-3.5, -34.5); ctx.closePath();
    ctx.fill();
    // face
    ctx.fillStyle = "#333";
    if (happy) {
      ctx.lineWidth = 1.8; ctx.strokeStyle = "#333";
      ctx.beginPath(); ctx.arc(-14, -27, 2.6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6, -27, 2.6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.beginPath(); ctx.arc(-10, -21.5, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-14, -27, 1.7, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -27, 1.7, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ff8fab";
      ctx.beginPath(); ctx.arc(-10, -23.5, 1.8, 0, 6.29); ctx.fill();
    }
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
    // tail (behind, on the right — fox faces left)
    ctx.fillStyle = "#e8821e";
    ctx.beginPath();
    ctx.ellipse(34, -30 + Math.sin(ob.phase * 0.7) * 3, 20, 10, -0.5, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath();
    ctx.ellipse(48, -36 + Math.sin(ob.phase * 0.7) * 3, 8, 6, -0.5, 0, 6.29);
    ctx.fill();
    // legs
    ctx.strokeStyle = "#c96a12";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, -14); ctx.lineTo(-14 + run, 0);
    ctx.moveTo(14, -14); ctx.lineTo(14 - run, 0);
    ctx.stroke();
    // body
    ctx.fillStyle = "#f08c1e";
    ctx.beginPath(); ctx.ellipse(2, -28, 30, 17, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#ffe9c9";
    ctx.beginPath(); ctx.ellipse(-4, -22, 18, 9, 0, 0, 6.29); ctx.fill();
    // head (left)
    ctx.fillStyle = "#f08c1e";
    ctx.beginPath(); ctx.arc(-28, -42, 15, 0, 6.29); ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(-38, -52); ctx.lineTo(-35, -66); ctx.lineTo(-28, -54); ctx.closePath();
    ctx.moveTo(-24, -54); ctx.lineTo(-17, -65); ctx.lineTo(-13, -51); ctx.closePath();
    ctx.fill();
    // snout
    ctx.fillStyle = "#ffe9c9";
    ctx.beginPath();
    ctx.moveTo(-40, -46); ctx.lineTo(-52, -38); ctx.lineTo(-39, -34); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.arc(-51, -38.5, 2.8, 0, 6.29); ctx.fill();
    // eye (mischievous)
    ctx.beginPath(); ctx.arc(-31, -44, 2.4, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-36, -50); ctx.lineTo(-27, -48.5); ctx.stroke();
    // Neela Nari's blue bandana
    if (ob.kind === "neela") {
      ctx.fillStyle = "#2b6cb0";
      ctx.beginPath();
      ctx.moveTo(-22, -34); ctx.lineTo(-6, -30); ctx.lineTo(-16, -20); ctx.closePath();
      ctx.fill();
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

    // cape (red, flowing behind to the left)
    var wave = Math.sin(frame * 0.18) * 5;
    ctx.fillStyle = "#d92b2b";
    ctx.beginPath();
    ctx.moveTo(20, -72);
    ctx.quadraticCurveTo(-16, -64 + wave, -26, -40 + wave);
    ctx.quadraticCurveTo(-8, -38, 16, -44);
    ctx.closePath();
    ctx.fill();

    // legs
    ctx.strokeStyle = "#8a4b23";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(22, -34); ctx.lineTo(22 + legSwing, 0 - (inba.grounded ? 0 : 8));
    ctx.moveTo(22, -34); ctx.lineTo(22 - legSwing, 0 - (inba.grounded ? 2 : 2));
    ctx.stroke();
    // shoes
    ctx.fillStyle = "#c1272d";
    ctx.beginPath(); ctx.arc(24 + legSwing, -1 - (inba.grounded ? 0 : 8), 5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(20 - legSwing, -1 - (inba.grounded ? 2 : 2), 5, 0, 6.29); ctx.fill();

    // dress
    ctx.fillStyle = "#7b4fd0";
    ctx.beginPath();
    ctx.moveTo(12, -70);
    ctx.lineTo(33, -70);
    ctx.lineTo(40, -32);
    ctx.lineTo(5, -32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(5, -38, 35, 5);

    // arm (front, swinging)
    ctx.strokeStyle = "#8a4b23";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, -66); ctx.lineTo(34 + armSwing, -48);
    ctx.stroke();

    // head
    ctx.fillStyle = "#a05c2c";
    ctx.beginPath(); ctx.arc(23, -84, 13.5, 0, 6.29); ctx.fill();
    // hair + ponytail
    ctx.fillStyle = "#1d1d22";
    ctx.beginPath(); ctx.arc(21, -88, 13.5, Math.PI * 0.95, Math.PI * 1.95); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, -80 + Math.sin(frame * 0.18) * 2, 5.5, 11, 0.35, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.arc(13, -90, 3.4, 0, 6.29); ctx.fill();
    // face
    ctx.fillStyle = "#1d1d22";
    ctx.beginPath(); ctx.arc(28, -84, 1.9, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#1d1d22"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(27, -78.5, 4, 0.2 * Math.PI, 0.75 * Math.PI); ctx.stroke();
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
  document.getElementById("againBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊 Sound: On" : "🔇 Sound: Off";
    if (!soundOn) bgSong.pause();
    else if (state === "playing") { ensureAudio(); bgSong.play().catch(function () {}); }
  });

  /* ================= Boot ================= */
  reset();
  requestAnimationFrame(loop);
})();
