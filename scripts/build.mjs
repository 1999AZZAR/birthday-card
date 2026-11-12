/**
 * Builds the deployable asset tree.
 *
 * Copies site/ into build/ and fingerprints every CSS/JS asset with a content
 * hash, so long-lived immutable caching at the edge is safe: a changed file
 * always gets a new URL.
 */
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "site");
const output = join(root, "build");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function main() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });

  const files = await walk(join(output, "assets"));
  const assets = files.filter((file) => /\.(css|js)$/.test(file));

  const hashes = new Map();
  for (const file of assets) {
    const digest = createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 10);
    hashes.set(relative(output, file).split("\\").join("/"), digest);
  }

  const htmlPath = join(output, "index.html");
  let html = await readFile(htmlPath, "utf8");

  for (const [path, digest] of hashes) {
    const bare = path.replace(/\?v=[a-f0-9]+$/, "");
    const pattern = new RegExp(`(?<![\\w?=&])(${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(\\?v=[a-f0-9]+)?`, "g");
    html = html.replace(pattern, (_, match) => `${match}?v=${digest}`);
  }

  await writeFile(htmlPath, html);

  const versioned = [...hashes.entries()].map(([path, digest]) => `  ${path}?v=${digest}`);
  console.log(`build: ${assets.length} assets fingerprinted`);
  console.log(versioned.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
