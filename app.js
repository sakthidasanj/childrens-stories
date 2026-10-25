(function () {
  "use strict";

  var homeView = document.getElementById("homeView");
  var storyView = document.getElementById("storyView");
  var grid = document.getElementById("storyGrid");
  var storyImg = document.getElementById("storyImg");
  var storyTitle = document.getElementById("storyTitle");
  var storyMeta = document.getElementById("storyMeta");
  var storyBody = document.getElementById("storyBody");
  var storyMoral = document.getElementById("storyMoral");
  var moralBox = document.querySelector(".moral-box");
  var storyMedia = document.getElementById("storyMedia");
  var readBtn = document.getElementById("readBtn");
  var stopBtn = document.getElementById("stopBtn");
  var gameLink = document.getElementById("gameLink");
  var currentStory = null;

  /* ---------- Build the story cards ---------- */
  window.STORIES.forEach(function (story) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "story-card";
    card.setAttribute("aria-label", "Read " + story.title);

    var wrap = document.createElement("div");
    wrap.className = "card-img-wrap";
    var img = document.createElement("img");
    img.className = "card-img";
    img.src = story.image;
    img.alt = "Picture for " + story.title;
    img.loading = "lazy";
    wrap.appendChild(img);

    var body = document.createElement("div");
    body.className = "card-body";

    var title = document.createElement("div");
    title.className = "card-title";
    title.textContent = story.title;

    var tag = document.createElement("div");
    tag.className = "card-tag";
    tag.textContent = story.tagline;

    var meta = document.createElement("div");
    meta.className = "card-meta";
    var age = document.createElement("span");
    age.className = "chip age";
    age.textContent = story.age;
    var time = document.createElement("span");
    time.className = "chip time";
    time.textContent = "⏱ " + story.minutes;
    meta.appendChild(age);
    meta.appendChild(time);

    var go = document.createElement("div");
    go.className = "card-go";
    go.textContent = "Read me →";

    body.appendChild(title);
    body.appendChild(tag);
    body.appendChild(meta);
    body.appendChild(go);

    card.appendChild(wrap);
    card.appendChild(body);
    card.addEventListener("click", function () { openStory(story); });
    grid.appendChild(card);
  });

  /* ---------- Open a story ---------- */
  function openStory(story) {
    stopReading();
    currentStory = story;
    storyImg.src = story.image;
    storyImg.alt = "Picture for " + story.title;
    storyTitle.textContent = story.title;
    storyMeta.textContent = story.age + " · " + story.minutes;
    storyMoral.textContent = story.moral;
    moralBox.classList.remove("visible");

    storyBody.innerHTML = "";
    var paras = story.scenes.map(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      storyBody.appendChild(p);
      return p;
    });

    renderMedia(story);
    if (gameLink) gameLink.hidden = story.id !== "inba-poonai-kutties";

    homeView.hidden = true;
    storyView.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });

    // Reveal paragraphs one by one as they scroll into view (with a
    // fallback stagger so the first screenful animates right away).
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    paras.forEach(function (p) { observer.observe(p); });

    var moralObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          moralBox.classList.add("visible");
          moralObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    moralObserver.observe(moralBox);
  }

  /* ---------- Videos and song (only on stories that have them) ---------- */
  function stopMedia() {
    storyMedia.querySelectorAll("video, audio").forEach(function (el) {
      el.pause();
    });
  }

  function renderMedia(story) {
    storyMedia.innerHTML = "";

    if (story.videos && story.videos.length) {
      var heading = document.createElement("h3");
      heading.className = "media-heading";
      heading.textContent = "🎬 Watch the story!";
      storyMedia.appendChild(heading);

      story.videos.forEach(function (v) {
        var card = document.createElement("div");
        card.className = "video-card";
        var label = document.createElement("div");
        label.className = "video-label";
        label.textContent = v.label;
        var video = document.createElement("video");
        video.src = v.src;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        card.appendChild(label);
        card.appendChild(video);
        storyMedia.appendChild(card);
      });
    }

    if (story.song) {
      var box = document.createElement("div");
      box.className = "song-box";

      var songTitle = document.createElement("div");
      songTitle.className = "video-label";
      songTitle.textContent = "🎵 Sing along — " + story.song.title;

      var audio = document.createElement("audio");
      audio.src = story.song.src;
      audio.controls = true;
      audio.preload = "metadata";

      box.appendChild(songTitle);
      box.appendChild(audio);

      if (story.song.lyrics && story.song.lyrics.length) {
        var lyrics = document.createElement("div");
        lyrics.className = "song-lyrics";
        story.song.lyrics.forEach(function (line) {
          var lp = document.createElement("p");
          lp.textContent = line;
          lyrics.appendChild(lp);
        });
        box.appendChild(lyrics);
      }
      storyMedia.appendChild(box);
    }
  }

  /* ---------- Back to the list ---------- */
  function goHome() {
    stopReading();
    stopMedia();
    storyView.hidden = true;
    homeView.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  document.getElementById("backBtn").addEventListener("click", goHome);
  document.getElementById("backBtn2").addEventListener("click", goHome);

  /* ---------- Read aloud ---------- */
  function stopReading() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    readBtn.hidden = false;
    stopBtn.hidden = true;
    storyBody.querySelectorAll("p.speaking").forEach(function (p) {
      p.classList.remove("speaking");
    });
  }

  readBtn.addEventListener("click", function () {
    if (!currentStory || !("speechSynthesis" in window)) return;
    stopReading();
    readBtn.hidden = true;
    stopBtn.hidden = false;

    var paras = Array.prototype.slice.call(storyBody.querySelectorAll("p"));
    var queue = [currentStory.title].concat(currentStory.scenes, ["The moral of the story: " + currentStory.moral]);

    queue.forEach(function (text, i) {
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.1;
      utter.onstart = function () {
        paras.forEach(function (p) { p.classList.remove("speaking"); });
        if (i > 0 && i <= paras.length) {
          paras[i - 1].classList.add("visible");
          paras[i - 1].classList.add("speaking");
          paras[i - 1].scrollIntoView({ block: "center", behavior: "smooth" });
        }
      };
      if (i === queue.length - 1) utter.onend = stopReading;
      window.speechSynthesis.speak(utter);
    });
  });
  stopBtn.addEventListener("click", stopReading);
})();
