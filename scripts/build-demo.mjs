// Builds the static demo: one self-contained HTML file with the app running
// on sample data in the browser (see demo/mockApi.ts).
//
//   npm run build:demo  →  demo-dist/index.html
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "demo-dist");

const bundle = await build({
  entryPoints: [path.join(root, "demo/main.tsx")],
  bundle: true,
  write: false,
  outdir: outDir,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  // Escape non-ASCII so the page works whatever encoding it is served with.
  charset: "ascii",
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  alias: { "next/dynamic": path.join(root, "demo/next-dynamic.tsx") },
  define: {
    "process.env.NEXT_PUBLIC_DEMO": '"1"',
    "process.env.NODE_ENV": '"production"',
  },
  loader: { ".png": "dataurl", ".svg": "dataurl" },
  logLevel: "warning",
});

const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const leafletCss = bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";

const globalsPath = path.join(root, "src/app/globals.css");
const tailwindCss = (
  await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(await readFile(globalsPath, "utf8"), {
    from: globalsPath,
  })
).css;

// Keep "</script>" inside the bundle from closing the inline script early.
const safeJs = js.replace(/<\/script/gi, "<\\/script");

const html = `<meta charset="utf-8">
<title>Recipe Calculator</title>
<meta name="description" content="Plan meals from grocery offers within a budget and calorie goal.">
<style>${leafletCss}</style>
<style>${tailwindCss}</style>
<div id="root"></div>
<script>${safeJs}</script>
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "index.html"), html);
console.log(`demo-dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
