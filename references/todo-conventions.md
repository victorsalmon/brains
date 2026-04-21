# Todo Conventions

Shared protocol for how BRAINS agents interact with OpenCode's built-in todo tool. Referenced by `map.md`, `implement.md`, and all teammate-side agents.

## Task Title Format

All BRAINS-managed tasks use a title prefix encoding phase and topic:

```
[brains:<slug>] [phase-N] <task title>
```

The prefix encodes all BRAINS state. OpenCode's todo tool does not have a labels system, so this prefix serves as the label namespace.

## Topic Slugs

Topic slug is derived from the user's original prompt (kebab-case, lowercase). Example: *"add a health-check endpoint"* → `health-check-endpoint`.

The slug is used for:
- Task title prefixes: `[brains:<slug>]`
- Output file names: `docs/plans/YYYY-MM-DD-<slug>-map.md`, `docs/plans/<slug>-wrap-up.md`
- Optional branch creation: `brains/<slug>`

## Label Equivalents (OpenCode Todo → Original Beads)

Since OpenCode's todo tool lacks labels, all BRAINS label concepts are encoded as title prefixes:

| Original Beads Label | Todo Equivalent |
|---|---|
| `brains:topic:<slug>` | `[brains:<slug>]` in title |
| `brains:phase-1`, `brains:phase-N` | `[phase-N]` in title |
| `brains:ready-for-grooming` | Implicit — newly created tasks await grooming |
| `brains:groomed` | Implicit — task is groomed once description/notes are filled |
| `brains:needs-human` | `[needs-human]` in title; add `needs-human-kind` metadata via task description |
| `brains:cleanup` | `[cleanup]` in title; handled by final cleanup teammate |
| `brains:superseded` | Implicit — superseded tasks remain in todo history when re-architected |

## Task Lifecycle

```
created by map agent:   [brains:<slug>] [phase-N] <task title>
                         ^ topic prefix   ^ phase   ^ description (initially stub)
after grooming:          [brains:<slug>] [phase-N] <task title>
                          (description/acceptance criteria filled in by teammate)
after execution:         status=completed  (title preserved for audit)
needs-human:              [brains:<slug>] [phase-N] [needs-human] <task title>
                          (description prepended with NEEDS HUMAN (<kind>): ...)
```

## Task Creation (Phase 2)

For each plan-item in each plan-phase, create a todo:

```
[brains:<slug>] [phase-N] <task title>
```

For each plan-phase:
- Implementation tasks for each plan-item
- "Nurture: phase N" umbrella task — blocked by all implementation tasks in phase N
- "Secure: phase N" umbrella task — blocked by the Nurture task

For the final plan-phase:
- "Cleanup: <slug>" task — blocked by all Secure tasks in the plan

Umbrella tasks use the same `[brains:<slug>]` prefix and `[phase-N]` encoding.

## Task Queries (Teammate-side)

OpenCode's todo tool supports filtering. Query patterns:

```
# Get all tasks for this plan
todo list --filter "[brains:<slug>]"

# Get tasks for a specific phase
todo list --filter "[phase-N]"

# Get open tasks for this phase (implementation)
todo list --filter "[brains:<slug>] [phase-N]" --status open

# Get needs-human tasks
todo list --filter "[needs-human]" --status open
```

## Umbrella Task Pattern

Phase-level nurture and secure are tracked as umbrella tasks:

```
[brains:<slug>] [phase-N] Nurture: phase N
  — blocked by all implementation tasks in phase N
[brains:<slug>] [phase-N] Secure: phase N
  — blocked by Nurture task
[brains:<slug>] [cleanup] Cleanup: <slug>
  — blocked by all Secure tasks in all phases
```

When the implement agent spawns a teammate for phase N, the teammate:
1. Grooms implementation tasks (fills description, acceptance criteria)
2. Closes grooming by noting the task is ready (no label change — description is the signal)
3. Implements and closes each task
4. Closes the Nurture umbrella task when nurture review is complete
5. Closes the Secure umbrella task when security review is complete

## Needs-Human Handling

When a task cannot be completed, the teammate prepends `NEEDS HUMAN (<kind>):` to the task description and continues with non-blocked work:

- **Failure:** "Task X failed twice. Here's what was tried: <summary>. Options: (a) provide guidance, (b) rewrite acceptance criteria, (c) skip task."
- **Impossible:** "Task X appears impossible as specified. Options: (a) provide missing context, (b) adjust criteria, (c) skip, (d) escalate to re-architecture."
- **Re-architecture:** "Task X reveals an architecture problem: <summary>. Options: (a) suggest workaround, (b) restart from phase 1."

The implement agent presents these to the user. After user response, the teammate retries with guidance.

## Re-Architecture Cleanup

When phase 3 escalates a `needs-human-kind=re-architecture`, phase 2 should be re-run. Before creating new tasks for the re-architecture:

1. Find all todos matching `[brains:<slug>]` created before the new ADR date
2. Close them with a comment noting they are superseded
3. Proceed with new task creation

## Grooming

Grooming is the act of expanding a stub task into a full task with:
- Detailed description (what exactly to implement)
- Acceptance criteria (how to know it's done)
- Implementation notes (approach, dependencies, pitfalls)

There is no formal "mark groomed" step — when the teammate fills in the description/notes, the task is considered groomed and ready for execution.