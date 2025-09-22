import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && /\.(ts|tsx|js|jsx)$/.test(p)) yield p;
  }
}

// Match ONLY actual import statements like: import ... from "@/mocks/rpc"
const FORBIDDEN = /from\s+['"]@\/mocks\/rpc['"]/;

describe("no direct mocks/rpc imports", () => {
  it("should not import from '@/mocks/rpc' anywhere in src", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      // ignore this guard test itself
      if (file.endsWith("src/tests/no-mock-imports.test.ts")) continue;

      const content = readFileSync(file, "utf8");
      if (FORBIDDEN.test(content)) offenders.push(file);
    }
    expect(offenders, `Forbidden '@/mocks/rpc' found in:\n${offenders.join("\n")}`).toEqual([]);
  });
});