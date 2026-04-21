---
description: Phase 2: High-level plan generation from accepted ADR(s), task creation, and phasing. Use when the user asks to "map out the plan", "create the implementation plan", "outline the tasks", or when chaining from phase 1.
mode: primary
model: anthropic/claude-sonnet-4-20250514
license: MIT
compatibility: opencode
permission:
  bash:
    "*": "ask"
    "git *": "allow"
    "mkdir *": "allow"
    "ls *": "allow"
  edit: allow
---

# BRAINS Phase 2: Map High-Level Plan

Generate a stub-level task plan from accepted ADR(s), create todos with `brains:` labels, and prepare for phase 3 implementation.

## Reference Files

Read these when needed:
- `~/.config/opencode/references/brains/multi-llm-protocol.md`
- `~/.config/opencode/references/brains/multi-llm-protocol-compact.md`
- `~/.config/opencode/references/brains/todo-conventions.md` — task title format and lifecycle

## Mode Behavior

| Mode | Plan review |
|---|---|
| `--single` | Local subagent only |
| `--parallel` (default) | Star-chamber reviews task ordering, sizing, coverage, phasing |
| `--debate` | Star-chamber debates the plan across rounds |

Modes are read from `~/.config/opencode/brains.json`. User can override by stating preference.

## Autopilot

When autopilot is enabled in config:
- Skip all user prompts — no branch prompt, no plan-acceptance gate.
- Star-chamber still runs per mode; feedback is auto-integrated.
- On a base branch, auto-create `brains/<slug>`.
- Auto-chain into the implement agent after task creation.

## Process

### 1. Parse arguments and load inputs

Read the topic from the user's message. If chaining from phase 1, the topic and ADR will be in context.

Find accepted ADR(s) in `docs/adr/` matching the topic. If multiple ADRs match and the topic is ambiguous, ask the user which one(s) to use.

Read the research document at `docs/plans/<slug>-research.md` if it exists.

### 2. Derive topic slug

Convert the topic to kebab-case lowercase. Example: *"add a health-check endpoint"* → `health-check-endpoint`.

### 3. Branch offer

```bash
CURRENT_BRANCH=$(git branch --show-current)
```

Base branches (from config: main, master, develop):

- If on a base branch and autopilot: auto-create `brains/<slug>` without prompting.
- If on a base branch and not autopilot: prompt *"Create topic branch `brains/<slug>`? [y/n]"*
- If already on a non-base branch: use current branch without prompting.

### 4. Codebase exploration

If the research document is fresh (within 1 hour, no new commits): reuse phase 1's exploration.
Otherwise: spawn a subagent (Task tool → @general) to re-explore files listed in the ADR and note any drift.

### 5. High-level plan generation

Spawn a planning subagent (Task tool → @general) with a prompt emphasizing:
- Produce stub-level tasks (no implementation specifics)
- Identify inter-task dependencies
- Group into phases if >12 tasks (each phase independently testable)
- Include acceptance criteria per task

Output path: `docs/plans/YYYY-MM-DD-<slug>-map.md`. This file is overwritten on every phase-2 run.

### 6. Plan review

**Single mode:** Skip review. Accept the subagent's output.

**Parallel mode (default):** Call `star-chamber-ask` with the plan for review. Reviewers focus on task ordering, sizing, coverage, phasing. Integrate feedback.

**Debate mode:** Call `star-chamber-ask` in debate mode. Integrate converged feedback.

**Autopilot:** Auto-integrate star-chamber feedback without user confirmation.

### 7. User gate

Present the plan. Options:

- **Reject:** revise in place, re-present.
- **Accept:** proceed to task creation, then chain to implement.
- **Accept and skip teammate spawn** (conditional) — available ONLY when: <10 total tasks, all in a single phase, no risk:high tasks. Implement inline without spawning subagents; run @nurture and @secure at the end.

**Autopilot:** Skip the gate. Proceed directly to task creation and auto-chain to implement.

### 8. Task creation

Create todos using the built-in todo tool. For each task:

```
Task title format: [brains:<slug>] [phase-N] <task title>
```

For each plan-phase:
- Create implementation tasks
- Create "Nurture: phase N" umbrella task (blocked by implementation tasks)
- Create "Secure: phase N" umbrella task (blocked by nurture task)

For the final plan-phase:
- Create "Cleanup: <slug>" task (blocked by all secure tasks)

### 9. Write plan header

Update the map document to include:

```markdown
# Plan: <topic>

**Slug:** <slug>
**ADRs:** <list of paths>
**Research:** <research doc path>
**Mode:** <single | parallel | debate>
**Autopilot:** <true | false>
**Lean:** <true | false>
**Branch:** <branch name>
```

### 10. Phase transition

After tasks are created:

- **Interactive:** "Phase 2 complete. Plan at `<map path>`. <N> tasks created across <K> phase(s). Switch to the **implement** agent (Tab key) to begin implementation."
- **Autopilot:** "Phase 2 complete. Running phase 3 (implement) as a subagent..." — Use Task tool to invoke @implement.
