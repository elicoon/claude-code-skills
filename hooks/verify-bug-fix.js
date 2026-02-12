#!/usr/bin/env node
/**
 * Hook: verify-bug-fix
 *
 * Blocks marking bugs as "Fixed" until automated Playwright verification passes.
 *
 * Workflow:
 * 1. Bug is filed → Claude creates a failing test
 * 2. User reviews test to confirm it tests the right thing
 * 3. Test is committed to git
 * 4. Claude fixes the bug
 * 5. Claude tries to mark Fixed → this hook runs the committed test
 * 6. If test passes, edit is allowed
 *
 * The test must be committed (in git) to prevent Claude from creating
 * a trivial test that passes regardless of the fix.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    const filePath = data.tool_input?.file_path || '';
    const newString = data.tool_input?.new_string || '';

    // Match both /bugs/ directories and backlog/tasks/bug-*.md files (debug-loop convention)
    const isBugFile = filePath.includes('/bugs/') || filePath.includes('\\bugs\\') ||
                      /[/\\]backlog[/\\]tasks[/\\]bug-/.test(filePath);
    const isMarkingFixed = /Status:\s*Fixed/i.test(newString) ||
                           /\*\*Status:\*\*\s*Fixed/i.test(newString);

    if (isBugFile && isMarkingFixed) {
      const bugName = path.basename(filePath, '.md');

      // Find project root
      let projectRoot = path.dirname(filePath);
      while (projectRoot !== path.dirname(projectRoot)) {
        if (fs.existsSync(path.join(projectRoot, 'package.json'))) break;
        projectRoot = path.dirname(projectRoot);
      }

      // Look for test file
      // Strip "bug-" prefix for test file lookup (bug-foo-bar.md → foo-bar.spec.ts)
      const testSlug = bugName.startsWith('bug-') ? bugName.slice(4) : bugName;
      const testPaths = [
        path.join(projectRoot, 'tests', 'bugs', `${bugName}.spec.ts`),
        path.join(projectRoot, 'tests', 'bugs', `${bugName}.spec.js`),
        path.join(projectRoot, 'tests', 'bugs', `${testSlug}.spec.ts`),
        path.join(projectRoot, 'tests', 'bugs', `${testSlug}.spec.js`),
        path.join(projectRoot, 'e2e', 'bugs', `${bugName}.spec.ts`),
        path.join(projectRoot, 'e2e', 'bugs', `${testSlug}.spec.ts`),
        path.join(projectRoot, 'apps', 'browser', 'tests', 'bugs', `${bugName}.spec.ts`),
        path.join(projectRoot, 'apps', 'browser', 'tests', 'bugs', `${testSlug}.spec.ts`),
      ];

      let testFile = null;
      for (const tp of testPaths) {
        if (fs.existsSync(tp)) {
          testFile = tp;
          break;
        }
      }

      if (!testFile) {
        console.log('BLOCKED: No verification test found for this bug.');
        console.log('');
        console.log('Workflow to mark a bug as Fixed:');
        console.log('1. Create a test file at one of these paths:');
        testPaths.forEach(tp => console.log(`   - ${tp}`));
        console.log('2. Ask user to review the test');
        console.log('3. Commit the test to git');
        console.log('4. Fix the bug');
        console.log('5. Try marking Fixed again - this hook will run the test');
        process.exit(1);
      }

      // Check if test is committed to git (not just created this session)
      try {
        execSync(`git ls-files --error-unmatch "${testFile}"`, {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch {
        console.log('BLOCKED: Test file exists but is not committed to git.');
        console.log('');
        console.log(`Test file: ${testFile}`);
        console.log('');
        console.log('The test must be committed before you can mark the bug as Fixed.');
        console.log('This ensures the user has reviewed and approved the test.');
        console.log('');
        console.log('1. Ask user to review the test');
        console.log('2. Commit: git add ' + testFile + ' && git commit -m "test: add verification test for ' + bugName + '"');
        console.log('3. Then try marking Fixed again');
        process.exit(1);
      }

      // Run the test
      console.log(`Running verification test: ${testFile}`);
      console.log('');

      try {
        const output = execSync(`npx playwright test "${testFile}" --reporter=list`, {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: 120000,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        console.log(output);
        console.log('');
        console.log('✓ Verification test passed. Allowing edit.');
        process.exit(0);

      } catch (testError) {
        console.log('BLOCKED: Verification test failed.');
        console.log('');
        if (testError.stdout) console.log(testError.stdout);
        if (testError.stderr) console.log(testError.stderr);
        console.log('');
        console.log('The bug is not fixed. Fix the issue and try again.');
        process.exit(1);
      }
    }

    // Not a bug fix edit - allow
    process.exit(0);

  } catch (e) {
    console.error('Hook error:', e.message);
    process.exit(0);
  }
});
