/* Tiny syntax highlighter shared by the landing page and the docs. */
(() => {
  "use strict";

  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Each grammar is one regex; the index of the matching group picks the token class.
  const GRAMMARS = {
    ts: {
      re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|var|await|async|return|new|function|true|false|null|undefined|type|interface|extends|declare|module|namespace|if|else|for|of|in|throw|try|catch|class|readonly|typeof|keyof|as|void)\b|\b(\d[\d_]*(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()/g,
      classes: ["c", "s", "k", "n", "f"],
    },
    sh: {
      re: /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|(^|\s)(npm|npx|node|git|cd|mkdir|export|pnpm|yarn|vitest|tomiko)(?=\s|$)|(\s--?[\w-]+)|(\b[A-Z_][A-Z0-9_]*=)/gm,
      classes: ["c", "s", null, "f", "p", "k"],
    },
    json: {
      re: /("(?:[^"\\\n]|\\.)*")(\s*:)|("(?:[^"\\\n]|\\.)*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?)/g,
      classes: ["p", null, "s", "k", "n"],
    },
    yaml: {
      re: /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|^(\s*-?\s*)([\w.-]+)(?=:)|\b(true|false)\b|(\b\d+\b)/gm,
      classes: ["c", "s", null, "p", "k", "n"],
    },
  };

  const highlight = (src, lang = "ts") => {
    const grammar = GRAMMARS[lang];
    if (!grammar) return escape(src);
    const { re, classes } = grammar;
    re.lastIndex = 0;
    let html = "";
    let last = 0;
    for (const m of src.matchAll(re)) {
      html += escape(src.slice(last, m.index));
      for (let g = 1; g < m.length; g++) {
        if (m[g] === undefined) continue;
        const cls = classes[g - 1];
        html += cls ? `<span class="tk-${cls}">${escape(m[g])}</span>` : escape(m[g]);
      }
      last = m.index + m[0].length;
    }
    return html + escape(src.slice(last));
  };

  const withLines = (html) => html.split("\n").map((l, i) => `<span class="ln">${i + 1}</span>${l}`).join("\n");

  window.tomikoHL = { escape, highlight, withLines };
})();
