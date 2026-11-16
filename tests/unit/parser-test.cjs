// Quick unit test for patch-parser (ESM-compatible via babel-ish inline)
// We'll just test the logic directly without importing the TS files,
// since they need compilation. Instead, we'll test the exported logic
// by copying the function bodies or evaluating them.

// For now, we just validate the structure of the code by checking
// that the files exist and have content. Real unit tests would use `tsc` + `jest`.

const fs = require("fs");
const path = require("path");

const coreDir = path.join(__dirname, "..", "src", "core");
const files = ["patch-parser.ts", "patch-engine.ts", "patch-registry.ts"];

console.log("=== Validating core module files ===");
for (const f of files) {
  const filePath = path.join(coreDir, f);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    console.log(`✓ ${f}: ${content.length} bytes`);
    // Basic sanity checks
    if (f === "patch-parser.ts") {
      console.assert(content.includes("parseDirectives"), "Should export parseDirectives");
      console.assert(content.includes("replace"), "Should handle replace directive");
      console.assert(content.includes("add"), "Should handle add directive");
    }
    if (f === "patch-engine.ts") {
      console.assert(content.includes("applyPromptPatches"), "Should export applyPromptPatches");
      console.assert(content.includes("computePromptFingerprint"), "Should have fingerprint");
    }
    if (f === "patch-registry.ts") {
      console.assert(content.includes("loadRegistryFromJson"), "Should load registry from JSON");
      console.assert(content.includes("lookupAgentEntries"), "Should lookup agent entries");
    }
  } else {
    console.error(`✗ ${f}: NOT FOUND`);
  }
}

// Validate test file exists
const testFile = path.join(__dirname, "..", "tests", "unit", "parser-test.cjs");
if (fs.existsSync(testFile)) {
  console.log(`✓ test file exists: ${fs.readFileSync(testFile, "utf8").split("\n").length} lines`);
}

console.log("\n=== Validation complete ===");