import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter((match) => match[1].trim().length > 0);

if (scripts.length === 0) {
  throw new Error("No inline JavaScript found in index.html");
}

for (const match of scripts) {
  new vm.Script(match[1], { filename: "index.html:inline-script" });
}

console.log("Parsed " + scripts.length + " inline JavaScript block(s) successfully.");
