# tomiko — landing page

The website for [tomiko](https://github.com/saykachi/tomiko): record & replay LLM calls in your tests.

Plain HTML, CSS and JavaScript. No build step, no dependencies — like tomiko itself.

```
index.html            page markup
assets/css/style.css  styles and animations
assets/js/main.js     interactions: terminal demo, flow diagram, fault picker, code tabs
assets/img/           favicon, viewer screenshot, social preview
```

## Run locally

```sh
npx serve .
# or
python3 -m http.server 8000
```

## Deploy

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`.
Enable it once in **Settings → Pages → Build and deployment → Source: GitHub Actions**.
