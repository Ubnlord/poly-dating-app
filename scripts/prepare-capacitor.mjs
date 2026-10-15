import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "index.html");
const targetDir = resolve(root, "www");
const target = resolve(targetDir, "index.html");

await mkdir(targetDir, { recursive: true });
await copyFile(source, target);
console.log("Prepared PolyConnect web assets for Capacitor:", target);
