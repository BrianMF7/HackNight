---
description: Run the pre-launch checklist via parallel fan-out to specialist personas, then synthesize a go/no-go decision
---

Read and follow `.cursor/skills/shipping-and-launch/SKILL.md`.

Ponytail may refuse a new service, platform, or document SPEC.md did not ask for. It must not cut rollback, the deploy command, secrets handling, or the check that the demo runs.

`/ship` is a fan-out orchestrator. It runs three specialist personas in parallel against the current change, then merges their reports into a single go/no-go decision with a rollback plan.

## Phase A — Parallel fan-out

Spawn three subagents concurrently with the Task tool. Issue all three calls in a single assistant turn so they execute in parallel.

1. **code-reviewer** — Follow `.cursor/skills/code-review-and-quality/SKILL.md`. Five-axis review of staged changes or recent commits.
2. **security-auditor** — Follow `.cursor/skills/security-and-hardening/SKILL.md`. OWASP, secrets, auth/authz, dependency CVEs.
3. **test-engineer** — Follow `.cursor/skills/test-driven-development/SKILL.md`. Coverage gaps on happy path, edge cases, error paths, concurrency.

Personas do not call each other. Each returns only its report.

Skip the fan-out only if all of the following are true: the change touches 2 files or fewer, the diff is under 50 lines, and it does not touch auth, payments, data access, or config/env.

## Phase B — Merge

Once all three reports are back, synthesize:

1. **Code Quality** — Critical/Important findings plus failing tests, lint, or build output.
2. **Security** — Promote Critical/High auditor findings to launch blockers.
3. **Performance** — From the reviewer's performance axis.
4. **Accessibility** — Keyboard nav, screen reader, contrast.
5. **Infrastructure** — Env vars, migrations, monitoring, feature flags.
6. **Documentation** — README, ADRs, changelog. Add none that SPEC.md did not ask for.

## Phase C — Decision and rollback

```markdown
## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source persona: Critical finding + file:line]

### Recommended fixes (should fix before ship)
- [Source persona: Important finding + file:line]

### Acknowledged risks (shipping anyway)
- [Risk + mitigation]

### Rollback plan
- Trigger conditions:
- Rollback procedure:
- Recovery time objective:

### Specialist reports (full)
- [code-reviewer report]
- [security-auditor report]
- [test-engineer report]
```

The rollback plan is mandatory before any GO decision. If any persona returns a Critical finding, the default verdict is NO-GO unless the user explicitly accepts the risk.
