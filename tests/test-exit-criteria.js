#!/usr/bin/env node
/**
 * Test script for exit criteria validation in debug-loop-stop hook
 *
 * Run with: node tests/test-exit-criteria.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the hook module by reading and evaluating the relevant functions
// (In production, these would be exported from the module)
const hookCode = fs.readFileSync(
  path.join(__dirname, '..', 'hooks', 'debug-loop-stop.js'),
  'utf-8'
);

// Extract functions by creating a temporary module
// Remove shebang and main function, keep only the helper functions
let cleanedCode = hookCode;
// Remove shebang line
if (cleanedCode.startsWith('#!')) {
  cleanedCode = cleanedCode.replace(/^#!.*[\r\n]+/, '');
}
// Remove everything from "// --- Main ---" onwards
cleanedCode = cleanedCode.replace(/\/\/ --- Main ---[\s\S]*$/, '');

const tempModule = `
${cleanedCode}

module.exports = {
  parseYamlValue,
  parseYamlBlock,
  parseLivingDoc,
  validateExitCriteria,
  hasNonEmptySection,
  validateDebugFindings,
  validateReproductionTest,
  validateImplementation,
  validateArtifactExists
};
`;

const tempFile = path.join(os.tmpdir(), 'debug-loop-test-module.js');
fs.writeFileSync(tempFile, tempModule);
const {
  parseYamlValue,
  parseYamlBlock,
  parseLivingDoc,
  validateExitCriteria,
  hasNonEmptySection
} = require(tempFile);

// Test helpers
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${msg}\n        Expected: ${expectedStr}\n        Got: ${actualStr}`);
  }
}

// Create temp directory for test files
const testDir = path.join(os.tmpdir(), 'debug-loop-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });
fs.mkdirSync(path.join(testDir, '.claude'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'docs', 'plans'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'tests'), { recursive: true });

// --- Tests ---

console.log('\n--- YAML Parser Tests ---\n');

test('parseYamlValue handles null', () => {
  assertEqual(parseYamlValue('null'), null);
  assertEqual(parseYamlValue('~'), null);
  assertEqual(parseYamlValue(''), null);
});

test('parseYamlValue handles booleans', () => {
  assertEqual(parseYamlValue('true'), true);
  assertEqual(parseYamlValue('false'), false);
});

test('parseYamlValue handles numbers', () => {
  assertEqual(parseYamlValue('42'), 42);
  assertEqual(parseYamlValue('-5'), -5);
  assertEqual(parseYamlValue('3.14'), 3.14);
});

test('parseYamlValue handles quoted strings', () => {
  assertEqual(parseYamlValue('"hello world"'), 'hello world');
  assertEqual(parseYamlValue("'single quotes'"), 'single quotes');
});

test('parseYamlValue handles inline arrays', () => {
  assertEqual(parseYamlValue('[]'), []);
  assertEqual(parseYamlValue('[a, b, c]'), ['a', 'b', 'c']);
  assertEqual(parseYamlValue('[1, 2, 3]'), [1, 2, 3]);
});

test('parseYamlBlock handles flat structure', () => {
  const lines = [
    'name: test',
    'active: true',
    'count: 5'
  ];
  const { result } = parseYamlBlock(lines, 0, 0);
  assertEqual(result.name, 'test');
  assertEqual(result.active, true);
  assertEqual(result.count, 5);
});

test('parseYamlBlock handles nested objects', () => {
  const lines = [
    'outer:',
    '  inner: value',
    '  number: 42'
  ];
  const { result } = parseYamlBlock(lines, 0, 0);
  assertEqual(result.outer.inner, 'value');
  assertEqual(result.outer.number, 42);
});

test('parseYamlBlock handles deeply nested objects', () => {
  const lines = [
    'level1:',
    '  level2:',
    '    level3: deep'
  ];
  const { result } = parseYamlBlock(lines, 0, 0);
  assertEqual(result.level1.level2.level3, 'deep');
});

test('parseYamlBlock handles block arrays', () => {
  const lines = [
    'items:',
    '  - one',
    '  - two',
    '  - three'
  ];
  const { result } = parseYamlBlock(lines, 0, 0);
  assertEqual(result.items, ['one', 'two', 'three']);
});

test('parseYamlBlock skips comments', () => {
  const lines = [
    '# This is a comment',
    'key: value',
    '  # indented comment',
    'another: thing'
  ];
  const { result } = parseYamlBlock(lines, 0, 0);
  assertEqual(result.key, 'value');
  assertEqual(result.another, 'thing');
});

console.log('\n--- Living Doc Parser Tests ---\n');

// Create test living doc
const testLivingDocPath = path.join(testDir, '.claude', 'debug-loop-test.md');
const testLivingDocContent = `---
bug_slug: "test-bug"
active: true
phase: "systematic-debug"
phase_iteration: 1
max_phase_iterations: 5

exit_criteria:
  systematic-debug:
    description: "Find root cause"
    artifact: "docs/plans/debug.md"
  write-tests:
    description: "Create reproduction test"
    artifact: "tests/repro.test.js"

paths:
  debug_findings: "docs/plans/debug.md"
  reproduction_test: "tests/repro.test.js"

human_checkpoints:
  - after: "verify"
    reason: "Confirm fix"
---

## Current Phase
`;

fs.writeFileSync(testLivingDocPath, testLivingDocContent);

test('parseLivingDoc extracts nested exit_criteria', () => {
  const doc = parseLivingDoc(testLivingDocPath);
  assertEqual(doc.phase, 'systematic-debug');
  assertEqual(doc.exit_criteria['systematic-debug'].artifact, 'docs/plans/debug.md');
  assertEqual(doc.exit_criteria['write-tests'].artifact, 'tests/repro.test.js');
});

test('parseLivingDoc extracts paths', () => {
  const doc = parseLivingDoc(testLivingDocPath);
  assertEqual(doc.paths.debug_findings, 'docs/plans/debug.md');
  assertEqual(doc.paths.reproduction_test, 'tests/repro.test.js');
});

console.log('\n--- Exit Criteria Validation Tests ---\n');

test('validateExitCriteria fails when artifact missing', () => {
  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, false);
  assertEqual(result.reason.includes('Debug findings not found'), true, 'Should mention missing artifact');
});

test('validateExitCriteria fails when Root Cause section empty', () => {
  // Create artifact without Root Cause
  fs.writeFileSync(path.join(testDir, 'docs/plans/debug.md'), '# Debug\n\nSome content');
  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, false);
  assertEqual(result.reason.includes('Root Cause'), true, 'Should mention missing Root Cause');
});

test('validateExitCriteria passes when Root Cause section has content', () => {
  // Create artifact with Root Cause
  fs.writeFileSync(path.join(testDir, 'docs/plans/debug.md'),
    '# Debug\n\n## Root Cause\n\nThe bug is caused by X.');
  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, true);
});

test('validateExitCriteria for write-tests fails when test missing', () => {
  // Update living doc to write-tests phase
  const writeTestsDoc = testLivingDocContent.replace('phase: "systematic-debug"', 'phase: "write-tests"');
  fs.writeFileSync(testLivingDocPath, writeTestsDoc);

  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, false);
  assertEqual(result.reason.includes('not found'), true);
});

test('validateExitCriteria for write-tests passes when test exists with content', () => {
  // Create test file with content
  fs.writeFileSync(path.join(testDir, 'tests/repro.test.js'),
    'describe("Bug reproduction", () => { it("should fail before fix", () => { expect(true).toBe(false); }); });');

  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, true);
});

test('validateExitCriteria for code-review passes without artifact', () => {
  const codeReviewDoc = testLivingDocContent.replace('phase: "systematic-debug"', 'phase: "code-review"');
  fs.writeFileSync(testLivingDocPath, codeReviewDoc);

  const doc = parseLivingDoc(testLivingDocPath);
  const result = validateExitCriteria(doc, testDir);
  assertEqual(result.passed, true);
});

test('hasNonEmptySection rejects placeholder content', () => {
  const testFile = path.join(testDir, 'test-section.md');

  fs.writeFileSync(testFile, '## Root Cause\n\nTBD');
  assertEqual(hasNonEmptySection(testFile, 'Root Cause'), false);

  fs.writeFileSync(testFile, '## Root Cause\n\nTODO');
  assertEqual(hasNonEmptySection(testFile, 'Root Cause'), false);

  fs.writeFileSync(testFile, '## Root Cause\n\n...');
  assertEqual(hasNonEmptySection(testFile, 'Root Cause'), false);

  fs.writeFileSync(testFile, '## Root Cause\n\nActual content here');
  assertEqual(hasNonEmptySection(testFile, 'Root Cause'), true);
});

// Cleanup
fs.rmSync(testDir, { recursive: true, force: true });
fs.rmSync(tempFile, { force: true });

// Summary
console.log('\n--- Summary ---\n');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('');

process.exit(testsFailed > 0 ? 1 : 0);
