const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let checked = 0;

while ((match = scriptPattern.exec(html)) !== null) {
  const attributes = match[1] || '';
  const source = match[2] || '';
  if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
  checked += 1;
  new vm.Script(source, { filename: `index.html:inline-script-${checked}` });
}

if (checked === 0) {
  throw new Error('No inline JavaScript was found in index.html.');
}

process.stdout.write(`Validated ${checked} inline JavaScript block(s).\n`);
