import assert from "node:assert/strict";
import { readIntegrationConfig, runP6Case } from "./p6-test-support.ts";

const config = readIntegrationConfig();

await runP6Case("integration data scope is explicit", () => {
  assert.ok(["fixture", "synthetic", "real-acceptance"].includes(config.dataKind));
});

if (!config.enabled) {
  console.log("[P6][SKIP] real AWKN integration disabled; set AWKN_P6_INTEGRATION=true in a server-side integration environment.");
} else {
  await runP6Case("platform integration fails closed without local session fallback", () => {
    assert.equal(config.allowLocalSession, false);
  }, { operation: "session" });

  await runP6Case("all P6 integration endpoints are configured", () => {
    for (const [name, endpoint] of Object.entries(config.endpoints)) {
      assert.ok(endpoint, `Missing ${name} endpoint`);
    }
  });

  await runP6Case("all P6 integration tokens are configured without printing values", () => {
    for (const [name, configured] of Object.entries(config.tokenConfigured)) {
      assert.equal(configured, true, `Missing ${name} token`);
    }
  });
}
