# tomiko — website

The landing page and documentation for [tomiko](https://github.com/Tomiko-M/tomiko): record & replay LLM calls in your tests.

Plain HTML, CSS and JavaScript. No build step.

```
index.html               landing page
docs.html                documentation: guides, CLI, API reference, recipes, changelog
assets/css/base.css      shared tokens, type, buttons, nav, code colors
assets/css/landing.css   landing page
assets/css/docs.css      documentation
assets/js/highlight.js   tiny syntax highlighter, shared
assets/js/landing.js     landing animations and interactions
assets/js/docs.js        docs search, scroll spy, copy buttons, mobile menu
assets/vendor/           GSAP 3.12.5 + ScrollTrigger (GSAP standard license), Lenis 1.1.13 (MIT)
assets/img/              favicon, viewer screenshot, social preview
```

The landing page works without JavaScript and honours `prefers-reduced-motion`: the
animations switch off and every section stays readable.

## Run locally

```sh
npx serve .
# or
python3 -m http.server 8000
```

## Deploy

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`.
