---
name: brains
description: This skill should be used when the user asks to "run the full pipeline", "do the full brains", "brains workflow", "start to finish", "build this from scratch", "full development workflow", "plan and implement everything", or invokes "/brains:brains". Orchestrates all six BRAINS phases in succession — Brainstorm, Research, Architect, Implement, Nurture, Secure. Each phase builds on the previous phase's output.
user-invocable: true
argument-hint: "[--single|--parallel|--debate] [--rounds N] [topic]"
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Agent, WebFetch, WebSearch, TaskCreate, TaskUpdate
---

# BRAINS: Full Pipeline Orchestrator

Run all six phases in succession: **B**rainstorm → **R**esearch → **A**rchitect → **I**mplement → **N**urture → **S**ecure. Each phase builds on the outputs of prior phases, with user gates between each.

Set the plugin base path:
```bash
BRAINS_PATH="<base directory from header>/../.."
```

## Mode Behavior

The mode flag applies as the default for all phases. Individual phases can be overridden at transition points if the user requests.

| Flag | Effect |
|------|--------|
| `--single` | All phases run in single LLM mode |
| `--parallel` | All phases use parallel mode (storm default) |
| `--debate` | All phases use debate mode |
| (no flag) | Each phase uses its own default mode |

## Pipeline Flow

```
Storm (brainstorm)
  ↓ user gate
Research
  ↓ user gate
Architect
  ↓ user gate
Implement → [launches separate session]
  ↓ (in implementation plan)
Nurture
  ↓ (in implementation plan)
Secure
```

**Phases 1-4** (Storm through Implement) run in the current session with user gates between each.

**Phases 5-6** (Nurture and Secure) are embedded as the final tasks in the implementation plan and run in the implementation session. This is by design — nurture and secure need to operate on the actual code with a fresh context window.

## Process

### 1. Initialize

Create tasks to track the pipeline:

```
- [ ] Storm: brainstorm and design
- [ ] Research: investigate and validate
- [ ] Architect: design architecture and record decisions
- [ ] Implement: plan, create tasks, and launch session
- [ ] (Nurture and Secure run as part of implementation)
```

Parse the topic from arguments. If no topic is provided, ask the user.

### 2. Storm Phase

Invoke the storm skill workflow. Follow the full process documented in `$BRAINS_PATH/skills/storm/SKILL.md`:

- Apply the pipeline's mode flag (or storm's default: `--parallel`)
- Complete all storm checklist items
- Write spec to `docs/plans/`
- Get user approval

**User gate:** After storm completes, ask:
> "Storm phase complete. Spec at `<path>`. Ready to move to research, or want to revise?"

### 3. Research Phase

Invoke the research skill workflow. Follow `$BRAINS_PATH/skills/research/SKILL.md`:

- Use the storm spec to derive research questions
- Apply the pipeline's mode flag (or research's default: `--single`)
- Complete investigation and write report
- Get user approval

**User gate:** After research completes, ask:
> "Research complete. Report at `<path>`. Ready for architecture, or need more investigation?"

### 4. Architect Phase

Invoke the architect skill workflow. Follow `$BRAINS_PATH/skills/architect/SKILL.md`:

- Use storm spec and research report as inputs
- Apply the pipeline's mode flag (or architect's default: `--single`)
- Create ADRs and architecture design
- Get user approval

**User gate:** After architect completes, ask:
> "Architecture complete. Design at `<path>`, ADRs in `docs/adr/`. Ready to implement?"

### 5. Implement Phase

Invoke the implement skill workflow. Follow `$BRAINS_PATH/skills/implement/SKILL.md`:

- Use all prior phase outputs as inputs
- Apply the pipeline's mode flag for plan review (or implement's default: `--single`)
- Create the implementation plan with **Nurture and Secure as final tasks**
- Create beads tasks (or TaskCreate/TaskUpdate tasks)
- Launch the implementation session in tmux

The implementation plan's final tasks should read:

```markdown
### Phase N-1: Nurture
- [ ] Run /brains:nurture [--mode] — review implementation, fix bugs, add missing tests

### Phase N: Secure
- [ ] Run /brains:secure [--mode] — security review and hardening
```

Where `[--mode]` matches the pipeline's mode flag if one was specified.

### 6. Handoff

After the implementation session is launched:

> "BRAINS pipeline phases 1-4 complete. Implementation session launched.
>
> The implementation plan includes nurture (phase 5) and secure (phase 6) as final tasks.
> They will run automatically after implementation completes.
>
> Phase outputs in `docs/plans/`:
> - `<storm-spec>`
> - `<research-report>`
> - `<architecture-design>`
> - `<implementation-plan>`
>
> ADRs in `docs/adr/`:
> - `<adr-list>`
>
> This session is available for questions or oversight."

## Skipping Phases

If the user wants to skip a phase:

- **Skip storm**: Start from research or architect. Acceptable if the design is already clear.
- **Skip research**: Acceptable for well-understood domains. Flag the risk.
- **Skip individual phases**: Adjust the pipeline. Always warn about what's being skipped.
- **Never skip nurture or secure**: These are embedded in the implementation plan and should always run.

## Resuming

If the pipeline is interrupted (e.g., session ends mid-pipeline), resume from the last completed phase:

- Check `docs/plans/` for existing phase outputs
- Identify which phase completed last (by filename suffix: `-storm.md`, `-research.md`, `-architect.md`, `-implement.md`)
- Resume from the next phase

Tell the user what was found and confirm where to resume.

## Additional Resources

- **`$BRAINS_PATH/references/multi-llm-protocol.md`** — shared multi-LLM invocation protocol
- **`$BRAINS_PATH/skills/storm/SKILL.md`** — storm phase details
- **`$BRAINS_PATH/skills/research/SKILL.md`** — research phase details
- **`$BRAINS_PATH/skills/architect/SKILL.md`** — architect phase details
- **`$BRAINS_PATH/skills/implement/SKILL.md`** — implement phase details
- **`$BRAINS_PATH/skills/nurture/SKILL.md`** — nurture phase details
- **`$BRAINS_PATH/skills/secure/SKILL.md`** — secure phase details
