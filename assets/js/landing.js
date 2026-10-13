(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const { highlight, withLines, escape } = window.tomikoHL;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const animated = Boolean(gsap && ScrollTrigger) && !reduced;

  if (!animated) root.classList.add("no-anim");
  if (!gsap) root.classList.add("no-gsap");

  /* ───────────── text splitting ───────────── */
  // Wraps every word (and optionally every character) of an element's text nodes in spans,
  // keeping inline elements such as <em> and <code> where they are.
  const split = (el, { chars = false, mask = false } = {}) => {
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.ELEMENT_NODE) { walk(child); continue; }
        if (child.nodeType !== Node.TEXT_NODE) continue;
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(" "); continue; }
          const word = document.createElement("span");
          word.className = "w";
          if (chars) {
            for (const ch of part) {
              const c = document.createElement("span");
              c.className = "c";
              c.textContent = ch;
              word.append(c);
            }
          } else {
            word.textContent = part;
          }
          if (mask) {
            const m = document.createElement("span");
            m.className = "w-mask";
            m.append(word);
            frag.append(m);
          } else {
            frag.append(word);
          }
        }
        child.replaceWith(frag);
      }
    };
    walk(el);
    return el;
  };

  $$("[data-chars]").forEach((el) => split(el, { chars: true, mask: true }));
  $$("[data-words]").forEach((el) => split(el, { mask: true }));
  $$("[data-scrub-words]").forEach((el) => split(el));

  /* ───────────── copy buttons + toast ───────────── */
  const toast = $(".toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  };
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = Object.assign(document.createElement("textarea"), { value: text });
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.append(ta);
        ta.select();
        try { document.execCommand("copy"); } catch { /* nothing else to try */ }
        ta.remove();
      }
      btn.classList.add("copied");
      showToast(`Copied: ${text}`);
      setTimeout(() => btn.classList.remove("copied"), 1600);
    });
  });

  /* ───────────── cassette: REC ⇄ PLAY ───────────── */
  const deck = $("[data-deck]");
  if (deck) {
    const label = $(".deck__label", deck);
    const meta = $(".deck__meta", deck);
    const counter = $(".counter", deck);
    let mode = "rec";
    let count = 0;
    const setMode = (m) => {
      mode = m;
      deck.dataset.mode = m;
      label.textContent = label.dataset[m];
      meta.textContent = meta.dataset[m];
    };
    if (!reduced) {
      setInterval(() => setMode(mode === "rec" ? "play" : "rec"), 4200);
      setInterval(() => {
        count = (count + (mode === "play" ? 9 : 1)) % 1000;
        counter.textContent = String(count).padStart(3, "0");
      }, 90);
    }
    if (finePointer && !reduced) {
      const cassette = $(".cassette", deck);
      addEventListener("pointermove", (e) => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        cassette.style.setProperty("--ry", `${(-18 + x * 22).toFixed(2)}deg`);
        cassette.style.setProperty("--rx", `${(10 - y * 16).toFixed(2)}deg`);
      }, { passive: true });
    }
  }

  /* ───────────── custom cursor ───────────── */
  const cursor = $(".cursor");
  if (finePointer && cursor && !reduced) {
    const label = $(".cursor__label", cursor);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => cursor.classList.remove("is-hidden"));
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("pointerover", (e) => {
      const target = e.target.closest("[data-cursor], a, button");
      cursor.classList.toggle("is-label", Boolean(target?.dataset.cursor));
      cursor.classList.toggle("is-link", Boolean(target) && !target?.dataset.cursor);
      label.textContent = target?.dataset.cursor ?? "";
    });
  }

  /* ───────────── nav + progress ───────────── */
  const nav = $(".nav");
  const bar = $(".progress span");
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle("scrolled", y > 30);
    nav.classList.toggle("hidden", y > 600 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("hidden");
    lastY = y;
    const max = root.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  };

  /* ───────────── editor tabs ───────────── */
  const EXAMPLES = {
    quick: `import { expect, test } from "vitest";
import { useCassette } from "tomiko/vitest";
import { agent } from "./agent";

test("books a table", async () => {
  await useCassette(async (c) => {
    const answer = await agent.run("Table for two at 7pm");

    expect(answer).toContain("Booked");
    expect(c).toHaveCalledTool("book_table", { guests: 2 });
    expect(c).toHaveCalledToolsInOrder(["search_tables", "book_table"]);
    expect(c).toHaveMadeRequests({ max: 5 }); // no runaway loops
    expect(c).toCostLessThan(0.05);
  });
});

// first run       → __cassettes__/booking.test.ts/books-a-table.json
// every run after → replayed: no network, no tokens`,
    judge: `import { useCassette } from "tomiko/vitest";

test("handles a late order", async () => {
  await useCassette(async () => {
    const answer = await agent.run("My order is two weeks late");

    // A model judges the answer once; the verdict is recorded
    // in the cassette and replayed on every run after.
    await expect(answer).toMeet("apologizes and offers a refund");
  });
});

// Any Anthropic, OpenAI or Gemini model can judge:
// configure({ judge: { model: "gpt-5.4-mini" } })`,
    plain: `// Any test runner, or none at all
import { cassette, openCassette } from "tomiko";

const answer = await cassette("support/refund", () =>
  agent.run("I want a refund"),
);

// No globals touched: hand c.fetch to a client
const c = await openCassette("support/refund");
const client = new Anthropic({ fetch: c.fetch });
await c.close(); // saves new recordings

// Jest: expect.extend(matchers) with
// import { matchers } from "tomiko"`,
    client: `// Clients created at module load capture fetch early.
// tomiko's fetch routes to the active cassette,
// and to the real network otherwise: safe in production.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { fetch } from "tomiko";

export const anthropic = new Anthropic({ fetch });
export const openai = new OpenAI({ fetch });

// LangChain:
// new ChatAnthropic({ clientOptions: { fetch } })
// new ChatOpenAI({ configuration: { fetch } })`,
  };
  const editor = $("[data-editor]");
  const editorTabs = $$("[data-tab]");
  const showExample = (key) => {
    editorTabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === key)));
    editor.innerHTML = withLines(highlight(EXAMPLES[key]));
    editor.classList.remove("swap");
    void editor.offsetWidth;
    editor.classList.add("swap");
  };
  editorTabs.forEach((t) => t.addEventListener("click", () => showExample(t.dataset.tab)));
  if (editor) showExample("quick");

  /* ───────────── faults ───────────── */
  const FAULTS = {
    rateLimit: {
      code: "faults: [fault.rateLimit({ times: 2 })]",
      steps: [["bad", "429", "rate_limit_error <em>· retry-after: 1ms</em>"], ["bad", "429", "rate_limit_error <em>· SDK retries at once</em>"], ["good", "200", "replayed from the cassette <em>· end_turn</em>"]],
      result: "test passed · the SDK retried twice, instantly",
    },
    overloaded: {
      code: "faults: [fault.overloaded()]",
      steps: [["bad", "529", "overloaded_error <em>· 503 for OpenAI and Gemini</em>"], ["good", "200", "replayed from the cassette <em>· end_turn</em>"]],
      result: "test passed · overload handled like production",
    },
    serverError: {
      code: "faults: [fault.serverError({ on: [1, 3] })]",
      steps: [["bad", "500", "api_error <em>· request 1</em>"], ["good", "200", "replayed <em>· tool_use: search_tables</em>"], ["bad", "500", "api_error <em>· request 3</em>"], ["good", "200", "replayed <em>· tool_use: book_table</em>"]],
      result: "test passed · hit exactly requests 1 and 3",
    },
    networkError: {
      code: "faults: [fault.networkError()]",
      steps: [["bad", "ERR", "TypeError: fetch failed <em>· read ECONNRESET</em>"], ["good", "200", "replayed from the cassette <em>· end_turn</em>"]],
      result: "test passed · fetch rejected the way undici does",
    },
    cutStream: {
      code: "faults: [fault.cutStream({ afterEvents: 3 })]",
      steps: [["good", "200", "message_start <em>· stream opened</em>"], ["good", "SSE", "content_block_start · content_block_delta"], ["bad", "✂", "connection dropped <em>· after event 3</em>"]],
      result: "test passed · your mid-stream recovery ran",
    },
    latency: {
      code: "faults: [fault.latency({ ms: 30_000 })]",
      steps: [["slow", "⏱", "waiting 30 s <em>· honors the abort signal</em>"], ["bad", "ABORT", "client timeout fired <em>· as in production</em>"], ["good", "200", "replayed from the cassette <em>· end_turn</em>"]],
      result: "test passed · timeouts tested without waiting",
    },
    hallucinatedTool: {
      code: "faults: [fault.hallucinatedTool()]",
      steps: [["model", "tool", "calls get_weather_v2 <em>· a tool that doesn't exist</em>"], ["good", "200", "agent says: no such tool <em>· recorded once</em>"], ["good", "200", "model retries get_weather <em>· end_turn</em>"]],
      result: "test passed · the agent recovered from a made-up tool",
    },
    brokenArguments: {
      code: "faults: [fault.brokenArguments({ on: 2 })]",
      steps: [["good", "200", "search_tables({\"time\":\"19:00\"}) <em>· request 1</em>"], ["model", "args", "book_table({\"table\":1 <em>· JSON cut off</em>"], ["good", "200", "agent asks again <em>· valid arguments</em>"]],
      result: "test passed · broken arguments didn't crash the loop",
    },
    refusal: {
      code: "faults: [fault.refusal()]",
      steps: [["model", "stop", "\"I'm sorry, but I can't help with that.\" <em>· refusal</em>"], ["good", "UI", "agent shows a fallback <em>· no retry storm</em>"]],
      result: "test passed · a refusal is handled, not shown raw",
    },
    maxTokens: {
      code: "faults: [fault.maxTokens({ keep: 0.5 })]",
      steps: [["model", "cut", "answer stops halfway <em>· stop_reason: max_tokens</em>"], ["good", "200", "agent continues the answer <em>· end_turn</em>"]],
      result: "test passed · a truncated answer is detected",
    },
    emptyAnswer: {
      code: "faults: [fault.emptyAnswer()]",
      steps: [["model", "∅", "no text, no tool calls <em>· end_turn</em>"], ["good", "200", "agent retries once <em>· real answer</em>"]],
      result: "test passed · silence doesn't break the agent",
    },
  };
  const faultCode = $("[data-fault-code]");
  const timeline = $("[data-fault-timeline]");
  const faultResult = $("[data-fault-result]");
  const faultFoot = $(".faultbox__foot");
  let faultRun = 0;
  const showFault = async (name) => {
    const run = ++faultRun;
    const f = FAULTS[name];
    $$("[data-fault]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.fault === name)));
    faultCode.innerHTML = highlight(`await useCassette(run, {\n  ${f.code},\n});`);
    faultFoot.classList.remove("show");
    timeline.innerHTML = f.steps
      .map(([kind, status, text], i) => `<li class="${kind}"><span class="n">#${i + 1}</span><span class="d">${text}</span><span class="s">${escape(status)}</span></li>`)
      .join("");
    for (const li of $$("li", timeline)) {
      await wait(reduced ? 0 : 380);
      if (run !== faultRun) return;
      li.classList.add("show");
    }
    await wait(reduced ? 0 : 260);
    if (run !== faultRun) return;
    faultResult.textContent = f.result;
    faultFoot.classList.add("show");
  };
  $$("[data-fault]").forEach((b) => b.addEventListener("click", () => showFault(b.dataset.fault)));
  if (timeline) {
    faultCode.innerHTML = highlight("await useCassette(run, {\n  faults: [fault.rateLimit({ times: 2 })],\n});");
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); showFault("rateLimit"); }
    }, { threshold: 0.3 });
    io.observe(timeline);
  }

  /* ───────────── story steps (shared) ───────────── */
  const story = $("[data-story]");
  const steps = story ? $$(".step", story) : [];
  const screens = story ? $$(".term__screen", story) : [];
  const storyTitles = ["~/agent — first run", "~/agent — commit", "~/agent — every run after"];
  let storyIndex = -1;
  const setStep = (i) => {
    if (i === storyIndex) return;
    storyIndex = i;
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    screens.forEach((s, k) => s.classList.toggle("is-active", k === i));
    $("[data-story-title]").textContent = storyTitles[i];
    story.style.setProperty("--sp", ((i + 1) / steps.length).toFixed(3));
    $(".story__progress span", story).style.setProperty("--sp", ((i + 1) / steps.length).toFixed(3));
  };
  if (story) setStep(0);

  /* ───────────── counters ───────────── */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (!animated || target === 0) { el.textContent = target; return; }
    const obj = { v: 0 };
    gsap.to(obj, { v: target, duration: 1.6, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(obj.v); } });
  };

  /* ───────────── without GSAP or with reduced motion ───────────── */
  if (!animated) {
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    onScroll(scrollY);
    $$("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
    if (story && !reduced) {
      let i = 0;
      setInterval(() => setStep((i = (i + 1) % steps.length)), 4000);
    }
    $$(".manifesto__text .w").forEach((w) => w.classList.add("on"));
    return;
  }

  /* ════════════════════ animated path ════════════════════ */
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", (e) => { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // In-page links scroll smoothly too.
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id.length > 1 && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === "#top" ? 0 : -20, duration: 1.4 });
    }));
  } else {
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
  }
  onScroll(scrollY);

  /* intro: loader, then the hero */
  const loader = $(".loader");
  const heroChars = $$(".hero__title .c");
  gsap.set(heroChars, { yPercent: 115, rotate: 6 });
  gsap.set("[data-hero-in]", { y: 30, autoAlpha: 0 });
  gsap.set(deck, { y: 60, autoAlpha: 0, scale: 0.92 });
  lenis?.stop();

  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  const count = { v: 0 };
  intro
    .fromTo(".loader__word span", { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.045 }, 0)
    .to(count, { v: 100, duration: 1.1, ease: "power2.inOut", onUpdate: () => { $("[data-loader-count]").textContent = Math.round(count.v); } }, 0)
    .to(".loader__bar span", { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0)
    .to(".loader__word span", { yPercent: -110, duration: 0.6, stagger: 0.03, ease: "expo.in" }, 1.15)
    .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 1.45)
    .set(loader, { display: "none" })
    .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.025 }, 1.75)
    .to("[data-hero-in]", { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08 }, 2.05)
    .to(deck, { y: 0, autoAlpha: 1, scale: 1, duration: 1.6 }, 1.95)
    .add(() => lenis?.start(), 2.2);

  const mm = gsap.matchMedia();

  /* hero on scroll: the title drifts up and fades, the cassette turns away */
  mm.add("(min-width: 761px)", () => {
    gsap.to(".hero__title", {
      yPercent: -18, autoAlpha: 0.15, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__bottom", {
      y: -60, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "10% top", end: "60% top", scrub: true },
    });
    gsap.to(deck, {
      yPercent: 40, rotate: 10, scale: 0.85, autoAlpha: 0.2, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__grid", {
      yPercent: 25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  });

  /* ticker: always moving, faster and skewed with scroll speed */
  const ticker = $("[data-ticker]");
  if (ticker) {
    let x = 0;
    let speed = 1;
    let skew = 0;
    gsap.ticker.add(() => {
      const v = lenis ? lenis.velocity : 0;
      const target = (1 + Math.min(Math.abs(v) * 0.25, 14)) * (v < 0 ? -1 : 1);
      speed += (target - speed) * 0.08;
      skew += (gsap.utils.clamp(-8, 8, -v * 0.35) - skew) * 0.1;
      x -= speed;
      const w = ticker.scrollWidth / 2;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      ticker.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
  }

  /* manifesto: words light up as you read */
  const words = $$(".manifesto__text .w");
  if (words.length) {
    ScrollTrigger.create({
      trigger: ".manifesto__text", start: "top 80%", end: "bottom 45%", scrub: true,
      onUpdate: (self) => {
        const lit = Math.round(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < lit));
      },
    });
  }

  /* story: pinned, three steps */
  mm.add("(min-width: 1101px)", () => {
    ScrollTrigger.create({
      trigger: story, start: "top top", end: "+=220%", pin: ".story__pin", scrub: true,
      onUpdate: (self) => setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999))),
    });
  });
  mm.add("(max-width: 1100px)", () => {
    let i = 0;
    const id = setInterval(() => setStep((i = (i + 1) % steps.length)), 3800);
    return () => clearInterval(id);
  });

  /* headings: words rise out of their masks */
  $$("[data-words]").forEach((el) => {
    gsap.from($$(".w", el), {
      yPercent: 110, rotate: 4, duration: 1.2, ease: "expo.out", stagger: 0.05,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
  $$("[data-fade]").forEach((el) => {
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$("[data-stagger]").forEach((el) => {
    gsap.from(el.children, { y: 34, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.from(".fault-picker > *", { y: 20, autoAlpha: 0, duration: 0.8, ease: "expo.out", stagger: 0.03, scrollTrigger: { trigger: ".fault-picker", start: "top 85%" } });
  gsap.from(".faultbox", { y: 60, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".faultbox", start: "top 88%" } });

  /* stats: count up, numbers slide in */
  ScrollTrigger.batch(".stat", {
    start: "top 88%",
    onEnter: (batch) => {
      gsap.from(batch, { y: 60, autoAlpha: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 });
      batch.forEach((s) => countUp($("[data-count]", s)));
    },
    once: true,
  });

  /* what's new: horizontal scroll through the panels */
  const track = $("[data-htrack]");
  const hcount = $("[data-hcount]");
  const panels = track ? $$(".panel", track) : [];
  mm.add("(min-width: 761px)", () => {
    const distance = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: "[data-hscroll]", start: "top top", end: () => `+=${distance()}`, pin: ".new__pin", scrub: 0.6,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => { hcount.textContent = String(Math.min(panels.length, Math.floor(self.progress * panels.length) + 1)).padStart(2, "0"); },
      },
    });
    // Each panel's terminal slides in as its panel comes into view.
    panels.forEach((panel) => {
      gsap.from($(".panel__viz", panel), {
        y: 70, rotate: 2, autoAlpha: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 85%" },
      });
    });
  });
  mm.add("(max-width: 760px)", () => {
    panels.forEach((panel) => {
      gsap.from(panel, { y: 60, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: panel, start: "top 88%" } });
    });
  });

  /* viewer: the frame opens up as it scrolls in */
  const frame = $("[data-viewer-frame]");
  if (frame) {
    gsap.fromTo(frame, { "--cx": "16%", "--ci": "6%", "--is": 1.25 }, {
      "--cx": "0%", "--ci": "0%", "--is": 1, ease: "none",
      scrollTrigger: { trigger: frame, start: "top 95%", end: "top 25%", scrub: true },
    });
  }

  /* commands: rows slide in */
  gsap.from(".cmd-list li", {
    y: 40, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.06,
    scrollTrigger: { trigger: ".cmd-list", start: "top 85%" },
  });

  /* footer wordmark grows into place */
  gsap.from("[data-footer-word]", {
    yPercent: 40, scaleY: 0.6, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
  });

  // Layout settles once the web fonts load.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
