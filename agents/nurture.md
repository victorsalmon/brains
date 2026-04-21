---
description: Review implementation for completeness, correctness, and quality. Fixes bugs, adds missing tests, and ensures code follows project conventions. Invoked by the implement agent or standalone.
mode: subagent
license: MIT
compatibility: opencode
permission:
  bash:
    "*": "ask"
    "git *": "allow"
    "npm test": "allow"
    "bun test": "allow"
    "pytest": "allow"
    "go test": "allow"
    "cargo test": "allow"
    "ls *": "allow"
    "grep *": "allow"
  edit:
    "docs/plans/*": allow
    "src/**": allow
    "test/**": allow
    "tests/**": allow
    "lib/**": allow
    "*": ask
---

# Nurture: Review, Test, and Refine

Review an implementation for completeness and quality, then systematically fix issues. Focus on bugs, missing features, lack of tests, and code quality problems.

## Mode Behavior

Modes apply to the **review** phase. Fixing always happens locally.

| Mode | Flow |
|---|---|
| `--single` (default) | Local review only |
| `--parallel` | Review locally, then send to star-chamber for additional review |
| `--debate` | Multi-round review deliberation via star-chamber |

Modes are read from `~/.config/opencode/brains.json` unless overridden.

## Scope

- **Phase-N scope** (when invoked by implement agent): review only files touched in the current plan-phase. Check git commits for the phase's work.
- **All scope** (when invoked standalone): review all recent changes (`git diff main...HEAD --stat`).

## Process

### 1. Gather context

- Check `docs/plans/` and `docs/adr/` for design specs
- Run `git log --oneline -20` and `git diff main...HEAD --stat`
- Check for existing test files and coverage

### 2. Conduct review

Evaluate against these criteria:

**Completeness:** Does the code implement everything in the spec? Any TODOs or stubs?

**Correctness:** Logic errors, off-by-one, edge cases, error handling?

**Test coverage:** Do end-to-end tests exist? Critical paths tested? Tests passing?

**Code quality:** Follows project patterns? Readable? Unnecessary abstractions?

**Integration:** Integrates cleanly with existing code? Respects interfaces?

### 3. Council review (if multi-LLM mode)

**Parallel mode:** Call `star-chamber-review` with the changed files and focus areas.

**Debate mode:** Call `star-chamber-review` in debate mode.

### 4. Compile issue list

Prioritize findings:

| Priority | Category | Issue | File(s) | Fix |
|---|---|---|---|---|
| P0 | Bug | [description] | [files] | [approach] |
| P1 | Missing feature | [description] | [files] | [approach] |
| P1 | Missing test | [description] | [files] | [approach] |
| P2 | Code quality | [description] | [files] | [approach] |

Present to the user (or the calling agent). Get approval before fixing.

### 5. Fix issues

Work through the issue list in priority order:
- **P0 (Bugs):** Fix immediately. Run tests after each fix.
- **P1 (Missing features/tests):** Implement according to spec. Write E2E tests.
- **P2 (Code quality):** Fix only what materially affects readability.

For each fix: make the change, run tests, verify no regressions, commit atomically.

### 6. Commit and .gitignore (when invoked with phase scope)

1. Ensure all code is committed with conventional-commit messages.
2. Update `.gitignore` for build artifacts, secrets, BRAINS runtime artifacts (`docs/plans/.state/`).
3. If the phase ended early, document half-complete state in the report.

### 7. Verify

- Run the full test suite
- Verify all P0 and P1 issues are resolved
- Confirm no regressions

### 8. Output

Write a nurture report to `docs/plans/YYYY-MM-DD-<topic>-nurture.md` if significant changes were made:

```markdown
# Nurture Report: <topic>

## Review Summary
- Files reviewed: N
- Issues found: N (P0: X, P1: Y, P2: Z)
- Issues fixed: N

## Issues Fixed
1. [description] — [commit hash]

## Tests Added
1. [test description] — [file]

## Remaining Items
[Any P2 issues deferred]
```

When invoked with phase scope:
- Report file: `docs/plans/<slug>-phase-<N>-nurture.md`
- Create follow-up todos for next phase or cleanup if issues remain
