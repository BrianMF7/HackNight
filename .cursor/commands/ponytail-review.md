---
description: Scan the current diff for over-engineered code that can be deleted without changing behavior
---

Read `.cursor/skills/ponytail-review/SKILL.md` for how to inspect the diff and connected code.

This pass reports deletions only. It is not the quality gate — `/review` is.

- Name code that can be deleted without changing behavior and without dropping a check `/review` marked keep.
- Defer bug, security, missing-test, and performance findings to `/review`. Do not fix them from this pass.
- Do not edit code. List findings, change no files.

Review what the user names: uncommitted or staged changes, a branch, a PR link, or files. Nothing named: the uncommitted changes, or the last commit if there are none.
