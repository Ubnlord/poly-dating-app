import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .filter((match) => match[1].trim().length > 0);

if (scripts.length === 0) {
  throw new Error("No inline JavaScript found in index.html");
}

for (const [index, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `index.html:inline-script-${index + 1}` });
}

console.log(`Parsed ${scripts.length} inline JavaScript block(s) successfully.`);
