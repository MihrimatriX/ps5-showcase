/**
 * Builds preview/index.html: the whole console in one self-contained file (React, code and CSS inlined).
 * Handy for sharing a link or opening the showcase without running a server.
 *   npm run preview
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = await build({
  stdin: {
    contents: `
      import "./app/globals.css";
      import { createRoot } from "react-dom/client";
      import App from "./components/Console";
      createRoot(document.getElementById("root")).render(<App />);
    `,
    loader: "tsx",
    resolveDir: root,
  },
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: ["es2020"],
  outdir: "out-preview",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  logOverride: { "unsupported-directive": "silent" },
});

const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = result.outputFiles.find((f) => f.path.endsWith(".css")).text;
const fonts =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@500;800&family=Playfair+Display:ital,wght@1,700&family=Righteous&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@500;700&display=swap";

const html = `<!doctype html>
<html lang="tr" data-console-theme="cosmic" data-input="pointer">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#02030a" />
<title>AFU Console</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${fonts}" />
<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;

mkdirSync(join(root, "preview"), { recursive: true });
writeFileSync(join(root, "preview", "index.html"), html);
console.log(`preview/index.html · ${(html.length / 1024).toFixed(0)} KB`);
