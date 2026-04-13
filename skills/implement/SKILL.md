---
name: implement
description: This skill should be used when the user asks to "implement", "build it", "start coding", "execute the plan", "create the implementation", or invokes "/brains:implement". Creates an implementation plan, optionally reviews it with multi-LLM council, then executes in a separate Claude Code instance via tmux. Supports --single (default), --parallel, and --debate modes for plan review.
user-invocable: true
argument-hint: "[--single|--parallel|--debate] [scope]"
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Agent, TaskCreate, TaskUpdate
---

# Implement: Plan and Execute

Create a detailed implementation plan from architectural designs, then hand off execution to a fresh Claude Code instance in a tmux session. The current session stays clean for oversight.

Set the plugin base path:
```bash
BRAINS_PATH="<base directory from header>/../.."
```

## Mode Behavior

Modes apply to the **plan review** phase, not the implementation itself:

| Mode | Flow |
|------|------|
| `--single` | Create plan locally, no council review. **(default)** |
| `--parallel` | Create plan locally, then send to council for review. |
| `--debate` | Debate the plan across LLMs before finalizing. |

For `--parallel` and `--debate`, read and follow `$BRAINS_PATH/references/multi-llm-protocol.md`.

## Process

### 1. Gather Inputs

Check for prior BRAINS phase outputs in `docs/plans/`:
- Storm specs (`*-storm.md`)
- Research reports (`*-research.md`)
- Architecture designs (`*-architect.md`)
- ADRs in `docs/adr/`

If no prior outputs exist, gather requirements directly from the user.

### 2. Create Implementation Plan

Break the architecture into ordered, atomic implementation tasks. Each task should:

- Have a clear deliverable (a file, a function, a test, a config change)
- Be small enough to complete in one focused session
- List its dependencies (which tasks must complete first)
- Include acceptance criteria

Structure the plan as:

```markdown
# Implementation Plan: [Topic]

## Task Sequence

### Phase 1: Foundation
- [ ] Task 1.1: [description] — [file(s)] — [acceptance criteria]
- [ ] Task 1.2: ...

### Phase 2: Core Logic
- [ ] Task 2.1: ...

### Phase 3: Integration
- [ ] Task 3.1: ...

### Phase 4: Nurture
- [ ] Run /brains:nurture — review, test, fix issues

### Phase 5: Secure
- [ ] Run /brains:secure — security review and hardening
```

**Critical:** Always append Nurture and Secure as the final phases of the implementation plan. These are not optional — they are the tail end of the BRAINS pipeline.

### 3. Council Review (if multi-LLM mode)

**Parallel mode:** Send the plan to the council:
```
Review this implementation plan for [project].

[Architecture summary]
[Implementation plan]

Evaluate:
1. Is the task ordering correct? Are dependencies properly sequenced?
2. Are tasks appropriately sized — small enough to be atomic, large enough to be meaningful?
3. Are there missing tasks or gaps in coverage?
4. Are the acceptance criteria testable?
5. Is the Nurture/Secure phase adequately scoped?
```

**Debate mode:** Debate the plan structure, task ordering, and completeness across providers.

Integrate feedback and finalize the plan with user approval.

### 4. Write Plan

Save the finalized plan to `docs/plans/YYYY-MM-DD-<topic>-implement.md`. Commit to git.

### 5. Create Tasks

**Check for beads plugin:**
```bash
ls ~/.claude/plugins/*/skills/beads 2>/dev/null && echo "beads:available" || ls ~/.claude/plugins/cache/*/skills/beads 2>/dev/null && echo "beads:available" || echo "beads:unavailable"
```

**If beads is available:** Create beads tasks from the implementation plan. Each plan task becomes a bead with its description, dependencies, and acceptance criteria.

**If beads is unavailable:** Create tasks using TaskCreate/TaskUpdate. Each plan task becomes a tracked task with appropriate dependencies.

### 6. Launch Implementation Session

Detect the tmux environment and hand off implementation to a separate Claude Code instance.

**Check for tmux:**
```bash
[[ -n "$TMUX" ]] && echo "tmux:active" || echo "tmux:inactive"
```

**If in tmux — create a new pane:**

```bash
PLAN_PATH="docs/plans/YYYY-MM-DD-<topic>-implement.md"
tmux split-window -h "claude 'Read the implementation plan at $PLAN_PATH and execute it task by task. After completing all implementation tasks, run /brains:nurture followed by /brains:secure as specified in the plan.'"
```

Tell the user:
> "Implementation session launched in a new tmux pane. Switch to it with `Ctrl-b o` or `Ctrl-b ;`.
>
> This session remains available for questions or oversight. The implementation pane has a fresh context with the plan loaded."

**If not in tmux — provide instructions:**

Tell the user:
> "Implementation is ready to begin. To start in a clean session:
>
> 1. Open a new terminal (or start tmux with `tmux`)
> 2. Run:
>    ```
>    claude "Read the implementation plan at <plan-path> and execute it task by task. After completing all implementation tasks, run /brains:nurture followed by /brains:secure as specified in the plan."
>    ```
>
> Starting fresh ensures the implementation session has full context budget for the work ahead."

### 7. Monitor (Optional)

If the user stays in the current session, offer to monitor progress:
- Check task completion status periodically
- Answer questions about the plan or architecture
- Provide clarification on design decisions from prior phases

## Key Design Decisions

- **Fresh context**: The implementation runs in a separate Claude Code instance to maximize available context for the actual coding work. The planning session's context is already consumed by brainstorming, research, and architecture.
- **Beads integration**: Beads provides better task management with dependencies and cross-session tracking. TaskCreate/TaskUpdate is the fallback when beads is not installed.
- **Nurture + Secure in plan**: These phases are appended to the implementation plan rather than run separately, ensuring they execute after implementation completes even if the user doesn't manually invoke them.

## Phase Transition

The implement skill's plan includes nurture and secure as final tasks. When the implementation session completes those phases, the full BRAINS pipeline is done.

If running standalone (not via `/brains:brains`):

> "Implementation plan created and session launched.
>
> The plan includes nurture and secure phases at the end. Once implementation completes,
> those phases will run automatically as part of the plan."

## Additional Resources

- **`$BRAINS_PATH/references/multi-llm-protocol.md`** — shared multi-LLM invocation protocol
