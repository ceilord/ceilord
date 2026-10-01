import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendor = path.join(root, "site", "vendor");
await mkdir(vendor, { recursive: true });

const files = [
  ["node_modules/gsap/dist/gsap.min.js", "gsap.min.js"],
  ["node_modules/gsap/dist/ScrollTrigger.min.js", "ScrollTrigger.min.js"],
  ["node_modules/lenis/dist/lenis.min.js", "lenis.min.js"],
  ["node_modules/lenis/dist/lenis.css", "lenis.css"],
];

for (const [source, target] of files) {
  await copyFile(path.join(root, source), path.join(vendor, target));
}
console.log("Hydrated site/vendor from npm dependencies.");
