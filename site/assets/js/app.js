/* ==========================================================================
   A quiet celebration — interactions
   Progressive enhancement: content is readable without this file.
   ========================================================================== */
(function () {
  "use strict";

  var qs = function (sel, root) { return (root || document).querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var loader = qs(".loader");
  var header = qs("[data-header]");
  var introPlayed = false;
  var lenis = null;

  // Last-resort failsafe: never leave the page hidden if a script breaks.
  window.addEventListener("error", function () {
    root.classList.remove("js", "is-loading");
    if (loader) loader.classList.add("is-done");
  });

  if (reduce) root.classList.add("no-motion");

  /* ------------------------------------------------------------------ *
   * Content — query params override content.js
   * ------------------------------------------------------------------ */
  var cfg = window.BIRTHDAY || {};
  var params = new URLSearchParams(window.location.search);
  var clean = function (value, max) {
    return String(value || "")
      .replace(/[<>{}\\]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max || 60);
  };

  var name = clean(params.get("to")) || clean(cfg.to) || "Kamu";
  var from = clean(params.get("from")) || clean(cfg.from) || "";
  var city = clean(cfg.city) || "Jakarta";
  var dateParam = (params.get("date") || cfg.date || "").trim();
  var eventDate = new Date();
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);

  if (match) {
    eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  var longFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
  var longDate = longFmt.format(eventDate);
  var shortDate = [
    String(eventDate.getDate()).padStart(2, "0"),
    String(eventDate.getMonth() + 1).padStart(2, "0"),
    eventDate.getFullYear()
  ].join(" · ");

  qsa("[data-name]").forEach(function (el) { el.textContent = name; });
  qsa("[data-from-line]").forEach(function (el) { el.textContent = from ? "— " + from : "— untukmu, selalu"; });
  qsa("[data-city]").forEach(function (el) { el.textContent = city; });
  qsa("[data-date-long]").forEach(function (el) { el.textContent = longDate; });
  qsa("[data-date-short]").forEach(function (el) { el.textContent = shortDate; });
  qsa("[data-year]").forEach(function (el) { el.textContent = String(eventDate.getFullYear()); });

  var waxLetter = (name.charAt(0) || "A").toUpperCase();
  var waxText = qs(".wax text");
  if (waxText) waxText.textContent = waxLetter;

  document.title = "Selamat ulang tahun, " + name + " — sebuah perayaan kecil";
  [["og:title", "Selamat ulang tahun, " + name + " — sebuah perayaan kecil"]].forEach(function (pair) {
    var meta = qs('meta[property="' + pair[0] + '"]');
    if (meta) meta.setAttribute("content", pair[1]);
  });

  /* ------------------------------------------------------------------ *
   * Letter typography — split words for the reveal
   * ------------------------------------------------------------------ */
  qsa(".letter__body p").forEach(function (paragraph) {
    var text = paragraph.textContent.trim();
    paragraph.textContent = "";
    text.split(/(\s+)/).forEach(function (chunk) {
      if (!chunk.trim()) { paragraph.appendChild(document.createTextNode(" ")); return; }
      var word = document.createElement("span");
      word.className = "word";
      word.textContent = chunk;
      paragraph.appendChild(word);
    });
  });

  /* ------------------------------------------------------------------ *
   * Clock (recipient's timezone)
   * ------------------------------------------------------------------ */
  var clockEl = qs("[data-clock]");
  var clockFmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: cfg.timeZone || "Asia/Jakarta",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });

  function tickClock() {
    if (!clockEl) return;
    clockEl.textContent = clockFmt.format(new Date()).replace(/\./g, ":");
  }
  tickClock();
  window.setInterval(tickClock, 1000);

  /* ------------------------------------------------------------------ *
   * Loader
   * ------------------------------------------------------------------ */
  var loaderStart = performance.now();
  var loaderDone = false;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    root.classList.remove("is-loading");
    if (loader) {
      loader.classList.add("is-done");
      window.setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 1600);
    }
    intro();
  }

  if (loader) {
    loader.classList.add("is-visible");
  }

  var minimumWait = reduce ? 120 : 780;
  var fontReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 2600); });

  Promise.race([fontReady, timeout]).then(function () {
    var elapsed = performance.now() - loaderStart;
    window.setTimeout(finishLoader, Math.max(0, minimumWait - elapsed));
  });

  window.setTimeout(finishLoader, 5000); // hard failsafe

  /* ------------------------------------------------------------------ *
   * Intro + scroll motion
   * ------------------------------------------------------------------ */
  function revealEverything() {
    qsa(".line__in").forEach(function (el) { el.style.transform = "none"; });
    qsa(".reveal").forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; });
    var sheet = qs(".letter__sheet");
    if (sheet) sheet.style.opacity = "1";
    var wax = qs(".wax");
    if (wax) { wax.style.opacity = "1"; wax.style.transform = "rotate(-9deg)"; }
  }

  function intro() {
    if (introPlayed) return;
    introPlayed = true;

    if (!hasGSAP || reduce) {
      revealEverything();
      return;
    }

    var gsap = window.gsap;
    var tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    gsap.set(".hero__title .line__in", { yPercent: 112 });
    gsap.set(".hero__meta, .masthead, .hero__aside, .hero__foot, .hero__seal, .hero__edge", { opacity: 0 });
    gsap.set(".hero__aside, .hero__foot", { y: 14 });
    gsap.set(".hero__seal", { scale: 0.86 });

    tl.to(".hero__meta, .masthead", { opacity: 1, duration: 0.9, stagger: 0.08 }, 0)
      .to(".hero__title .line__in", { yPercent: 0, duration: 1.3, stagger: 0.12 }, 0.1)
      .to(".hero__seal", { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out" }, 0.65)
      .to(".hero__aside, .hero__foot", { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.75)
      .to(".hero__edge", { opacity: 1, duration: 1 }, 0.9);
  }

  if (!hasGSAP) {
    root.classList.remove("js");
    finishLoader();
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  gsap.set(".line__in", { y: 0, yPercent: 112 });

  /* Smooth scroll */
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({
      duration: 1.05,
      smoothWheel: true,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Anchor navigation */
  qsa('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = qs(id);
      if (!target) return;
      event.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -10, duration: 1.3 });
      } else {
        var top = target.getBoundingClientRect().top + window.pageYOffset - 10;
        window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      }
    });
  });

  /* Progress hairline */
  gsap.to(".progress i", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.25 }
  });

  /* Hero parallax */
  if (!reduce) {
    gsap.to(".hero__title", {
      yPercent: -7,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero__seal", {
      yPercent: 26,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero__aside", {
      yPercent: -12,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
  }

  /* Masthead inverts over the dark chapter */
  if (header) {
    ScrollTrigger.create({
      trigger: ".candle-sec",
      start: "top 64px",
      end: "bottom 64px",
      onToggle: function (self) { header.classList.toggle("is-light", self.isActive); }
    });
  }

  /* Letter reveal */
  var wax = qs(".wax");
  if (wax) {
    gsap.to(wax, {
      opacity: 1,
      rotate: -9,
      scale: 1,
      duration: 1,
      ease: "back.out(1.7)",
      scrollTrigger: { trigger: ".letter__wrap", start: "top 82%" }
    });
  }

  var sheet = qs(".letter__sheet");
  if (sheet) {
    gsap.fromTo(sheet, { y: 42, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: { trigger: ".letter__wrap", start: "top 84%" }
    });
  }

  var words = qsa(".letter__body .word");
  if (words.length) {
    gsap.set(words, { y: 12, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.008,
      scrollTrigger: { trigger: ".letter__body", start: "top 78%" }
    });
  }

  /* Truths — horizontal pin on desktop */
  var truthBar = qs("[data-truth-bar]");
  var truthIndex = qs("[data-truth-index]");
  var truthText = qsa(".truth");

  if (truthText.length) {
    var truthChildren = [];
    truthText.forEach(function (el) {
      truthChildren = truthChildren.concat(qsa(".truth__no, .truth__text, .truth__label", el));
    });
    gsap.from(truthChildren, {
      y: 22,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.05,
      scrollTrigger: { trigger: ".truths", start: "top 70%" }
    });
  }

  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", function () {
    var track = qs("[data-truths]");
    if (!track) return;

    var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var lastIndex = 0;

    var tween = gsap.to(track, {
      x: function () { return -distance(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".truths__pin",
        start: "top top",
        end: function () { return "+=" + distance(); },
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (truthBar) truthBar.style.transform = "scaleX(" + self.progress + ")";
          var current = Math.min(5, Math.max(1, Math.round(self.progress * 4) + 1));
          if (truthIndex && current !== lastIndex) {
            lastIndex = current;
            truthIndex.textContent = "0" + current;
          }
        }
      }
    });

    return function () {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
    };
  });

  /* Closing reveal */
  gsap.to(".closing__title .line__in", {
    yPercent: 0,
    duration: 1.2,
    ease: "power4.out",
    stagger: 0.1,
    scrollTrigger: { trigger: ".closing__body", start: "top 76%" }
  });
  gsap.from(".closing__to, .closing__note", {
    opacity: 0,
    y: 16,
    duration: 0.9,
    stagger: 0.08,
    ease: "power2.out",
    scrollTrigger: { trigger: ".closing__body", start: "top 72%" }
  });

  /* ------------------------------------------------------------------ *
   * Candle
   * ------------------------------------------------------------------ */
  var candleSection = qs("[data-candle]");
  var candleButton = qs(".candle");
  var holdBar = qs("[data-hold-bar]");
  var relightButton = qs("[data-relight]");
  var emberField = qs(".candle__embers");

  if (candleSection && candleButton) {
    var HOLD_MS = 900;
    var holding = false;
    var startedAt = 0;
    var frame = 0;
    var isOut = false;

    function setBar(value) {
      if (holdBar) holdBar.style.transform = "scaleX(" + value + ")";
    }

    function spawnEmbers() {
      if (!emberField || reduce) return;
      var count = 20;
      for (var i = 0; i < count; i += 1) {
        var ember = document.createElement("i");
        var angle = Math.random() * Math.PI * 2;
        var distance = 26 + Math.random() * 72;
        ember.style.setProperty("--dx", (Math.cos(angle) * distance).toFixed(1) + "px");
        ember.style.setProperty("--dy", (-60 - Math.random() * 90).toFixed(1) + "px");
        ember.style.left = (Math.random() * 16 - 8).toFixed(1) + "px";
        ember.style.animationDelay = (Math.random() * 0.35).toFixed(2) + "s";
        emberField.appendChild(ember);
        window.setTimeout(function (node) {
          return function () { if (node.parentNode) node.parentNode.removeChild(node); };
        }(ember), 2600);
      }
    }

    function blowOut() {
      if (isOut) return;
      isOut = true;
      holding = false;
      window.cancelAnimationFrame(frame);
      candleSection.dataset.state = "out";
      candleButton.setAttribute("aria-disabled", "true");
      setBar(1);
      spawnEmbers();
    }

    function relight() {
      isOut = false;
      candleSection.dataset.state = "lit";
      candleButton.removeAttribute("aria-disabled");
      setBar(0);
      holdBar && (holdBar.style.transition = "transform .4s ease");
      window.setTimeout(function () { if (holdBar) holdBar.style.transition = ""; }, 450);
    }

    function tick(now) {
      if (!holding) return;
      var progress = Math.min(1, (now - startedAt) / HOLD_MS);
      setBar(progress);
      if (progress >= 1) { blowOut(); return; }
      frame = window.requestAnimationFrame(tick);
    }

    function startHold(event) {
      if (isOut || holding) return;
      if (event && event.type === "keydown") {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
      }
      holding = true;
      startedAt = performance.now();
      if (holdBar) holdBar.style.transition = "none";
      if (reduce) { blowOut(); return; }
      frame = window.requestAnimationFrame(tick);
    }

    function endHold() {
      if (!holding) return;
      holding = false;
      window.cancelAnimationFrame(frame);
      setBar(0);
    }

    candleButton.addEventListener("pointerdown", function (event) {
      if (event.button && event.button !== 0) return;
      event.preventDefault();
      startHold();
    });
    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);
    candleButton.addEventListener("keydown", startHold);
    candleButton.addEventListener("keyup", endHold);
    candleButton.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    candleButton.addEventListener("blur", endHold);

    if (relightButton) relightButton.addEventListener("click", relight);
  }

  /* ------------------------------------------------------------------ *
   * Cursor
   * ------------------------------------------------------------------ */
  var cursor = qs(".cursor");
  if (cursor && finePointer && !reduce) {
    var dot = qs(".cursor__dot", cursor);
    var ring = qs(".cursor__ring", cursor);
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    var dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    var dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    var ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
    var ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    var cursorShown = false;

    window.addEventListener("mousemove", function (event) {
      dotX(event.clientX); dotY(event.clientY);
      ringX(event.clientX); ringY(event.clientY);
      if (!cursorShown) {
        cursorShown = true;
        gsap.to(cursor, { opacity: 1, duration: 0.4 });
      }
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      cursorShown = false;
      gsap.to(cursor, { opacity: 0, duration: 0.3 });
    });

    qsa("a, button, [data-cursor]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("is-hover"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("is-hover"); });
    });

    root.classList.add("cursor-ready");
  } else if (cursor) {
    cursor.style.display = "none";
  }

  /* ------------------------------------------------------------------ *
   * Masthead behaviour
   * ------------------------------------------------------------------ */
  var lastScroll = window.pageYOffset || 0;

  function onScrollPosition(y) {
    if (!header) return;
    var delta = y - lastScroll;
    if (y > 120 && delta > 2) {
      header.classList.add("is-hidden");
    } else if (delta < -2 || y < 80) {
      header.classList.remove("is-hidden");
    }
    lastScroll = y;
  }

  if (lenis) {
    lenis.on("scroll", function (event) { onScrollPosition(event.scroll); });
  } else {
    window.addEventListener("scroll", function () { onScrollPosition(window.pageYOffset); }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Housekeeping
   * ------------------------------------------------------------------ */
  var refreshTimer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () { ScrollTrigger.refresh(); }, 220);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
