/**
 * Build, rewrite package.json exports from src → dist for npm publish,
 * run npm publish, then restore the original exports.
 *
 * Usage: bun script/publish.ts [--otp=CODE]
 */
import { $ } from "bun";

// Build first
await $`bun run build`;

const path = "./package.json";
const original = await Bun.file(path).text();
const pkg = JSON.parse(original);

// Rewrite exports: ./src/*.ts(x) → ./dist/*.js
for (const [key, value] of Object.entries(
  pkg.exports as Record<string, string>,
)) {
  pkg.exports[key] = value
    .replace("./src/", "./dist/")
    .replace(/\.tsx?$/, ".js");
}

await Bun.write(path, JSON.stringify(pkg, null, 2) + "\n");
console.log("Rewrote exports for publish:", pkg.exports);

try {
  const args = process.argv.slice(2);
  const result = await $`npm publish ${args}`.env(process.env).quiet();
  // Print only the success line
  const out = result.stderr.toString();
  const ok = out.match(/^\+ .+$/m);
  if (ok) console.log(ok[0]);
} finally {
  await Bun.write(path, original);
  console.log("Restored original exports");
}
