---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

Read and follow `.cursor/skills/code-review-and-quality/SKILL.md`.

This command is the quality verdict. Do not treat `/ponytail-review` as a substitute. Ponytail does not edit this review's findings.

Review the current changes (staged or recent commits) across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use `.cursor/skills/security-and-hardening/SKILL.md`)
5. **Performance** — No N+1 queries? No unbounded ops? (Use `.cursor/skills/performance-optimization/SKILL.md`)

Categorize findings as Critical, Important, or Suggestion.
Output a structured review with specific file:line references and fix recommendations.

When a finding is a keep (must stay), say so clearly so `/ponytail-review` cannot mark it for deletion.
