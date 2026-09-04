import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runP6Case } from "./p6-test-support.ts";

async function main() {
  await runP6Case("product client forwards caller idempotency key", () => {
    const source = readFileSync(new URL("../lib/product-client.ts", import.meta.url), "utf8");
    assert.match(source, /idempotency_key:\s*input\.idempotencyKey/);
  }, { operation: "product.request" });

  await runP6Case("sync adapter preserves logical idempotency key", () => {
    const source = readFileSync(new URL("../lib/sync-store.ts", import.meta.url), "utf8");
    assert.match(source, /idempotencyKey:\s*input\.idempotencyKey/);
    assert.match(source, /callMarketingProduct\(\{[\s\S]*idempotencyKey:\s*input\.idempotencyKey/);
  }, { operation: "task.execution.upsert", entityId: "task-execution:test" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
