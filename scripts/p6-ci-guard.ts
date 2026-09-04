import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runP6Case } from "./p6-test-support.ts";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const dangerousPatterns = [
  /\bprintenv\b/i,
  /\bset\s+-x\b/i,
  /\benv\s*\|/i,
  /echo\s+[^\n]*(AWKN_MARKETING_[A-Z_]*TOKEN|\$\{\{\s*secrets\.)/i,
];

await runP6Case("CI does not contain obvious secret-print commands", () => {
  for (const pattern of dangerousPatterns) {
    assert.equal(pattern.test(workflow), false, `Unsafe CI logging pattern: ${pattern}`);
  }
});
