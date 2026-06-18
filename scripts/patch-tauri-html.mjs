import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const indexPath = join(process.cwd(), "dist", "index.html");
const html = await readFile(indexPath, "utf8");

const patched = html.replaceAll(" crossorigin", "");

if (patched !== html) {
  await writeFile(indexPath, patched);
}
