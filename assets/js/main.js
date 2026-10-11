(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Runs `fn` once when `el` scrolls into view. */
  const onceVisible = (el, fn, threshold = 0.35) => {
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    }, { threshold });
    io.observe(el);
  };

  /* ───────────── reveal on scroll ───────────── */
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ───────────── nav, progress, parallax ───────────── */
  const nav = $(".nav");
  const bar = $(".progress span");
  const root = document.documentElement;
  const browser = $("[data-tilt]");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 24);
    const max = root.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    root.style.setProperty("--scroll", y);

    if (browser && !reduced) {
      const r = browser.getBoundingClientRect();
      // 0 when the frame's top enters the bottom of the viewport, 1 when it reaches 25% from the top
      const t = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75)));
      const ease = 1 - Math.pow(1 - t, 3);
      browser.style.setProperty("--tilt", `${(18 * (1 - ease)).toFixed(2)}deg`);
      browser.style.setProperty("--scale", (0.92 + 0.08 * ease).toFixed(4));
    }
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ───────────── cassette: tilt with the pointer, REC ⇄ PLAY ───────────── */
  const deck = $(".deck");
  const cassette = $(".cassette");
  const counter = $(".counter");
  if (deck && !reduced && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      cassette.style.setProperty("--ry", `${(-14 + x * 18).toFixed(2)}deg`);
      cassette.style.setProperty("--rx", `${(8 - y * 14).toFixed(2)}deg`);
    }, { passive: true });
  }
  if (deck) {
    const label = $(".deck__label", deck);
    const meta = $(".deck__meta", deck);
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
        count = (count + (mode === "play" ? 7 : 1)) % 1000;
        counter.textContent = String(count).padStart(3, "0");
      }, 90);
    }
  }

  /* ───────────── magnetic buttons ───────────── */
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ───────────── spotlight cards ───────────── */
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ───────────── copy buttons ───────────── */
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

  /* ───────────── terminal demo ───────────── */
  const term = $("[data-term]");
  const out = $("[data-term-out]");
  const SCRIPT = [
    { cmd: "npx vitest run", note: "# first run: real API" },
    { wait: 900 },
    { html: ' <span class="t-ok">✓</span> booking.test.ts <span class="t-dim">(1 test)</span> <span class="t-acc">2412ms</span>' },
    { html: '   <span class="t-ok">✓</span> books a table <span class="t-dim">2409ms</span>' },
    { html: ' <span class="t-dim">Test Files</span>  <span class="t-ok">1 passed</span> <span class="t-dim">(1)</span>' },
    { html: ' <span class="t-acc">tomiko</span> · 1 cassette · 0 replayed · <span class="t-rec">1 recorded</span>' },
    { html: ' <span class="t-acc">cost </span> · $0.0157 est.' },
    { html: "" },
    { cmd: "git status --short" },
    { html: '<span class="t-ok">??</span> <span class="t-file">__cassettes__/booking.test.ts/books-a-table.json</span>' },
    { html: "" },
    { cmd: "CI=1 npx vitest run", note: "# every run after" },
    { wait: 120 },
    { html: ' <span class="t-ok">✓</span> booking.test.ts <span class="t-dim">(1 test)</span> <span class="t-play">8ms</span>' },
    { html: '   <span class="t-ok">✓</span> books a table <span class="t-dim">6ms</span>' },
    { html: ' <span class="t-dim">Test Files</span>  <span class="t-ok">1 passed</span> <span class="t-dim">(1)</span>' },
    { html: ' <span class="t-acc">tomiko</span> · 1 cassette · <span class="t-play">1 replayed</span> · 0 recorded' },
    { html: ' <span class="t-acc">cost </span> · $0.0157 est. · <span class="t-badge">$0.0157 saved by replay</span>' },
  ];
  const promptHtml = '<span class="t-prompt">❯</span> ';
  let termRun = 0;
  const playTerm = async () => {
    const run = ++termRun;
    out.innerHTML = "";
    const alive = () => run === termRun;
    for (const step of SCRIPT) {
      if (!alive()) return;
      if (step.wait) { await wait(reduced ? 0 : step.wait); continue; }
      if (step.cmd) {
        const line = document.createElement("span");
        line.innerHTML = promptHtml;
        const cmd = document.createElement("span");
        cmd.className = "t-cmd";
        line.append(cmd);
        out.append(line);
        for (const ch of step.cmd) {
          if (!alive()) return;
          cmd.textContent += ch;
          if (!reduced) await wait(28 + Math.random() * 50);
        }
        if (step.note) line.insertAdjacentHTML("beforeend", `  <span class="t-dim">${escape(step.note)}</span>`);
        out.append("\n");
        await wait(reduced ? 0 : 380);
        continue;
      }
      out.insertAdjacentHTML("beforeend", `${step.html}\n`);
      await wait(reduced ? 0 : 140);
    }
    if (alive()) out.insertAdjacentHTML("beforeend", promptHtml);
  };
  onceVisible(term, playTerm);
  $("[data-term-replay]")?.addEventListener("click", playTerm);

  /* ───────────── race bars ───────────── */
  const race = $(".race");
  const runRace = () => {
    const times = { rec: 194, play: 8 };
    for (const [key, ms] of Object.entries(times)) {
      const fill = $(`[data-race="${key}"]`);
      const num = $(`[data-race-time="${key}"]`);
      // Slow motion: 10x real time so 8 ms is still visible
      const dur = reduced ? 0 : ms * 10;
      fill.style.setProperty("--t", `${dur}ms`);
      fill.style.width = "0%";
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = "100%"; }));
      const start = performance.now();
      const tick = (now) => {
        const t = dur ? Math.min(1, (now - start) / dur) : 1;
        num.textContent = Math.round(ms * t);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };
  onceVisible(race, runRace, 0.5);
  race?.addEventListener("click", runRace);

  /* ───────────── flow diagram ───────────── */
  const flow = $("[data-flow]");
  if (flow) {
    const MODES = {
      record: { sub: "mode: auto", cas: "writing 3 interactions…", casShort: "recording…", time: "seconds", tokens: "real", net: "on", key: "required" },
      replay: { sub: "mode: replay", cas: "3 interactions replayed", casShort: "replaying", time: "milliseconds", tokens: "0", net: "off", key: "not needed" },
    };
    const fields = {
      sub: $$("[data-flow-sub]", flow), cas: $$("[data-flow-cas]", flow), casShort: $$("[data-flow-cas-short]", flow),
      time: $$("[data-flow-time]", flow), tokens: $$("[data-flow-tokens]", flow),
      net: $$("[data-flow-net]", flow), key: $$("[data-flow-key]", flow),
    };
    const tabs = $$("[data-flow-tab]", flow);
    let auto;
    const setFlow = (mode) => {
      flow.dataset.mode = mode;
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.flowTab === mode)));
      for (const [k, els] of Object.entries(fields)) {
        for (const el of els) {
          el.textContent = MODES[mode][k];
          if (el.tagName === "B") { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); }
        }
      }
    };
    const startAuto = () => {
      clearInterval(auto);
      if (!reduced) auto = setInterval(() => setFlow(flow.dataset.mode === "record" ? "replay" : "record"), 5200);
    };
    tabs.forEach((t) => t.addEventListener("click", () => { setFlow(t.dataset.flowTab); startAuto(); }));
    onceVisible(flow, startAuto, 0.3);
  }

  /* ───────────── counters ───────────── */
  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (el.hasAttribute("data-static")) return;
    onceVisible(el, () => {
      if (reduced) { el.textContent = target; return; }
      const start = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 0.6);
  });

  /* ───────────── syntax highlighting (assets/js/highlight.js) ───────────── */
  const { highlight, withLines } = window.tomikoHL;

  /* ───────────── faults ───────────── */
  const FAULTS = {
    rateLimit: {
      code: 'await useCassette(run, {\n  faults: [fault.rateLimit({ times: 2 })],\n});',
      steps: [
        ["bad", "429", "rate_limit_error <em>· retry-after: 1ms</em>"],
        ["bad", "429", "rate_limit_error <em>· SDK retries at once</em>"],
        ["good", "200", "replayed from cassette <em>· end_turn</em>"],
      ],
      result: "test passed · the SDK retried twice, instantly",
    },
    overloaded: {
      code: 'await useCassette(run, {\n  faults: [fault.overloaded()],\n});',
      steps: [
        ["bad", "529", "overloaded_error <em>· 503 for OpenAI</em>"],
        ["good", "200", "replayed from cassette <em>· end_turn</em>"],
      ],
      result: "test passed · overload handled like production",
    },
    serverError: {
      code: 'await useCassette(run, {\n  faults: [fault.serverError({ on: [1, 3] })],\n});',
      steps: [
        ["bad", "500", "api_error <em>· request 1</em>"],
        ["good", "200", "replayed <em>· tool_use: search_tables</em>"],
        ["bad", "500", "api_error <em>· request 3</em>"],
        ["good", "200", "replayed <em>· tool_use: book_table</em>"],
      ],
      result: "test passed · targeted exactly requests 1 and 3",
    },
    networkError: {
      code: 'await useCassette(run, {\n  faults: [fault.networkError()],\n});',
      steps: [
        ["bad", "ERR", "TypeError: fetch failed <em>· read ECONNRESET</em>"],
        ["good", "200", "replayed from cassette <em>· end_turn</em>"],
      ],
      result: "test passed · fetch rejected the way undici does",
    },
    cutStream: {
      code: 'await useCassette(run, {\n  faults: [fault.cutStream({ afterEvents: 3 })],\n});',
      steps: [
        ["good", "200", "message_start <em>· stream opened</em>"],
        ["good", "SSE", "content_block_start · content_block_delta"],
        ["bad", "✂", "connection dropped <em>· after event 3</em>"],
      ],
      result: "test passed · your mid-stream recovery path ran",
    },
    latency: {
      code: 'await useCassette(run, {\n  faults: [fault.latency({ ms: 30_000 })],\n});',
      steps: [
        ["slow", "⏱", "waiting 30 s <em>· honors the abort signal</em>"],
        ["bad", "ABORT", "client timeout fired <em>· as in production</em>"],
        ["good", "200", "replayed from cassette <em>· end_turn</em>"],
      ],
      result: "test passed · timeouts tested without waiting",
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
    faultCode.innerHTML = highlight(f.code);
    faultFoot.classList.remove("show");
    timeline.innerHTML = f.steps
      .map(([kind, status, text], i) => `<li class="${kind}"><span class="n">#${i + 1}</span><span class="d">${text}</span><span class="s">${status}</span></li>`)
      .join("");
    const items = $$("li", timeline);
    for (const li of items) {
      await wait(reduced ? 0 : 420);
      if (run !== faultRun) return;
      li.classList.add("show");
    }
    await wait(reduced ? 0 : 300);
    if (run !== faultRun) return;
    faultResult.textContent = f.result;
    faultFoot.classList.add("show");
  };
  $$("[data-fault]").forEach((b) => b.addEventListener("click", () => showFault(b.dataset.fault)));
  if (timeline) {
    faultCode.innerHTML = highlight(FAULTS.rateLimit.code);
    onceVisible(timeline, () => showFault("rateLimit"), 0.4);
  }

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
    expect(c).toCostLessThan(0.05);
  });
});

// first run  → __cassettes__/booking.test.ts/books-a-table.json
// every run after → replayed: no network, no key, no tokens`,
    matchers: `// Assert what the agent did, not just what it said
expect(c).toHaveCalledTool("book_table", { guests: 2, table: expect.any(Number) });
expect(c).toHaveCalledToolsInOrder(["search_tables", "book_table"]);
expect(c).toHaveCalledToolTimes("search_tables", 1);
expect(c).not.toHaveCalledTool("cancel_booking");

expect(c).toHaveMadeRequests({ max: 5 }); // no runaway loops
expect(c).toHaveUsedModel(/claude-opus/);
expect(c).toHaveUsedFewerTokensThan(20_000);
expect(c).toCostLessThan(0.05);`,
    plain: `// Any test runner — or none at all
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
// and to the real network otherwise — safe in production.
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
})();
