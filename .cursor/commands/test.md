---
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.
---

Read and follow `.cursor/skills/test-driven-development/SKILL.md`.

Proof stays with this command. Ponytail may refuse only harness bloat: a new test dependency or a homemade framework when a small assert would do. It must not delete, skip, or weaken an assertion `/build` or `/test` added.

For new features:
1. Write tests that describe the expected behavior (they should FAIL)
2. Implement the code to make them pass
3. Refactor while keeping tests green

For bug fixes (Prove-It pattern):
1. Write a test that reproduces the bug (must FAIL)
2. Confirm the test fails
3. Implement the fix
4. Confirm the test passes
5. Run the full test suite for regressions

For browser-related issues, also follow `.cursor/skills/browser-testing-with-devtools/SKILL.md` to verify with the browser tools.
