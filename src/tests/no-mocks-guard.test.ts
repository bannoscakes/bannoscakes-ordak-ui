import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename } from "node:path";

describe("repo has no mocks", () => {
  it("src/mocks/ folder must not exist", () => {
    expect(existsSync("src/mocks")).toBe(false);
  });

  it("no '@/mocks/rpc' imports in src/ (excluding this test file)", () => {
    const testFile = "src/tests/no-mocks-guard.test.ts";
    try {
 hotfix/remove-mocks-on-main
      execSync(
        `grep -R --exclude="${testFile}" "from\\s*['\\"]@/mocks/rpc['\\"]" -n src`,
        { stdio: "pipe" }
      );
      execSync(`grep -R "from\\s\\+['\\"]@/mocks/rpc['\\"]" -n src`, { stdio: "pipe" });
      throw new Error("Found '@/mocks/rpc' import");
    } catch (err: any) {
      expect(String(err.stdout || "")).toBe("");
    }
  });
});
