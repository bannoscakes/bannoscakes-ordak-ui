import fs from 'fs';
import path from 'path';

/** recursively walk a directory */
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const exts = new Set(['.ts', '.tsx']);
let changed = 0;

for (const file of walk('src')) {
  const ext = path.extname(file);
  if (!exts.has(ext)) continue;

  let text = fs.readFileSync(file, 'utf8');
  let orig = text;

  // 1) remove any @version after a module name in from "module@1.2.3"
  text = text.replace(/from\s+"([^"]+?)@[0-9][^"]*"/g, 'from "$1"');

  // 2) main.tsx often imports App with extension; strip it
  if (file.endsWith('src/main.tsx')) {
    text = text.replace(/from\s+"\.\/App\.tsx"/g, 'from "./App"');
  }

  if (text !== orig) {
    fs.writeFileSync(file, text);
    changed++;
    console.log('fixed:', file);
  }
}

console.log(`done. files changed: ${changed}`);