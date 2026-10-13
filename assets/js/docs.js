(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const { highlight } = window.tomikoHL;
  const root = document.documentElement;

  /* ───────────── code blocks: highlight, title bar, copy ───────────── */
  const COPY_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const OK_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LABELS = { ts: "TypeScript", sh: "Shell", json: "JSON", yaml: "YAML", text: "Output" };

  const toast = $(".toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
  };

  const copyText = async (text) => {
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
  };

  $$(".code").forEach((block) => {
    const code = $("code", block);
    const lang = block.dataset.lang || "ts";
    const source = code.textContent;
    code.innerHTML = highlight(source, lang);

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy";
    copy.setAttribute("aria-label", "Copy code");
    copy.innerHTML = COPY_ICON;
    copy.addEventListener("click", async () => {
      await copyText(source);
      copy.innerHTML = OK_ICON;
      copy.classList.add("done");
      showToast("Copied to clipboard");
      setTimeout(() => { copy.innerHTML = COPY_ICON; copy.classList.remove("done"); }, 1400);
    });

    if (block.dataset.title || lang !== "text") {
      const head = document.createElement("div");
      head.className = "code__head";
      head.innerHTML = `<span>${block.dataset.title ? window.tomikoHL.escape(block.dataset.title) : ""}</span><span class="lang">${LABELS[lang] || lang}</span>`;
      head.append(copy);
      block.prepend(head);
    } else {
      block.append(copy);
    }
  });

  /* ───────────── deep links ───────────── */
  // Code block headers are added after the browser has already jumped to the hash, which shifts
  // the target down; jump again once the layout (and the web fonts) have settled.
  const jumpToHash = () => {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  };
  if (location.hash) {
    jumpToHash();
    document.fonts?.ready.then(jumpToHash);
  }

  /* ───────────── heading anchors ───────────── */
  const slug = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  $$(".content h2, .content h3, .content h4").forEach((h) => {
    if (!h.id) {
      const section = h.closest("section");
      if (h.tagName === "H2" && section?.id) h.id = `${section.id}-title`;
      else h.id = `${section?.id ?? "s"}-${slug(h.textContent)}`;
    }
    const target = h.tagName === "H2" && h.closest("section")?.id ? h.closest("section").id : h.id;
    const a = document.createElement("a");
    a.className = "anchor";
    a.href = `#${target}`;
    a.setAttribute("aria-label", `Link to ${h.textContent}`);
    a.textContent = "#";
    h.prepend(a);
    a.addEventListener("click", () => {
      const url = `${location.origin}${location.pathname}#${target}`;
      copyText(url);
      showToast("Link copied");
    });
  });

  /* ───────────── scroll spy: sidebar + right toc ───────────── */
  const sections = $$(".content > section");
  const sideLinks = new Map($$(".sidebar a[href^='#']").map((a) => [a.getAttribute("href").slice(1), a]));
  const toc = $("[data-toc]");
  let currentSection = null;
  let tocLinks = [];

  const buildToc = (section) => {
    const heads = $$("h3", section);
    toc.innerHTML = heads.length
      ? heads.map((h) => `<li><a href="#${h.id}">${window.tomikoHL.escape(h.textContent.replace(/^#/, ""))}</a></li>`).join("")
      : `<li><a href="#${section.id}">${window.tomikoHL.escape($("h2, h1", section).textContent.replace(/^#/, ""))}</a></li>`;
    tocLinks = $$("a", toc).map((a) => [document.getElementById(a.getAttribute("href").slice(1)), a]);
  };

  const setSection = (section) => {
    if (section === currentSection) return;
    currentSection = section;
    sideLinks.forEach((a) => a.classList.remove("active"));
    const link = sideLinks.get(section.id);
    if (link) {
      link.classList.add("active");
      const sb = $(".sidebar");
      const r = link.getBoundingClientRect();
      const sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 60 || r.bottom > sr.bottom - 40) sb.scrollTo({ top: link.offsetTop - sr.height / 2, behavior: "smooth" });
    }
    buildToc(section);
  };

  const nav = $(".nav");
  const bar = $(".progress span");
  const backTop = $(".back-top");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 8);
    const max = root.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    backTop.classList.toggle("show", y > 900);

    const line = 120;
    let active = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= line) active = s;
    if (innerHeight + y >= root.scrollHeight - 4) active = sections[sections.length - 1];
    setSection(active);

    let activeHead = null;
    for (const [h] of tocLinks) if (h && h.getBoundingClientRect().top <= line + 40) activeHead = h;
    tocLinks.forEach(([h, a]) => a.classList.toggle("active", h === activeHead));
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ───────────── mobile drawer ───────────── */
  const menuBtn = $(".menu-btn");
  const setOpen = (open) => {
    document.body.classList.toggle("docs-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };
  menuBtn.addEventListener("click", () => setOpen(!document.body.classList.contains("docs-open")));
  $(".scrim").addEventListener("click", () => setOpen(false));
  $$(".sidebar a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  /* ───────────── search ───────────── */
  // Index each sidebar entry with the text of its section, so "retry" finds Failure injection.
  const sidebar = $(".sidebar");
  const input = $("[data-search]");
  const empty = $(".sidebar__empty");
  const entries = [...sideLinks.entries()].map(([id, a]) => {
    const section = document.getElementById(id);
    return {
      a,
      li: a.closest("li"),
      group: a.closest(".sidebar__group"),
      title: a.textContent.toLowerCase(),
      body: (section?.textContent ?? "").toLowerCase(),
    };
  });
  const runSearch = () => {
    const q = input.value.trim().toLowerCase();
    sidebar.classList.toggle("filtering", q !== "");
    let shown = 0;
    for (const e of entries) {
      const hit = !q || e.title.includes(q) || e.body.includes(q);
      e.li.hidden = !hit;
      if (hit) shown++;
    }
    $$(".sidebar__group").forEach((g) => { g.hidden = !$$("li", g).some((li) => !li.hidden); });
    empty.classList.toggle("show", shown === 0);
  };
  input.addEventListener("input", runSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = entries.find((x) => !x.li.hidden);
      if (first) { location.hash = first.a.getAttribute("href"); input.blur(); setOpen(false); }
    }
    if (e.key === "Escape") { input.value = ""; runSearch(); input.blur(); }
  });
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
      e.preventDefault();
      if (matchMedia("(max-width: 920px)").matches) setOpen(true);
      input.focus();
    }
  });
  /* ───────────── blocks fade in as they are reached ───────────── */
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const blocks = $$(".content > section > :is(h2, h3, p, ul, ol, .code, .table-wrap, .callout, .members, .doc-cards, .whats-new, .lifecycle, .signature, .doc-hero)");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -30px 0px" });
    blocks.forEach((b) => {
      // Blocks already on screen stay put; only those below the fold animate in.
      if (b.getBoundingClientRect().top < innerHeight) return;
      b.classList.add("reveal");
      io.observe(b);
    });
  }
})();
