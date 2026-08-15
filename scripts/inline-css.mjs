/* Post-build step: inline the (small) built stylesheet into index.html
   so first paint has no render-blocking CSS request. */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const htmlPath = join(dist, "index.html");
const html = readFileSync(htmlPath, "utf8");

const cssFile = readdirSync(join(dist, "assets")).find(f => f.endsWith(".css"));
if (!cssFile) {
  console.log("no css asset to inline");
  process.exit(0);
}
const css = readFileSync(join(dist, "assets", cssFile), "utf8");

const out = html.replace(
  /<link rel="stylesheet"[^>]*\/assets\/[^"]+\.css"[^>]*>/,
  `<style>${css}</style>`
);

if (out === html) {
  console.error("inline-css: could not find the stylesheet link in index.html");
  process.exit(1);
}
writeFileSync(htmlPath, out);
console.log(`inlined ${cssFile} (${css.length} bytes) into index.html`);
