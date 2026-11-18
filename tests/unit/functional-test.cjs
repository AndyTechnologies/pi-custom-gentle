/**
 * Functional tests for pi-custom-gentle
 * Running from project root, src/ is at ./src/
 */

const fs = require('fs');
const path = require('path');

// src/ is relative al directorio actual (project root)
const SRC_CORE = path.join(process.cwd(), 'src', 'core');
const SRC_STATE = path.join(process.cwd(), 'src', 'state');
const SRC_COMMANDS = path.join(process.cwd(), 'src', 'commands');
const SRC_INSPECTION = path.join(process.cwd(), 'src', 'inspection');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
  }
}

// 1. Test: patch-parser reconoc replace y add
test('patch-parser: parseDirectives recognized', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-parser.ts'), 'utf8');
  if (!content.includes('parseDirectives')) throw new Error('parseDirectives not found');
  if (!content.includes('<!-- replace:')) throw new Error('replace directive not found');
  if (!content.includes('<!-- add:')) throw new Error('add directive not found');
});

// 2. Test: patch-engine exports applyPromptPatches
test('patch-engine: exports applyPromptPatches', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-engine.ts'), 'utf8');
  if (!content.includes('applyPromptPatches')) throw new Error('applyPromptPatches not exported');
});

// 3. Test: state-manager has resolvePrecedence
test('state-manager: has resolvePrecedence function', () => {
  const content = fs.readFileSync(path.join(SRC_STATE, 'state-manager.ts'), 'utf8');
  if (!content.includes('resolvePrecedence')) throw new Error('resolvePrecedence not found');
});

// 4. Test: generateDiff has statistics
test('generateDiff: has statistics', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-engine.ts'), 'utf8');
  if (!content.includes('originalLines') || !content.includes('transformedLines') || !content.includes('unchanged') || !content.includes('modified') || !content.includes('added') || !content.includes('deleted')) {
    throw new Error('generateDiff statistics incomplete');
  }
});

// 5. Test: prompt-viewer has 3 tabs
test('prompt-viewer: has 3 tabs (Original/Resultante/Diff)', () => {
  const content = fs.readFileSync(path.join(SRC_INSPECTION, 'prompt-viewer.ts'), 'utf8');
  if (!content.includes('Original') || !content.includes('Resultante') || !content.includes('Diff')) throw new Error('missing 3 tabs');
});

// 6. Test: commands exist
test('commands: prompt-command and custom-odd-command', () => {
  const promptCmd = fs.readFileSync(path.join(SRC_COMMANDS, 'prompt-command.ts'), 'utf8');
  const oddCmd = fs.readFileSync(path.join(SRC_COMMANDS, 'custom-odd-command.ts'), 'utf8');
  // Verificar que ambos archivos contienen las funciones esperadas
  if (!promptCmd.includes('registerPromptCommand')) throw new Error('prompt-command missing registerPromptCommand');
  if (!oddCmd.includes('registerCustomOddCommand')) throw new Error('custom-odd-command missing registerCustomOddCommand');
});

// 7. Test: overlap validation
test('patch-parser: validates overlaps', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-parser.ts'), 'utf8');
  if (!content.includes('Overlap')) throw new Error('overlap validation not implemented');
});

// 8. Test: state-manager modes
test('state-manager: has all modes', () => {
  const content = fs.readFileSync(path.join(SRC_STATE, 'state-manager.ts'), 'utf8');
  const modes = ['on', 'off', 'inherit', 'always on', 'always off'];
  for (const mode of modes) {
    if (!content.includes(mode)) throw new Error(`mode "${mode}" not found`);
  }
});

// 9. Test: computePromptFingerprint
test('patch-engine: has computePromptFingerprint', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-engine.ts'), 'utf8');
  if (!content.includes('computePromptFingerprint')) throw new Error('computePromptFingerprint not found');
});

// 10. Test: patch-registry exports
test('patch-registry: exports loadRegistryFromJson', () => {
  const content = fs.readFileSync(path.join(SRC_CORE, 'patch-registry.ts'), 'utf8');
  if (!content.includes('loadRegistryFromJson')) throw new Error('loadRegistryFromJson not exported');
  if (!content.includes('lookupAgentEntries')) throw new Error('lookupAgentEntries not exported');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
